include("Config.js");

//Test case 6.3.13 IGMP Transparent Snooping (Multi-User)

/// Initialize Variables
var SVID1 = 100; /// SVID1 randomly chosen in range [1..4094]
var VID1 = SVID1;
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();  /// GEM1 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM3 randomly chosen in range [256..4094]
var AllocId1 = GEM1;

var IP_S1 = "128.0.0.1"; /// Random IP                 
var IP_S2 = "128.0.0.2"; /// Random IP                 
var IP_S3 = "128.0.0.3"; /// Random IP
var IP_S4 = "128.0.0.4"; /// Random IP                 
var IP_G1 = "224.4.5.1";
var IP_G2 = "224.4.5.2";
var IP_G3 = "224.4.5.3";
var IP_G4 = "224.4.5.4";

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
var DwUni1PQ1 = OMCI.GetDwPQ(OMCC, 0, 1);
var DwUni2PQ1 = OMCI.GetDwPQ(OMCC, 0, 2);
var DwUni1PQ2 = OMCI.GetDwPQ(OMCC, 1, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);
var OMCITP2 = OMCI.GetTerminationPoint(OMCC, 1);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);

/// Send config
//create bidirectoinal GEM ports GEM1 & GEM3
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwUni1PQ1 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM3, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwUni2PQ1 });
// create a Multicast GEM port GEM 2
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: MGEM, Direction: 2, PQPointerDown: DwUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });

//Create 2 bridges, one per subscriber
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var BSP2 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

//Create a p-bit mappers for the bidirectional ports
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var MCIWTP1 = OMCI.Create(OMCC, "Multicast_GEM_Interworking_Termination_Point", { "GEMPortCTPConnectPointer": CTP2 });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP3, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Multicast_GEM_Interworking_Termination_Point", MCIWTP1, { "MulticastAddrTable": { "GEMPortID": MGEM, "SecondaryIndex": 0, "DestIPAddrStart": "224.0.0.0", "DestIPAddrEnd": "239.255.255.255" } });

//ANI side ports for Subscriber 1
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

//ANI side ports for Subscriber 2
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 1, TPtype: 3, TPPointer: PMAP2 });
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

//All frames get passed upstream 
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

// !! modification from OISG sequence v8 IWTP1 -> IWTP2 for all pbits
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, { P0Ptr: IWTP2, P1Ptr: IWTP2, P2Ptr: IWTP2, P3Ptr: IWTP2, P4Ptr: IWTP2, P5Ptr: IWTP2, P6Ptr: IWTP2, P7Ptr: IWTP2 });

//UNI side port: Subscriber1
var BPCD5 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });
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
        TreatInnerPriority: 2,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});

//UNI side port: Subscriber2
var BPCD6 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP2 });
var EVTOCD2 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP2 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, {
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
        TreatInnerPriority: 2,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": MGEM,
        "VlanID": VID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": "224.0.0.0",
        "DestIPAddrEnd": "239.255.255.255",
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD5, "MulticastOprProfilePtr": MOP1 });
var MSCI2 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD6, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP2, { AdminState: 0 });

testPassed("MIB setup done");
logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: VID1=" + VID1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM=" + MGEM);

addTranslationEthToGpon(SVID1, 0xff, MGEM);
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM3);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");

    var Tolerance = Tol_6_3_13;
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC_DST1 = 0x01005e000016;
    var MAC_DST2 = 0x01005E040501;
    var MAC_DST3 = 0x01005E040502;
    var MAC_DST4 = 0x01005E040503;
    var MAC_DST5 = 0x01005E040504;
    var MAC_SRC1 = 0x202233445507;
    var MAC_SRC2 = 0x202233445508;
    var MAC_SRC3 = 0x102233445501;
    var MAC_SRC4 = 0x102233445502;
    var MAC_SRC5 = 0x102233445503;
    var MAC_SRC6 = 0x102233445504;

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.3.13", [
        ["<SVID1>", SVID1, 3],
        ["<MAC_DST1>", MAC_DST1, 0xC],
        ["<MAC_DST2>", MAC_DST2, 0xC],
        ["<MAC_DST3>", MAC_DST3, 0xC],
        ["<MAC_DST4>", MAC_DST4, 0xC],
        ["<MAC_DST5>", MAC_DST5, 0xC],
        ["<MAC_SRC1>", MAC_SRC1, 0xC],
        ["<MAC_SRC2>", MAC_SRC2, 0xC],
        ["<MAC_SRC3>", MAC_SRC3, 0xC],
        ["<MAC_SRC4>", MAC_SRC4, 0xC],
        ["<MAC_SRC5>", MAC_SRC5, 0xC],
        ["<MAC_SRC6>", MAC_SRC6, 0xC]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Start all downstream multicast stream
    logInfo("Starting Multicast streams");
    testPassed("Starting Multicast streams");
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);;
    TrafficGenerator.StartTrafficOnPort(0);
    /// Wait for stream establishment
    sleep(500);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    sleep(5000);

    var RcvdPort1_NoStream = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3);
    var RcvdPort2_NoStream = TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 0) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 1) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 2) + TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 3);
    logInfo("Nb of Multicast Flow packets received on Interface U1: " + RcvdPort1_NoStream + " Packets");
    logInfo("Nb of Multicast Flow packets received on Interface U2: " + RcvdPort2_NoStream + " Packets");
    if (RcvdPort1_NoStream) {
        verdict = false;
        logError("Received Multicast flow on U1 before sending IGMP frame");
    }
    if (RcvdPort2_NoStream) {
        verdict = false;
        logError("Received Multicast flow on U2 before sending IGMP frame");
    }

    logInfo("");
    logInfo("Sending IGMP Join Channel A");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Untagged_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST1), IEEE_802_1Q.MAC_To_String(MAC_SRC1), 0x0800, IP.Build_Frame_RouterAlert("224.0.0.22", "128.0.0.5", 0x02, IGMP.Build_Join(IP_S1, IP_G1))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 5);
    if (RcvdIGMP == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("IGMP frame received"); }

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    var RcvdPort1_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvdPort1_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvdPort1_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvdPort1_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvdPort1_StreamABCD = RcvdPort1_StreamA + RcvdPort1_StreamB + RcvdPort1_StreamC + RcvdPort1_StreamD;
    var RcvdPort2_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    var RcvdPort2_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    var RcvdPort2_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 3);
    var RcvdPort2_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 4);
    var RcvdPort2_StreamABCD = RcvdPort2_StreamA + RcvdPort2_StreamB + RcvdPort2_StreamC + RcvdPort2_StreamD;
    var RcvdPort1_FilterA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdPort2_FilterB = TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 0);
    var RcvdPort1_FilterC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (TID1): " + RcvdPort1_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U1 (TID2): " + RcvdPort1_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (TID3): " + RcvdPort1_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U1 (TID4): " + RcvdPort1_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U2 (TID1): " + RcvdPort2_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (TID2): " + RcvdPort2_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U2 (TID3): " + RcvdPort2_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U2 (TID4): " + RcvdPort2_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (FilterA): " + RcvdPort1_FilterA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (FilterB): " + RcvdPort2_FilterB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (FilterC): " + RcvdPort1_FilterC + " Packets");
    logInfo("");
    logInfo("Total Nb of Multicast Flow packets received on Interface U1: " + RcvdPort1_StreamABCD + " Packets");
    logInfo("Total Nb of Multicast Flow packets received on Interface U2: " + RcvdPort2_StreamABCD + " Packets");
    if ((RcvdPort1_StreamA < ((1 - Tolerance) * TransmittedA)) || (RcvdPort1_FilterA < ((1 - Tolerance) * TransmittedA))) {
        verdict = false;
        logError("Multicast flow A not received on U1");
    } else logInfo("Multicast flow A correctly received on U1-interface");
    if (RcvdPort1_StreamB) {
        verdict = false;
        logError("Multicast flow B received on U1");
    }
    if (RcvdPort1_StreamC) {
        verdict = false;
        logError("Multicast flow C received on U1");
    }
    if (RcvdPort1_StreamD) {
        verdict = false;
        logError("Multicast flow D received on U1");
    }
    if (RcvdPort2_StreamABCD) {
        verdict = false;
        logError("Received Multicast flow on U2");
    }

    logInfo("");
    logInfo("Sending IGMP Join Channel B");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(2, IEEE_802_1Q.Build_Untagged_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST1), IEEE_802_1Q.MAC_To_String(MAC_SRC2), 0x0800, IP.Build_Frame_RouterAlert("224.0.0.22", "128.0.0.6", 0x02, IGMP.Build_Join(IP_S2, IP_G2))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.EnableStreamOnPort(0, 2);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(2, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(2);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 5);
    if (RcvdIGMP == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("IGMP frame received"); }

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    /// Check that none of the U interfaces receive Multicast flow
    var RcvdPort1_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvdPort1_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvdPort1_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvdPort1_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvdPort1_StreamABCD = RcvdPort1_StreamA + RcvdPort1_StreamB + RcvdPort1_StreamC + RcvdPort1_StreamD;
    var RcvdPort2_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    var RcvdPort2_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    var RcvdPort2_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 3);
    var RcvdPort2_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 4);
    var RcvdPort2_StreamABCD = RcvdPort2_StreamA + RcvdPort2_StreamB + RcvdPort2_StreamC + RcvdPort2_StreamD;
    var RcvdPort1_FilterA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdPort2_FilterB = TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 0);
    var RcvdPort1_FilterC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (TID1): " + RcvdPort1_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U1 (TID2): " + RcvdPort1_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (TID3): " + RcvdPort1_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U1 (TID4): " + RcvdPort1_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U2 (TID1): " + RcvdPort2_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (TID2): " + RcvdPort2_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U2 (TID3): " + RcvdPort2_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U2 (TID4): " + RcvdPort2_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (FilterA): " + RcvdPort1_FilterA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (FilterB): " + RcvdPort2_FilterB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (FilterC): " + RcvdPort1_FilterC + " Packets");
    logInfo("");
    logInfo("Total Nb of Multicast Flow packets received on Interface U1: " + RcvdPort1_StreamABCD + " Packets");
    logInfo("Total Nb of Multicast Flow packets received on Interface U2: " + RcvdPort2_StreamABCD + " Packets");
    if ((RcvdPort1_StreamA < ((1 - Tolerance) * TransmittedA)) || (RcvdPort1_FilterA < ((1 - Tolerance) * TransmittedA))) {
        verdict = false;
        logError("Multicast flow A not received on U1");
    } else logInfo("Multicast flow A correctly received on U1-interface");
    if (RcvdPort1_StreamB) {
        verdict = false;
        logError("Multicast flow B received on U1");
    }
    if (RcvdPort1_StreamC) {
        verdict = false;
        logError("Multicast flow C received on U1");
    }
    if (RcvdPort1_StreamD) {
        verdict = false;
        logError("Multicast flow D received on U1");
    }
    if (RcvdPort2_StreamA) {
        verdict = false;
        logError("Multicast flow A received on U2");
    }
    if ((RcvdPort2_StreamB < ((1 - Tolerance) * TransmittedB)) || (RcvdPort2_FilterB < ((1 - Tolerance) * TransmittedB))) {
        verdict = false;
        logError("Multicast flow B not received on U2");
    } else logInfo("Multicast flow B correctly received on U2-interface");
    if (RcvdPort2_StreamC) {
        verdict = false;
        logError("Multicast flow C received on U2");
    }
    if (RcvdPort2_StreamD) {
        verdict = false;
        logError("Multicast flow D received on U2");
    }

    logInfo("");
    logInfo("Sending IGMP Join Channel C");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Untagged_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST1), IEEE_802_1Q.MAC_To_String(MAC_SRC1), 0x0800, IP.Build_Frame_RouterAlert("224.0.0.22", "128.0.0.5", 0x02, IGMP.Build_Join(IP_S3, IP_G3))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 2);
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 5);
    if (RcvdIGMP == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("IGMP frame received"); }

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    /// Check that none of the U interfaces receive Multicast flow
    var RcvdPort1_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvdPort1_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvdPort1_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvdPort1_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvdPort1_StreamABCD = RcvdPort1_StreamA + RcvdPort1_StreamB + RcvdPort1_StreamC + RcvdPort1_StreamD;
    var RcvdPort2_StreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    var RcvdPort2_StreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    var RcvdPort2_StreamC = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 3);
    var RcvdPort2_StreamD = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 4);
    var RcvdPort2_StreamABCD = RcvdPort2_StreamA + RcvdPort2_StreamB + RcvdPort2_StreamC + RcvdPort2_StreamD;
    var RcvdPort1_FilterA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdPort2_FilterB = TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 0);
    var RcvdPort1_FilterC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (TID1): " + RcvdPort1_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U1 (TID2): " + RcvdPort1_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (TID3): " + RcvdPort1_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U1 (TID4): " + RcvdPort1_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U2 (TID1): " + RcvdPort2_StreamA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (TID2): " + RcvdPort2_StreamB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U2 (TID3): " + RcvdPort2_StreamC + " Packets");
    logInfo("Nb of Multicast Flow D packets received on Interface U2 (TID4): " + RcvdPort2_StreamD + " Packets");
    logInfo("");
    logInfo("Nb of Multicast Flow A packets received on Interface U1 (FilterA): " + RcvdPort1_FilterA + " Packets");
    logInfo("Nb of Multicast Flow B packets received on Interface U2 (FilterB): " + RcvdPort2_FilterB + " Packets");
    logInfo("Nb of Multicast Flow C packets received on Interface U1 (FilterC): " + RcvdPort1_FilterC + " Packets");
    logInfo("");
    logInfo("Total Nb of Multicast Flow packets received on Interface U1: " + RcvdPort1_StreamABCD + " Packets");
    logInfo("Total Nb of Multicast Flow packets received on Interface U2: " + RcvdPort2_StreamABCD + " Packets");
    if ((RcvdPort1_StreamA < ((1 - Tolerance) * TransmittedA)) || (RcvdPort1_FilterA < ((1 - Tolerance) * TransmittedA))) {
        verdict = false;
        logError("Multicast flow A not received on U1");
    } else logInfo("Multicast flow A correctly received on U1-interface");
    if (RcvdPort1_StreamB) {
        verdict = false;
        logError("Multicast flow B received on U2");
    }
    if ((RcvdPort1_StreamC < ((1 - Tolerance) * TransmittedC)) || (RcvdPort1_FilterC < ((1 - Tolerance) * TransmittedC))) {
        verdict = false;
        logError("Multicast flow C not received on U1");
    } else logInfo("Multicast flow C correctly received on U1-interface");
    if (RcvdPort1_StreamD) {
        verdict = false;
        logError("Multicast flow D received on U1");
    }
    if (RcvdPort2_StreamA) {
        verdict = false;
        logError("Multicast flow A received on U2");
    }
    if ((RcvdPort2_StreamB < ((1 - Tolerance) * TransmittedB)) || (RcvdPort2_FilterB < ((1 - Tolerance) * TransmittedB))) {
        verdict = false;
        logError("Multicast flow B not received on U2");
    } else logInfo("Multicast flow B correctly received on U2-interface");
    if (RcvdPort2_StreamC) {
        verdict = false;
        logError("Multicast flow C received on U2");
    }
    if (RcvdPort2_StreamD) {
        verdict = false;
        logError("Multicast flow D received on U2");
    }
    /// End of test
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}

testPassed();