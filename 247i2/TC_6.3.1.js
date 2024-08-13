include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

//Test case 6.3.1 ONU passing of downstream IGMP messages
/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var TPID = 0x8100;

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
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, Direction: 2, PQPointerDown: DwUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });

//Create a bridge
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

//Create a p-bit mapper for the bidirectional port
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var MCIWTP1 = OMCI.Create(OMCC, "Multicast_GEM_Interworking_Termination_Point", { "GEMPortCTPConnectPointer": CTP2 });
OMCI.Set(OMCC, "Multicast_GEM_Interworking_Termination_Point", MCIWTP1, { "MulticastAddrTable": { "GEMPortID": GEM2, "SecondaryIndex": 0, "DestIPAddrStart": "224.0.0.0", "DestIPAddrEnd": "239.255.255.255" } });

//ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

//All frames get passed upstream 
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

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
        TreatInnerPriority: 0,
        TreatInnerVID: VID1,
        TreatInnerTPID: 6
    }
});


//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": VID1,
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


logInfo("Random values VID1=" + VID1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

if (TrafficGenerator.activateAutomatisation == 0) {
    addTranslationEthToGpon(0xffff, 0xff, GEM1);
    popup("Test1", "Run Traffic Stream 1 (to unicast GEM port), then click OK.");
    delAllTranslationRules();

    addTranslationEthToGpon(0xffff, 0xff, GEM2);
    popup("Test2", "Run Traffic Stream 2 (to multicast GEM port), then click OK.");
    delAllTranslationRules();
} else {
    var verdict = true;

    /// MAC & IP source addresses
    var IP_S1 = IPv4Address("10.60.0.189");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4Address());
    }

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var IGMDSQueryDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_SYSTEMS(), IP_S1, 0x02, IGMP.Build_GeneralQuery());
    var IGMPDSQueryFrame = IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_SYSTEMS(), MAC_S1, 0, VID1, 0x0800, IGMDSQueryDatagram);

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.1", [
        ["<VID1>", VID1, 3],
        ["<MAC_S1>", MAC_S1],
        ["<IGMP_MAC_ALL_SYSTEMS>", IGMP.MAC_ALL_SYSTEMS()],
        ["<IGMPDSQueryFrame>", IGMPDSQueryFrame]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Start all downstream multicast stream
    testPassed("Send IGMP frames");

    logInfo("");
    logInfo("Sending Global Query on unicast port");
    delAllTranslationRules();
    addTranslationEthToGpon(0xffff, 0xff, GEM1);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    ///sending of frame IGMP
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(0, IGMPDSQueryFrame, 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 0);
        TrafficGenerator.StartTrafficOnPort(0, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
    }
    /// Check if the frame has been received
    var RcvdIGMPUnicast_correct = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Unicast IGMP frame correct received:" + RcvdIGMPUnicast_correct);
    var RcvdIGMPUnicast = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    logInfo("Unicast IGMP frame received:" + RcvdIGMPUnicast);
    if (RcvdIGMPUnicast_correct > 0) { logInfo("IGMP frame correctly received on U-interface"); } else if ((RcvdIGMPUnicast_correct == 0) && (RcvdIGMPUnicast > 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received on U-interface");
    } else {
        verdict = false;
        logError("No IGMP frame received on U-interface");
    }

    logInfo("");
    logInfo("Sending Global Query on multicast port");
    delAllTranslationRules();
    addTranslationEthToGpon(0xffff, 0xff, GEM2);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    ///sending of frame IGMP
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(0, IGMPDSQueryFrame, 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 0);
        TrafficGenerator.StartTrafficOnPort(0, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
    }
    /// Check if the frame has been received
    var RcvdIGMPMulticast_correct = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Multicast IGMP frame correct received:" + RcvdIGMPMulticast_correct);
    var RcvdIGMPMulticast = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    logInfo("Multicast IGMP frame received:" + RcvdIGMPMulticast);
    if (RcvdIGMPMulticast_correct > 0) { logInfo("IGMP frame correctly received on U-interface"); } else if ((RcvdIGMPMulticast_correct == 0) && (RcvdIGMPMulticast > 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received on U-interface");
    } else {
        verdict = false;
        logError("No IGMP frame received on U-interface");
    }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}
testPassed();