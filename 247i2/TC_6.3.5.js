include("Config.js");

//Test case 6.3.5 Marking Upstream IGMP Messages with Ethernet P-Bits
//NOTE: Written to the intent and not the letter of the TC. This message sequence assumes that the p-bits for IGMP would be different than the other frames.
//Note: The sequence plays a game with the IGMPTCI by only loading SVID1 so that the p-bit value is set to zero. Then it drops all frames except those with p-bit = 0
//This drastically changes the nature of the test but acheives the desired goal....I think.

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095); /// MGEM randomly chosen in range [256..4094]
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var TPID = 0x8100;
var SPbits1 = RandomInteger(0, 7);

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
testPassed("ONU Ranged");

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DwUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });

/// Send config
//create bidirectoinal GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwUni1PQ1 });
// create a Multicast GEM port GEM 2
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: MGEM, Direction: 2, PQPointerDown: DwUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });

//Create a bridge
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

//Create a p-bit mapper for the bidirectional port
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var MCIWTP1 = OMCI.Create(OMCC, "Multicast_GEM_Interworking_Termination_Point", { "GEMPortCTPConnectPointer": CTP2 });
OMCI.Set(OMCC, "Multicast_GEM_Interworking_Termination_Point", MCIWTP1, { "MulticastAddrTable": { "GEMPortID": MGEM, "SecondaryIndex": 0, "DestIPAddrStart": "224.0.0.0", "DestIPAddrEnd": "239.255.255.255" } });

//ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
    [SPbits1, IWTP1]
]));

//UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: TPID, OutputTPID: 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits1,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});


//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile", {});
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": MGEM,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": "224.0.0.0",
        "DestIPAddrEnd": "239.255.255.255",
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });


addTranslationGponToEth(GEM1);
addTranslationEthToGpon(0xffff, 0xff, MGEM);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM=" + MGEM);
logInfo("Random value: SPbits1=" + SPbits1);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");
    var verdict = true;

    var IP_S1 = IPv4Address("128.0.0.1");
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.7");
    var IP_G1 = IPv4Address("224.4.5.1");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4Address());
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept([IP_S1.ToString()]));
        IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    }

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);

    var IGMPJoinDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPLeaveDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G1));

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "IGMP Join", frame: IEEE_802_1Q.Build_Untagged_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, 0x0800, IGMPJoinDatagram) });
    upstreamFlows.push({ name: "IGMP Leave", frame: IEEE_802_1Q.Build_Untagged_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, 0x0800, IGMPLeaveDatagram) });

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.5", [
        ["<SVID1>", SVID1, 3],
        ["<SPbits1>", SPbits1 << 1, 1],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1, 0xC],
        ["<MAC_S1>", MAC_S1, 0xC],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT(), 0xC],
        ["<MAC_G1>", MAC_G1, 0xC],
        ["<IP_G1>", IP_G1],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoinDatagram>", IGMPJoinDatagram],
        ["<IGMPLeaveDatagram>", IGMPLeaveDatagram],
    ]);

    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Start all downstream multicast stream
    testPassed("Send IGMP frames");
    TrafficGenerator.EnableStreamOnPort(1, 0);
    logInfo("Sending multicast streams downstream")
    TrafficGenerator.StartTrafficOnPort(0);

    ///sending of frame IGMP join
    logInfo("");
    logInfo("Sending Join channel 1 message on U-interface");
    TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, undefined, undefined, false /* no Rx Check: manual */ );

    /// Check if the frame has been received
    var RcvdIGMPA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);
    logInfo("Correct IGMP Join frame received:" + RcvdIGMPA);
    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMPA > 0) { logInfo("IGMP frame correctly received on S/R-interface");; } else if ((RcvdIGMP > 0) && (RcvdIGMPA == 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received on S/R-interface");
    } else {
        verdict = false;
        logError("No IGMP frame received on S/R-interface");
    }

    ///sending of frame IGMP leave
    logInfo("");
    logInfo("Sending Leave channel 1 message on U-interface");
    TrafficGenerator.TestSingleUpstreamFlow(2, 2, upstreamFlows, undefined, undefined, false /* no Rx Check: manual */ );
    /// Check if the frame has been received
    var RcvdIGMPA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);
    logInfo("Correct IGMP Leave frame received:" + RcvdIGMPA);
    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMPA > 0) { logInfo("IGMP frame correctly received on S/R-interface");; } else if ((RcvdIGMP > 0) && (RcvdIGMPA == 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received on S/R-interface");
    } else {
        verdict = false;
        logError("No IGMP frame received on S/R-interface");
    }

    TrafficGenerator.StopTrafficOnPort(0);

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}

testPassed();