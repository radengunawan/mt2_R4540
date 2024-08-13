include("Config.js");

//Test case 6.3.12 Multicast VLAN membership based on user ports (Multiple user ports)
//NOTE: There are a couple of ways to acheive the desired result and this sequences uses the MOP rather than VLAN filtering.

/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var VID2 = RandomIntegerExcept(1, 4094, [VID1]); /// VID2 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM3 randomly chosen in range [256..4094]
var AllocId1 = GEM1;

var Pbit1 = RandomInteger(0, 7);
var Pbit2 = RandomIntegerExcept(0, 7, [Pbit1]);

// var IP_S1 = RandomIPv4Address(); /// Random IP                 
var IP_S1 = "192.168.1.1"; /// Random IP                 
// var IP_G1 = RandomInteger(224, 239).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString(); /// Random IP
var IP_G1 = "224.1.1.1";
// var IP_S2 = RandomIPv4Address(); /// Random IP                 
var IP_S2 = "192.168.1.2"; /// Random IP                 
// var IP_G2 = RandomInteger(224, 239).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString(); /// Random IP
var IP_G2 = "224.1.1.2";

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    IP_S1 = "128.0.0.1";
    IP_S2 = "128.0.0.2";
    IP_G1 = "224.4.5.1";
    IP_G2 = "224.4.5.2";
}

var IND1 = 0;
var IND2 = IND1 + 1;

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
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP3, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });
var MCIWTP1 = OMCI.Create(OMCC, "Multicast_GEM_Interworking_Termination_Point", { "GEMPortCTPConnectPointer": CTP2 });
OMCI.Set(OMCC, "Multicast_GEM_Interworking_Termination_Point", MCIWTP1, { "MulticastAddrTable": { "GEMPortID": MGEM, "SecondaryIndex": 0, "DestIPAddrStart": "224.0.0.0", "DestIPAddrEnd": "239.255.255.255" } });

//ANI side ports for Subscriber 1
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

//ANI side ports for Subscriber 2
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 1, TPtype: 3, TPPointer: PMAP2 });
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 2, TPtype: 6, TPPointer: MCIWTP1 });

//All frames get passed upstream 
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, { P0Ptr: IWTP2, P1Ptr: IWTP2, P2Ptr: IWTP2, P3Ptr: IWTP2, P4Ptr: IWTP2, P5Ptr: IWTP2, P6Ptr: IWTP2, P7Ptr: IWTP2 });

//UNI side port: Subscriber1
var BPCD5 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8 });


//UNI side port: Subscriber2
var BPCD6 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP2 });
var EVTOCD2 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP2 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND1,
        "GEMPortID": MGEM,
        "VlanID": VID1,
        "SourceIPAddr": IP_S1,
        "DestIPAddrStart": IP_G1,
        "DestIPAddrEnd": IP_G1,
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MOP2 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP2, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND1,
        "GEMPortID": MGEM,
        "VlanID": VID2,
        "SourceIPAddr": IP_S2,
        "DestIPAddrStart": IP_G2,
        "DestIPAddrEnd": IP_G2,
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD5, "MulticastOprProfilePtr": MOP1 });
var MSCI2 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD6, "MulticastOprProfilePtr": MOP2 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP2, { AdminState: 0 });

logInfo("Random values VID1=" + VID1 + " ; VID2=" + VID2);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM=" + MGEM);

addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM3);
addTranslationEthToGpon(0xffff, 0xff, MGEM);


if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");
    var Tolerance = Tol_6_3_12;
    var verdict = true;

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// MAC source address
    var MAC_SRC1 = 0x202233445507;
    var MAC_SRC2 = 0x202233445508;
    var MAC_SRC3 = 0x202233445509;
    var MAC_SRC4 = 0x20223344550A;
    var MAC_SRC5 = 0x102233445501;
    var MAC_SRC6 = 0x102233445502;
    /// MAC destination addresses 
    var MAC_DST1 = 0x01005e040501;
    var MAC_DST2 = 0x01005e040502;



    var Pbit3 = 4;
    var Pbit4 = 5;


    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.12", [
        ["<VID1>", VID1, 3],
        ["<VID2>", VID2, 3],
        ["<Pbit1>", Pbit1 << 1, 1],
        ["<Pbit2>", Pbit2 << 1, 1],
        ["<Pbit3>", Pbit3 << 1, 1],
        ["<Pbit4>", Pbit4 << 1, 1],
        ["<MAC_SRC1>", MAC_SRC1, 0xC],
        ["<MAC_SRC2>", MAC_SRC2, 0xC],
        ["<MAC_SRC3>", MAC_SRC3, 0xC],
        ["<MAC_SRC4>", MAC_SRC4, 0xC],
        ["<MAC_SRC5>", MAC_SRC5, 0xC],
        ["<MAC_SRC6>", MAC_SRC6, 0xC],
        ["<MAC_DST1>", MAC_DST1, 0xC],
        ["<MAC_DST2>", MAC_DST2, 0xC]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Start all downstream multicast stream
    testPassed("Send IGMP frames");
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0)
    logInfo("Sending multicast streams")
    TrafficGenerator.StartTrafficOnPort(0);

    logInfo("");
    logInfo("Sending Join channel 1 message on U-interface 1");
    ///sending of frame IGMP join


    TrafficGenerator.ClearReceiveStatsOnPort(0);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {


        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST1), IEEE_802_1Q.MAC_To_String(MAC_SRC1), Pbit3, VID1, 0x0800, IP.Build_Frame_RouterAlert("224.4.5.1", "128.0.0.5", 0x02, IGMP.Build_MembershipReport_v2("224.4.5.1"))), 2);
        sleep(1000)
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(15000);
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the IGMP frame has been received

    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMP > 0) { logInfo("IGMP frame received on S/R-interface");; } else {
        verdict = false;
        logError("No IGMP frame received on S/R-interface");
    }

    var Trans1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    logInfo("Frame of stream1 sent" + Trans1);
    var Rcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var ratio1 = Rcvd1U1 / Trans1;
    var ratio1_100 = (ratio1 * 100).toFixed(2);
    logInfo("Frame of stream1 received on U interface 1: " + Rcvd1U1 + " : " + ratio1_100 + "%");
    var CorrectRcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Correct frames of stream1 received on U interface 1: " + CorrectRcvd1U1);
    var Rcvd2U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Frame of stream2 received on U interface 1: " + Rcvd2U1);
    var Rcvd1U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    logInfo("Frame of stream1 received on U interface 2: " + Rcvd1U2);
    var Rcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    logInfo("Frame of stream2 received on U interface 2: " + Rcvd2U2);

    /// Check if the no frame received on U interface 2
    if (Rcvd1U2 > 0) {
        verdict = false;
        logError("FAILED : Stream1 received on U-interface 2");
    } else if (Rcvd2U2 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 2");
    } else { logInfo("PASSED : No frames received on U-interface 2"); }

    /// Check if the stream1 only received on U interface 1
    if ((ratio1 > 1 - Tolerance) && (Rcvd2U1 == 0)) { logInfo("PASSED : Stream1 only received on U-interface 1"); } else if (Rcvd2U1 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 1");
    } else {
        verdict = false;
        logError("FAILED : Stream1 not received on U-interface 1");
    }

    TrafficGenerator.StartTrafficOnPort(0);
    logInfo("");
    logInfo("Sending Join channel 2 message on U-interface 1");
    ///sending of frame IGMP join
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {

        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST2), IEEE_802_1Q.MAC_To_String(MAC_SRC2), Pbit4, VID2, 0x0800, IP.Build_Frame_RouterAlert("224.4.5.2", "128.0.0.6", 0x02, IGMP.Build_MembershipReport_v2("224.4.5.2"))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);

    TrafficGenerator.StartTrafficOnPort(0);
    sleep(15000);
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the IGMP frame has been received

    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMP == 0) { logInfo(" IGMP frame rejected");; } else {
        verdict = false;
        logError(" IGMP frame not rejected ");
    }

    var Trans1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    logInfo("Frame of stream1 sent" + Trans1);
    var Rcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var ratio1 = Rcvd1U1 / Trans1;
    var ratio1_100 = (ratio1 * 100).toFixed(2);
    logInfo("Frame of stream1 received on U interface 1: " + Rcvd1U1 + " : " + ratio1_100 + "%");
    var CorrectRcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Correct frames of stream1 received on U interface 1: " + CorrectRcvd1U1);
    var Rcvd2U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Frame of stream2 received on U interface 1: " + Rcvd2U1);
    var Rcvd1U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    logInfo("Frame of stream1 received on U interface 2: " + Rcvd1U2);
    var Rcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    logInfo("Frame of stream2 received on U interface 2: " + Rcvd2U2);

    /// Check if the no frame received on U interface 2
    if (Rcvd1U2 > 0) {
        verdict = false;
        logError("FAILED : Stream1 received on U-interface 2");
    } else if (Rcvd2U2 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 2");
    } else { logInfo("PASSED : No frames received on U-interface 2"); }

    /// Check if the stream1 only received on U interface 1
    if ((ratio1 > 1 - Tolerance) && (Rcvd2U1 == 0)) { logInfo("PASSED : Stream1 only received on U-interface 1"); } else if (Rcvd2U1 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 1");
    } else {
        verdict = false;
        logError("FAILED : Stream1 not received on U-interface 1");
    }

    TrafficGenerator.StartTrafficOnPort(0);
    logInfo("");
    logInfo("Sending Join channel 1 message on U-interface 2");
    ///sending of frame IGMP join
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {

        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(2, IEEE_802_1Q.Build_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST1), IEEE_802_1Q.MAC_To_String(MAC_SRC3), Pbit3, VID1, 0x0800, IP.Build_Frame_RouterAlert("224.4.5.1", "128.0.0.7", 0x02, IGMP.Build_MembershipReport_v2("224.4.5.1"))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.EnableStreamOnPort(0, 2);
        TrafficGenerator.DisableStreamOnPort(1, 2);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(2, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(2);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);

    TrafficGenerator.StartTrafficOnPort(0);
    sleep(15000);
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the IGMP frame has been received
    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMP == 0) { logInfo(" IGMP frame rejected");; } else {
        verdict = false;
        logError(" IGMP frame not rejected ");
    }

    var Trans1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    logInfo("Frame of stream1 sent" + Trans1);
    var Rcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var ratio1 = Rcvd1U1 / Trans1;
    var ratio1_100 = (ratio1 * 100).toFixed(2);
    logInfo("Frame of stream1 received on U interface 1: " + Rcvd1U1 + " : " + ratio1_100 + "%");
    var CorrectRcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Correct frames of stream1 received on U interface 1: " + CorrectRcvd1U1);
    var Rcvd2U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Frame of stream2 received on U interface 1: " + Rcvd2U1);
    var Rcvd1U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    logInfo("Frame of stream1 received on U interface 2: " + Rcvd1U2);
    var Rcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    logInfo("Frame of stream2 received on U interface 2: " + Rcvd2U2);

    /// Check if the no frame received on U interface 2
    if (Rcvd1U2 > 0) {
        verdict = false;
        logError("FAILED : Stream1 received on U-interface 2");
    } else if (Rcvd2U2 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 2");
    } else { logInfo("PASSED : No frames received on U-interface 2"); }

    /// Check if the stream1 only received on U interface 1
    if ((ratio1 > 1 - Tolerance) && (Rcvd2U1 == 0)) { logInfo("PASSED : Stream1 only received on U-interface 1"); } else if (Rcvd2U1 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 1");
    } else {
        verdict = false;
        logError("FAILED : Stream1 not received on U-interface 1");
    }

    TrafficGenerator.StartTrafficOnPort(0);
    logInfo("");
    logInfo("Sending Join channel 2 message on U-interface 2");
    ///sending of frame IGMP join
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        /// MAC source address
        var MAC_SRC = "20:22:33:44:55:0A";
        /// MAC destination addresses 
        var MAC_DST = "01:00:5e:04:05:02";
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.SendFrameOnPort(2, IEEE_802_1Q.Build_Frame(IEEE_802_1Q.MAC_To_String(MAC_DST2), IEEE_802_1Q.MAC_To_String(MAC_SRC4), Pbit4, VID2, 0x0800, IP.Build_Frame_RouterAlert("224.4.5.2", "128.0.0.8", 0x02, IGMP.Build_MembershipReport_v2("224.4.5.2"))), 2);
        sleep(1000);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 2);
        TrafficGenerator.EnableStreamOnPort(1, 2);
        TrafficGenerator.ClearReceiveStatsOnPort(0);
        TrafficGenerator.StartTrafficOnPort(2, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(2);
    }
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(2);
    TrafficGenerator.ClearTransmitStatsOnPort(0);

    TrafficGenerator.StartTrafficOnPort(0);
    sleep(15000);
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the IGMP frame has been received

    logInfo("IGMP frame received:" + RcvdIGMP);
    if (RcvdIGMP > 0) { logInfo("IGMP frame received on S/R-interface");; } else {
        verdict = false;
        logError("No IGMP frame received on S/R-interface");
    }

    var Trans1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    logInfo("Frames of stream1 sent" + Trans1);
    var Rcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var ratio1 = Rcvd1U1 / Trans1;
    var ratio1_100 = (ratio1 * 100).toFixed(2);
    logInfo("Frame of stream1 received on U interface 1: " + Rcvd1U1 + " : " + ratio1_100 + "%");
    var CorrectRcvd1U1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Correct frames of stream1 received on U interface 1: " + CorrectRcvd1U1);
    var Rcvd2U1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Frames of stream2 received on U interface 1: " + Rcvd2U1);
    var Rcvd1U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 1);
    logInfo("Frames of stream1 received on U interface 2: " + Rcvd1U2);
    var Trans2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    logInfo("Frames of stream2 sent" + Trans2);
    var Rcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    logInfo("Frames of stream2 received on U interface 2: " + Rcvd2U2);
    var Rcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(2, 2);
    var ratio2 = Rcvd2U2 / Trans2
    var ratio2_100 = (ratio2 * 100).toFixed(2);
    logInfo("Frames of stream2 received on U interface 2: " + Rcvd2U2 + " : " + ratio2_100 + "%");
    var CorrectRcvd2U2 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(2, 0);
    logInfo("Correct frames of stream2 received on U interface 2: " + CorrectRcvd2U2);

    /// Check if the  stream2 only received on U interface 2
    if ((ratio2 > 1 - Tolerance) && (Rcvd1U2 == 0)) { logInfo("PASSED : Stream2 only received on U-interface 2"); } else if (Rcvd1U2 > 0) {
        verdict = false;
        logError("FAILED : Stream1 received on U-interface 2");
    } else {
        verdict = false;
        logError("FAILED : Stream2 not received on U-interface 2");
    }

    /// Check if the stream1 only received on U interface 1
    if ((ratio1 > 1 - Tolerance) && (Rcvd2U1 == 0)) { logInfo("PASSED : Stream1 only received on U-interface 1"); } else if (Rcvd2U1 > 0) {
        verdict = false;
        logError("FAILED : Stream2 received on U-interface 1");
    } else {
        verdict = false;
        logError("FAILED : Stream1 not received on U-interface 1");
    }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}
testPassed();