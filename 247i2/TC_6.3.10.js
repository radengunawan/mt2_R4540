include("Config.js");

//Test case 6.3.10 Maximum number of muticast flows

/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var Pbit1 = RandomInteger(0, 7);
var IP_G1 = IPv4Address("224.1.1.1");
var IP_G2 = IPv4Address("224.1.1.2");
var IP_G3 = IPv4Address("224.1.1.3");
var IND1 = 0;
var IND2 = IND1 + 1;
var IND3 = IND2 + 1;

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    IP_G2 = IGMP.GetUnusedMcastIPv4Address();
    IP_G3 = IGMP.GetUnusedMcastIPv4Address();
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

//All frames get passed upstream
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

//UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND1,
        "GEMPortID": MGEM,
        "VlanID": VID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND2,
        "GEMPortID": MGEM,
        "VlanID": VID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND3,
        "GEMPortID": MGEM,
        "VlanID": VID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G3.ToString(),
        "DestIPAddrEnd": IP_G3.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1, "MaxSimulGroups": 2 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });


logInfo("Random value: VID1=" + VID1);
logInfo("Random value: Pbit1=" + Pbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM2=" + MGEM);

addTranslationGponToEth(GEM1);
addTranslationEthToGpon(0xffff, 0xff, MGEM);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");

    var IP_S1 = IPv4Address("128.0.0.1");
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.5");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4Address());
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept([IP_S1]));
    }

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);

    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
    var MAC_G3 = IGMP.GroupMACAddressFromIP(IP_G3);

    var IGMPJoinChannel1Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPJoinChannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G2));
    var IGMPLeaveChannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G2));
    var IGMPDownstreamQueryChannel2 = IP.Build_Frame_RouterAlert(IP_G2, IP_S1, 0x02, IGMP.Build_Query(IP_G2));
    var IGMPJoinChannel3Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G3))

    var Tolerance = Tol_6_3_10;
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace VID1 by the value formatted on 3  digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.3.10", [
        ["<VID1>", VID1, 3],
        ["<Pbit1>", Pbit1 << 1, 1],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_S1>", MAC_S1, 0xC],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_G3>", MAC_G3],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_G3>", IP_G3],
        ["<IP_S1>", IP_S1],
        ["<IP_IGMP_US_S1>", IP_IGMP_US_S1],
        ["<IGMPJoinChannel1Datagram>", IGMPJoinChannel1Datagram],
        ["<IGMPJoinChannel2Datagram>", IGMPJoinChannel2Datagram],
        ["<IGMPLeaveChannel2Datagram>", IGMPLeaveChannel2Datagram],
        ["<IGMPDownstreamQueryChannel2>", IGMPDownstreamQueryChannel2],
        ["<IGMPJoinChannel3Datagram>", IGMPJoinChannel3Datagram]
    ]);
    testPassed("Starting stream tests");
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Step 10 - 10.	Generate multicast traffic defines in test condition 3 at the V-interface 
    logInfo("Generate multicast traffics at the V-interface");

    TrafficGenerator.DisableStreamOnPort(0, 0);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Send Join Channel 1
    logInfo("");
    logInfo("Send Join Channel 1 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinChannel1Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(500);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Send Join Channel 2
    logInfo("Send Join Channel 2 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinChannel2Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(500);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Check that the traffic is correclyforwarded for Ch1 and Ch2
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(1000);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var rcvd12 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Received (filter ABC)" + rcvd12 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    if (rcvd1 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface");
    } else if (rcvd2 < ((1 - Tolerance) * xmit2)) {
        verdict = false;
        logError("Ch2 not received on U-interface");
    } else if (rcvd12 < ((1 - Tolerance) * (xmit1 + xmit2))) {
        verdict = false;
        logError("Ch1 or Ch2 not received on U-interface with correct Tag");
    } else { logInfo("Ch1 and Ch2 correctly received on U-interface"); }

    /// Send Join Channel 3
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    logInfo("");
    logInfo("Send Join Channel 3 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinChannel3Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(500);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Check that the traffic is correcly forwarded for Ch1 and Ch2 and rejected for Ch3
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(1000);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var rcvd123 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Received (filter ABC)" + rcvd123 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    if (rcvd1 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface");
    } else if (rcvd2 < ((1 - Tolerance) * xmit2)) {
        verdict = false;
        logError("Ch2 not received on U-interface");
    } else if (rcvd3 > 0) {
        verdict = false;
        logError("Ch3 incorrectly received on U-interface");
    } else if (rcvd123 < ((1 - Tolerance) * (xmit1 + xmit2))) {
        verdict = false;
        logError("Ch1 or Ch2 not received on U-interface with correct Tag");
    } else { logInfo("Ch1 and Ch2 correctly received on U-interface and Ch3 correctly rejected"); }

    /// Send Leave Channel 2
    logInfo("");
    logInfo("Send Leave Channel 2 at U-interface");
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPLeaveChannel2Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.EnableStreamOnPort(3, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    ///Send downstream group query to group 2
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_Frame(MAC_G2, MAC_S1, Pbit1, VID1, 0x0800, IGMPDownstreamQueryChannel2, 2));
        sleep(2000);
    } else {
        TrafficGenerator.StopTrafficOnPort(0);
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.EnableStreamOnPort(0, 0);
        TrafficGenerator.StartTrafficOnPort(0, 2);
        sleep(2000);
    }
    sleep(IGMP.LEAVE_DELAY()); // tempo leave not immediate -- No constraint in the test plan, leave extra time just in case
    /// Check that the traffic is correcly forwarded for Ch1 and rejected for Ch2 and Ch3
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(1000);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var rcvd123 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Received (filter ABC)" + rcvd123 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    if (rcvd1 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface");
    } else if (rcvd2 > 0) {
        verdict = false;
        logError("Ch2 incorrectly received on U-interface");
    } else if (rcvd3 > 0) {
        verdict = false;
        logError("Ch3 incorrectly received on U-interface");
    } else if (rcvd123 < ((1 - Tolerance) * (xmit1))) {
        verdict = false;
        logError("Ch1 not received on U-interface with correct Tag");
    } else { logInfo("Ch1 correctly received on U-interface and Ch2 and Ch3 correctly rejected"); }

    /// Send Join Channel 3
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    logInfo("");
    logInfo("Send Join Channel 3 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinChannel3Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(500);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Check that the traffic is correcly forwarded for Ch1 and Ch2 and rejected for Ch3
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(1000);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var rcvd123 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Received (filter ABC)" + rcvd123 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    if (rcvd1 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface");
    } else if (rcvd2 > 0) {
        verdict = false;
        logError("Ch2 incorrectly received on U-interface");
    } else if (rcvd3 < ((1 - Tolerance) * xmit3)) {
        verdict = false;
        logError("Ch3 not received on U-interface");
    } else if (rcvd123 < ((1 - Tolerance) * (xmit1 + xmit3))) {
        verdict = false;
        logError("Ch1 or Ch3 not received on U-interface with correct Tag");
    } else { logInfo("Ch1 and Ch3 correctly received on U-interface and Ch2 correctly rejected"); }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast streams");
    else testPassedWithTraffic();
}


testPassed();