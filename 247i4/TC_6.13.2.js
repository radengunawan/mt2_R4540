//Performance Monitoring on Multicast Ethernet Frames
testPassed("Performance Monitoring on Multicast Ethernet Frames");

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

var time_before_EFEPM_clear = 10000; // milliseconds
var time_after_EFEPM_clear = 1000; // milliseconds
var time_before_EFEPM_reading = 60000; // milliseconds

function clearCounters(omcc, EFEPMs) {
    var verdict = true;
    for (var i = 0; i < EFEPMs.length; i++) {
        OMCI.Set(omcc, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, {
            Control_Block: {
                Parent_ME_Class: EFEPMs[i].Parent_ME_Class,
                Parent_ME_Instance: EFEPMs[i].Parent_ME_Instance,
                Accumulation_Disable: 0x8000,
                TCA_Disable: 0,
                Control_fields: EFEPMs[i].Control_fields,
                TCI: EFEPMs[i].TCI
            }
        });
    }
    sleep(2000);
    for (var i = 0; i < EFEPMs.length; i++) {
        var resp = OMCI.Get(omcc, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["CRC_errored_Frames", "Frames", "Multicast_Frames"]);
        logInfo("    CRC errored Frames:      " + resp["CRC_errored_Frames"]);
        logInfo("    Frames:           " + resp["Frames"]);
        logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
        if ((resp["CRC_errored_Frames"] != 0) ||
            (resp["Frames"] != 0) ||
            (resp["Multicast_Frames"] != 0)) {
            logError("counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not cleared:");
            verdict = false;
            logError("Pass/Fail: counters not cleared at step 13");
        }
    }
    return verdict;
}

/// Initialize Variables
var nbOfPacketChannel1 = 10000;
var nbOfPacketChannel2 = 10000;
var nbOfPacketFlowA = 10000;
var nbOfPacketFlowB = 10000;
var nbOfPacketFlowC = 10000;
var nbOfPacketFlowD = 10000;
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomIntegerExcept(1, 4094, [SVID1]); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7);
var SPbit2 = RandomIntegerExcept(0, 7, [SPbit1]);
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();

var AllocIdNb1 = GEM1;

var IP_S1 = IPv4Address("128.0.0.32");
var IP_G1 = IPv4Address("224.0.1.0");
var IP_G2 = IPv4Address(IP_G1.ToInt() + 200);

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address(); /// is this enough in terms of range ?
    IP_G2 = IGMP.GetUnusedMcastIPv4Address();
}

var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var IP_IGMP_US_S1 = IPv4Address("10.0.0.1");
    var MAC1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
}

/// Reset the emulator
reset();
/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);
/// Create OMCC
PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(500);

testPassed("ONU activated");

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
var DwPQ2 = OMCI.GetDwPQ(OMCC, 1);

var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb1);
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdNb1, 200);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdNb1 });

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwPQ1 });
// create a Multicast GEM port GEM 2
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, Direction: 2, PQPointerDown: DwPQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });

var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var MCIWTP1 = OMCI.Create(OMCC, "Multicast_GEM_Interworking_Termination_Point", { "GEMPortCTPConnectPointer": CTP2 });
OMCI.Set(OMCC, "Multicast_GEM_Interworking_Termination_Point", MCIWTP1, { "MulticastAddrTable": { "GEMPortID": GEM2, "SecondaryIndex": 0, "DestIPAddrStart": "224.0.0.0", "DestIPAddrEnd": "239.255.255.255" } });

// ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1, SVID2], ForwardOpr: 16, NumberOfEntries: 2 });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

// UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { AssociationType: OMCI.GetTPAssociationType(OMCC), AssocMEPointer: OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x88a8, OutputTPID: 0x88a8, DownstreamMode: 0 });

//Rewrite 3 default to drop unrecognized frames
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 14,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

//Set the test specific tag rule
// SVID1 && SPbit1		 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: SPbit1,
        FilterInnerVID: SVID1,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});
// SVID2 && SPbit2
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: SPbit2,
        FilterInnerVID: SVID2,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

/// Test Procedure Step 5:
// Create the counters, using multiple Ethernet Frame Extended PM Managed Entities.
//
// The control field is coded as:
// -----------------------------
// Upstream, no filter on VID or Pbit:         1 = 0x0001
// Upstream, filter on VID, not on Pbit:   32769 = 0x8001
// Upstream, filter on Pbit, not on VID:   16385 = 0x4001
// Upstream, filter on VID and Pbit:       49153 = 0xC001
// Downstream, no filter on VID or Pbit:       3 = 0x0003
// Downstream, filter on VID, not on Pbit: 32771 = 0x8003
// Downstream, filter on Pbit, not on VID: 16387 = 0x4003
// Downstream, filter on VID and Pbit:     49155 = 0xC003

// This assumes that continuous accumulation is always enabled (LSB = 1).

var EFEPMs = [{
        id: undefined,
        title: "PPTP Ethernet UNI, all upstream traffic",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, upstream traffic on SVID1 marked with SPbit1",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC001,
        TCI: SVID1 | (SPbit1 << 13),
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, upstream traffic on SVID2 marked with SPbit2",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC001,
        TCI: SVID2 | (SPbit2 << 13),
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all downstream traffic",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit1",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC003,
        TCI: SVID1 | (SPbit1 << 13),
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, downstream traffic on SVID2 marked with SPbit2",
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC003,
        TCI: SVID2 | (SPbit2 << 13),
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "GEM 1, all upstream traffic",
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP1,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "GEM 1, all downstream traffic",
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP1,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult: undefined
    },
    {
        id: undefined,
        title: "GEM 2, all downstream traffic",
        Parent_ME_Class: 281,
        Parent_ME_Instance: MCIWTP1,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult: undefined
    },
];

testPassed("Step 8. Cause the OLT emulator to create Ethernet Frame Extended PM MEs");
for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("creating counter " + i + " for " + EFEPMs[i].title);
    EFEPMs[i].id = OMCI.Create(OMCC, "Ethernet_Frame_Extended_PM", {
        Control_Block: {
            Parent_ME_Class: EFEPMs[i].Parent_ME_Class,
            Parent_ME_Instance: EFEPMs[i].Parent_ME_Instance,
            Accumulation_Disable: 0,
            TCA_Disable: 0,
            Control_fields: EFEPMs[i].Control_fields,
            TCI: EFEPMs[i].TCI
        }
    });
}

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4001,
        "GEMPortID": GEM2,
        "VlanID": SVID2,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

testPassed("OMCI Configuration complete");

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("Step 11. Cause the OLT emulator to retrieve all ONU counters");

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting counters " + i + " (" + EFEPMs[i].title + "):");
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    if (resp == undefined)
        testFailed("No answer for counters " + i + " (" + EFEPMs[i].title + ") at step 5");
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
}

addTranslationEthToGpon(0xffff, 0xff, GEM1);
addTranslationEthToGponExt2({ macAddressDst: MAC_G1.ToArray() }, GEM2);
addTranslationEthToGponExt2({ macAddressDst: MAC_G2.ToArray() }, GEM2);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SVID2=" + SVID2);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random value: SPbit2=" + SPbit2);

logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

testPassed("Starting traffics");


//// Traffic Generator config

var verdict = true;

testPassed("Step 12. Cause the traffic generator to send an IGMP Join on Channel 1");

if (TrafficGenerator.activateAutomatisation) {
    var IGMPJoin1IPDatagram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));
    var IGMPJoin2IPDatagram = IP.Build_Frame_RouterAlert(IP_G2, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G2));


    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.13.2", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC1>", MAC1],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPJoin2_IPDATAGRAM>", IGMPJoin2IPDatagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);


    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.EnableStreamOnPort(3, 1);
        TrafficGenerator.DisableStreamOnPort(4, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
} else {
    popup("Action", "Send Join for Channel 1, then click OK.");
}

sleep(time_before_EFEPM_clear);

testPassed("Step 13. Clearing all ONU counters");
var localVerdict = clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

verdict = verdict && localVerdict;

testPassed("Step 14. Cause the Traffic Generator to send the downstream multicast flows defined in Configuration step 5");

if (TrafficGenerator.activateAutomatisation) {
    ///Sending downstream multicast
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);

    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    TrafficGenerator.StartTrafficOnPort(0);

    sleep(10000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var rxAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
    logInfo("Rx " + rxAtU + " frames at U interface");

    nbOfPacketChannel1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    nbOfPacketChannel2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    /// Get statistics for each total received stream
    var nbOfRcvdChannel1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 7);
    var nbOfRcvdChannel2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 8);

    logInfo("sent " + nbOfPacketChannel1 + " on channel 1");
    if (nbOfRcvdChannel1 != nbOfPacketChannel1) {
        logError("sent " + nbOfPacketChannel1 + " on channel 1 and received " + nbOfRcvdChannel1);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketChannel2 + " on channel 2");
    if (nbOfRcvdChannel2 != 0) {
        logError("received " + nbOfRcvdChannel2 + " packets from Channel 2 when they should be discarded");
        verdict = false;
    }
} else {
    popup("Action", "Send Downstream Multicast traffic.");
}

logInfo("################################");
logInfo("################################");
testPassed("Step 15. Cause the OLT emulator to retrieve all ONU counters.");
///Set expected counters for the EFEPMs:
for (var i = 0; i < EFEPMs.length; i++)
    EFEPMs[i].expectedResult = 0;
EFEPMs[3].expectedResult = nbOfPacketChannel1; //"PPTP Ethernet UNI, all downstream traffic"
EFEPMs[4].expectedResult = nbOfPacketChannel1; //"PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit1"
EFEPMs[8].expectedResult = nbOfPacketChannel1 + nbOfPacketChannel2; //"GEM 2, all downstream traffic"

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting PM " + (i + 1) + " for " + EFEPMs[i].title);
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if ((EFEPMs[i].expectedResult == 0) && (
            (resp["Frames"] != 0) || (resp["Multicast_Frames"] != 0))) {
        logError("on " + EFEPMs[i].title + " counters are not null");
        verdict = false;
    }
    if ((EFEPMs[i].expectedResult != 0) && (
            (resp["Frames"] != EFEPMs[i].expectedResult) || (resp["Multicast_Frames"] != EFEPMs[i].expectedResult))) { // Frames AND Multicast Frames are expected
        logError("on " + EFEPMs[i].title + " counters are not properly incremented");
        verdict = false;
    }
}

testPassed("Step 16. Cause the Traffic Generator to an IGMP Join on Channel 2");
if (TrafficGenerator.activateAutomatisation) {
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(MAC_G2, MAC_IGMP_US_S1, SPbit2, SVID2, 0x0800, IGMPJoin2IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.EnableStreamOnPort(4, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
} else {
    popup("Action", "Send Join for Channel 2, then click OK.");
}

sleep(time_before_EFEPM_clear);

testPassed("Step 17. Cause the OLT emulator clears all ONU counters.");
var localVerdict = clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

verdict = verdict && localVerdict;

testPassed("Step 18. Cause the Traffic Generator to send the downstream multicast flows defined in Configuration step 5");
if (TrafficGenerator.activateAutomatisation) {
    ///Sending downstream multicast
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);

    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    TrafficGenerator.StartTrafficOnPort(0);

    sleep(10000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var rxAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
    logInfo("Rx " + rxAtU + " frames at U interface");

    nbOfPacketChannel1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    nbOfPacketChannel2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    /// Get statistics for each total received stream
    var nbOfRcvdChannel1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 7);
    var nbOfRcvdChannel2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 8);

    logInfo("sent " + nbOfPacketChannel1 + " on channel 1");
    if (nbOfRcvdChannel1 != nbOfPacketChannel1) {
        logError("sent " + nbOfPacketChannel1 + " on channel 1 and received " + nbOfRcvdChannel1);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketChannel2 + " on channel 2");
    if (nbOfRcvdChannel2 != nbOfPacketChannel2) {
        logError("sent " + nbOfPacketChannel2 + " on channel 1 and received " + nbOfRcvdChannel2);
        verdict = false;
    }
} else {
    popup("Action", "Send Downstream Multicast traffic.");
}

logInfo("################################");
logInfo("################################");
testPassed("Step 19. Cause the OLT emulator to retrieve all ONU counters.");
///Set expected counters for the EFEPMs:
for (var i = 0; i < EFEPMs.length; i++)
    EFEPMs[i].expectedResult = 0;
EFEPMs[3].expectedResult = nbOfPacketChannel1 + nbOfPacketChannel2; //"PPTP Ethernet UNI, all downstream traffic"
EFEPMs[4].expectedResult = nbOfPacketChannel1; //"PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit1"
EFEPMs[5].expectedResult = nbOfPacketChannel2; //"PPTP Ethernet UNI, downstream traffic on SVID2 marked with SPbit2"
EFEPMs[8].expectedResult = nbOfPacketChannel1 + nbOfPacketChannel2; //"GEM 2, all downstream traffic"

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting PM " + (i + 1) + " for " + EFEPMs[i].title);
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if ((EFEPMs[i].expectedResult == 0) && (
            (resp["Frames"] != 0) || (resp["Multicast_Frames"] != 0))) {
        logError("on " + EFEPMs[i].title + " counters are not null");
        verdict = false;
    }
    if ((EFEPMs[i].expectedResult != 0) && (
            (resp["Frames"] != EFEPMs[i].expectedResult) || (resp["Multicast_Frames"] != EFEPMs[i].expectedResult))) { // Frames AND Multicast Frames are expected
        logError("on " + EFEPMs[i].title + " counters are not properly incremented");
        verdict = false;
    }
}

sleep(time_before_EFEPM_clear);

testPassed("Step 20. Cause the OLT emulator to clear all ONU counters.");

var localVerdict = clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

verdict = verdict && localVerdict;

testPassed("Step 21. Cause the Traffic Generator to send the upstream IGMP messages as defined in Test Configuration step 6")
if (TrafficGenerator.activateAutomatisation) {
    ///Sending downstream multicast
    TrafficGenerator.DisableStreamOnPort(1, 1);
    TrafficGenerator.DisableStreamOnPort(2, 1);
    TrafficGenerator.EnableStreamOnPort(3, 1);
    TrafficGenerator.EnableStreamOnPort(4, 1);

    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    TrafficGenerator.StartTrafficOnPort(1);

    sleep(10000);

    TrafficGenerator.StopTrafficOnPort(1);

    sleep(TrafficGenerator.delayAfterSend);

    var rxAtSR = TrafficGenerator.GetTotalReceiveStatsOnPort(0);
    logInfo("Rx " + rxAtSR + " frames at S/R interface");

    nbOfPacketChannel1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(1, 3);
    nbOfPacketChannel2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(1, 4);
    /// Get statistics for each total received stream
    var nbOfRcvdChannel1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 2);
    var nbOfRcvdChannel2 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 3);

    logInfo("sent " + nbOfPacketChannel1 + " on channel 1");
    if (nbOfRcvdChannel1 != nbOfPacketChannel1) {
        logError("sent " + nbOfPacketChannel1 + " on channel 1 and received " + nbOfRcvdChannel1);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketChannel2 + " on channel 2");
    if (nbOfRcvdChannel2 != nbOfPacketChannel2) {
        logError("sent " + nbOfPacketChannel2 + " on channel 1 and received " + nbOfRcvdChannel2);
        verdict = false;
    }
} else {
    popup("Action", "Send Upstream Multicast traffic as defined in Configuration Step 6");
}

logInfo("################################");
logInfo("################################");
testPassed("Step 22. Cause the OLT emulator to retrieve all ONU counters.");
///Set expected counters for the EFEPMs:
for (var i = 0; i < EFEPMs.length; i++)
    EFEPMs[i].expectedResult = 0;

EFEPMs[0].expectedResult = nbOfPacketChannel1 + nbOfPacketChannel2; //"PPTP Ethernet UNI, all upstream traffic
EFEPMs[1].expectedResult = nbOfPacketChannel1;
"PPTP Ethernet UNI, upstream traffic on SVID1 marked with SPbit1"
EFEPMs[2].expectedResult = nbOfPacketChannel2;
"PPTP Ethernet UNI, upstream traffic on SVID2 marked with SPbit2"
EFEPMs[6].expectedResult = nbOfPacketChannel1 + nbOfPacketChannel2; //GEM 1, all upstream traffic"

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting PM " + (i + 1) + " for " + EFEPMs[i].title);
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if ((EFEPMs[i].expectedResult == 0) && (
            (resp["Frames"] != 0) || (resp["Multicast_Frames"] != 0))) {
        logError("on " + EFEPMs[i].title + " counters are not null");
        verdict = false;
    }
    if ((EFEPMs[i].expectedResult != 0) && (
            (resp["Frames"] != EFEPMs[i].expectedResult) || (resp["Multicast_Frames"] != EFEPMs[i].expectedResult))) { // Frames AND Multicast Frames are expected
        logError("on " + EFEPMs[i].title + " counters are not properly incremented");
        verdict = false;
    }
}

sleep(time_before_EFEPM_clear);

testPassed("Step 23. Cause the OLT emulator to clear all ONU counters.");

var localVerdict = clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

verdict = verdict && localVerdict;

testPassed("Step 24. Cause the Traffic Generator to send each unicast flow, upstream and downstream, as defined in Test Configuration step 4");

if (TrafficGenerator.activateAutomatisation) {
    ///downstream port
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(4, 0);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    ///upstream port
    TrafficGenerator.DisableStreamOnPort(3, 1);
    TrafficGenerator.DisableStreamOnPort(4, 1);
    TrafficGenerator.EnableStreamOnPort(1, 1);
    TrafficGenerator.EnableStreamOnPort(2, 1);

    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    TrafficGenerator.StartTrafficOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(10000);

    TrafficGenerator.StopTrafficOnPort(1);
    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var rxAtSR = TrafficGenerator.GetTotalReceiveStatsOnPort(0);
    logInfo("Rx " + rxAtSR + " frames at S/R interface");
    var rxAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
    logInfo("Rx " + rxAtU + " frames at U interface");

    nbOfPacketFlowA = TrafficGenerator.GetTransmitStatsOnPortAndStream(1, 1);
    nbOfPacketFlowB = TrafficGenerator.GetTransmitStatsOnPortAndStream(1, 2);
    nbOfPacketFlowC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    nbOfPacketFlowD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    /// Get statistics for each total received stream
    var nbOfRcvdFlowA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var nbOfRcvdFlowB = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);
    var nbOfRcvdFlowC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var nbOfRcvdFlowD = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);

    logInfo("sent " + nbOfPacketFlowA + " on flow A");
    if (nbOfRcvdFlowA != nbOfPacketFlowA) {
        logError("sent " + nbOfPacketFlowA + " on flow A and received " + nbOfRcvdFlowA);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketFlowB + " on flow B");
    if (nbOfRcvdFlowB != nbOfPacketFlowB) {
        logError("sent " + nbOfPacketFlowB + " on flow B and received " + nbOfRcvdFlowB);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketFlowC + " on flow C");
    if (nbOfRcvdFlowC != nbOfPacketFlowC) {
        logError("sent " + nbOfPacketFlowC + " on flow C and received " + nbOfRcvdFlowC);
        verdict = false;
    }
    logInfo("sent " + nbOfPacketFlowD + " on flow D");
    if (nbOfRcvdFlowD != nbOfPacketFlowD) {
        logError("sent " + nbOfPacketFlowD + " on flow D and received " + nbOfRcvdFlowD);
        verdict = false;
    }
} else {
    popup("Action", "Send Unicast flows");
}

logInfo("################################");
logInfo("################################");
testPassed("Step 25. Cause the OLT emulator to retrieve all ONU counters.");
///Set expected counters for the EFEPMs:
for (var i = 0; i < EFEPMs.length; i++)
    EFEPMs[i].expectedResult = 0;

EFEPMs[0].expectedResult = nbOfPacketFlowA + nbOfPacketFlowB; //"PPTP Ethernet UNI, all upstream traffic
EFEPMs[1].expectedResult = nbOfPacketFlowA; //"PPTP Ethernet UNI, upstream traffic on SVID1 marked with SPbit1"
EFEPMs[2].expectedResult = nbOfPacketFlowB; //"PPTP Ethernet UNI, upstream traffic on SVID2 marked with SPbit2"
EFEPMs[3].expectedResult = nbOfPacketFlowC + nbOfPacketFlowD; //"PPTP Ethernet UNI, all downstream traffic",
EFEPMs[4].expectedResult = nbOfPacketFlowC; //"PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit1"
EFEPMs[5].expectedResult = nbOfPacketFlowD; //"PPTP Ethernet UNI, downstream traffic on SVID2 marked with SPbit2"
EFEPMs[6].expectedResult = nbOfPacketFlowA + nbOfPacketFlowB; //"GEM 1, all upstream traffic"
EFEPMs[7].expectedResult = nbOfPacketFlowC + nbOfPacketFlowD; //"GEM 1, all downstream traffic"

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting PM " + (i + 1) + " for " + EFEPMs[i].title);
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if ((EFEPMs[i].expectedResult == 0) && (
            (resp["Frames"] != 0) || (resp["Multicast_Frames"] != 0))) {
        logError("on " + EFEPMs[i].title + " counters are not null");
        verdict = false;
    }
    if (resp["Multicast_Frames"] != 0) {
        logError("on " + EFEPMs[i].title + " multicast counters are not null");
        verdict = false;
    }
    if ((EFEPMs[i].expectedResult != 0) && (
            (resp["Frames"] != EFEPMs[i].expectedResult))) {
        logError("on " + EFEPMs[i].title + " counters are not properly incremented");
        verdict = false;
    }
}

sleep(time_before_EFEPM_clear);

testPassed("Step 26. Cause the OLT emulator to clear all ONU counters.");

var localVerdict = clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

verdict = verdict && localVerdict;

testPassed("Step 28. Configure the OLT emulator to forward all unicast downstream traffic to the multicast GEM permanently");
delAllTranslationRules();
addTranslationEthToGpon(0xffff, 0xff, GEM2);

testPassed("Step 29. Cause the Traffic Generator to send downstream unicast flows, as defined in Test Configuration step 4");
if (TrafficGenerator.activateAutomatisation) {
    ///downstream port
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(4, 0);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);

    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    TrafficGenerator.StartTrafficOnPort(0);

    sleep(10000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var rxAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
    logInfo("Rx " + rxAtU + " frames at U interface");

    nbOfPacketFlowC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    nbOfPacketFlowD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    /// Get statistics for each total received stream
    var nbOfRcvdFlowC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var nbOfRcvdFlowD = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);

    logInfo("sent " + nbOfPacketFlowC + " on flow C");
    if (nbOfRcvdFlowC != 0) {
        logError("received " + nbOfRcvdFlowC + " on flow C");
        verdict = false;
    }
    logInfo("sent " + nbOfPacketFlowD + " on flow D");
    if (nbOfRcvdFlowD != 0) {
        logError("received " + nbOfRcvdFlowD + " on flow D");
        verdict = false;
    }
	
	TrafficGenerator.Disconnect();
} else {
    popup("Action", "Send Unicast flows");
}

testPassed("Step 30. Cause the OLT emulator to retrieve all ONU counters");
///Set expected counters for the EFEPMs:
for (var i = 0; i < EFEPMs.length; i++)
    EFEPMs[i].expectedResult = 0;

EFEPMs[8].expectedResult = nbOfPacketFlowC + nbOfPacketFlowD; //"GEM 2, all downstream traffic"

sleep(time_before_EFEPM_reading);

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting PM " + (i + 1) + " for " + EFEPMs[i].title);
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    logInfo("    Frames:           " + resp["Frames"]);
    logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if ((EFEPMs[i].expectedResult == 0) && (
            (resp["Frames"] != 0) || (resp["Multicast_Frames"] != 0))) {
        logError("on " + EFEPMs[i].title + " counters are not null");
        verdict = false;
    }
    if (resp["Multicast_Frames"] != 0) {
        logError("on " + EFEPMs[i].title + " multicast counters are not null");
        verdict = false;
    }
    if ((EFEPMs[i].expectedResult != 0) && (
            (resp["Frames"] != EFEPMs[i].expectedResult))) {
        logError("on " + EFEPMs[i].title + " counters are not properly incremented");
        verdict = false;
    }
}

if (!verdict)
    testFailed("Improper counters of forwarding error");
testPassed();