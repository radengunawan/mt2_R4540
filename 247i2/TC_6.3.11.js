include("Config.js");

//Test case 6.3.11 IGMP Transparent Snooping
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094);;
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocId1 = GEM1;
var SPbit1 = RandomInteger(0, 7);

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
var DwUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DwUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);

PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);
/// Send PLOAM Assign Alloc ID

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

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

//UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": "224.0.0.0",
        "DestIPAddrEnd": "239.255.255.255",
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

testPassed("MIB Configuration set");
logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

addTranslationEthToGpon(SVID1, 0xff, GEM2);
addTranslationGponToEth(GEM1);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");

    var IP_G1 = IPv4Address("224.4.5.1");
    var IP_G2 = IPv4Address("224.4.5.2");
    var IP_G3 = IPv4Address("224.4.5.3");
    var IP_G4 = IPv4Address("224.4.5.4");

    var IP_S1 = IPv4Address("128.0.0.1");
    var IP_S2 = IPv4Address("128.0.0.2");
    var IP_S3 = IPv4Address("128.0.0.3");
    var IP_S4 = IPv4Address("128.0.0.4");
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.5");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4Address());
        IP_S2 = IPv4Address(RandomIPv4AddressExcept([IP_S1]));
        IP_S3 = IPv4Address(RandomIPv4AddressExcept([IP_S1, IP_S2]));
        IP_S4 = IPv4Address(RandomIPv4AddressExcept([IP_S1, IP_S2, IP_S3]));
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept([IP_S1, IP_S2, IP_S3, IP_S4]));
        IP_G1 = IGMP.GetUnusedMcastIPv4Address();
        IP_G2 = IGMP.GetUnusedMcastIPv4Address();
        IP_G3 = IGMP.GetUnusedMcastIPv4Address();
        IP_G4 = IGMP.GetUnusedMcastIPv4Address();
    }

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_S2 = IP.MACAddressFromIP(IP_S2);
    var MAC_S3 = IP.MACAddressFromIP(IP_S3);
    var MAC_S4 = IP.MACAddressFromIP(IP_S4);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
    var MAC_G3 = IGMP.GroupMACAddressFromIP(IP_G3);
    var MAC_G4 = IGMP.GroupMACAddressFromIP(IP_G4);

    var IGMPJoinChannel1Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPJoinChannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S2, IP_G2));
    var IGMPJoinChannel3Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S3, IP_G3));

    var Tolerance = Tol_6_3_11;
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3  digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.3.11", [
        ["<SVID1>", SVID1, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1, 0xC],
        ["<MAC_S1>", MAC_S1, 0xC],
        ["<MAC_S2>", MAC_S2, 0xC],
        ["<MAC_S3>", MAC_S3, 0xC],
        ["<MAC_S4>", MAC_S4, 0xC],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2, 0xC],
        ["<MAC_G3>", MAC_G3, 0xC],
        ["<MAC_G4>", MAC_G4, 0xC],
        ["<IP_G1>", IP_G1],
        ["<IP_S1>", IP_S1],
        ["<IP_G2>", IP_G2],
        ["<IP_S2>", IP_S2],
        ["<IP_G3>", IP_G3],
        ["<IP_S3>", IP_S3],
        ["<IP_G4>", IP_G4],
        ["<IP_S4>", IP_S4],
        ["<IGMPJoinChannel1Datagram>", IGMPJoinChannel1Datagram],
        ["<IGMPJoinChannel2Datagram>", IGMPJoinChannel2Datagram],
        ["<IGMPJoinChannel3Datagram>", IGMPJoinChannel3Datagram]
    ]);
    testPassed("Starting stream tests");
    sleep(TrafficGenerator.delayBeforeTraffic);
    logInfo("Generate multicast traffics at the V-interface");
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);
    TrafficGenerator.DisableStreamOnPort(0, 1);
    TrafficGenerator.DisableStreamOnPort(1, 1);
    TrafficGenerator.DisableStreamOnPort(2, 1);

    /// Send Join Channel 1
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.StartTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    logInfo("");
    logInfo("Send Join Channel 1 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoinChannel1Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var rcvdIGMPv3all = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Check that the traffic is correcly forwarded for Ch1
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var xmit4 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var rcvd1234 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var rcvd4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);

    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Transmitted " + xmit4 + " packets for Ch4");
    logInfo("Received (filter ABCD)" + rcvd1234 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    logInfo("Received (TID4)" + rcvd4 + " packets for Ch4");
    logInfo("Total IGMP frames received : " + rcvdIGMPv3all);
    //logInfo("Correct IGMP frames received : " +rcvdIGMP);

    if (rcvdIGMPv3all == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("Correct IGMP frames received"); }

    if (rcvd1 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface");
    } else if (rcvd1234 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch1 not received on U-interface with S-tag");
    } else { logInfo("Ch1 correctly received with S-tag"); }

    /// Send Join Channel 2
    TrafficGenerator.StartTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    logInfo("");
    logInfo("Send Join Channel 2 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoinChannel2Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var rcvdIGMPv3all = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Check that the traffic is correcly forwarded for Ch1
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var xmit4 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var rcvd1234 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var rcvd4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);

    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Transmitted " + xmit4 + " packets for Ch4");
    logInfo("Received (filter ABCD)" + rcvd1234 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    logInfo("Received (TID4)" + rcvd4 + " packets for Ch4");

    logInfo("Total IGMP frames received : " + rcvdIGMPv3all);

    if (rcvdIGMPv3all == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("Correct IGMP frames received"); }

    if (rcvd2 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch2 not received on U-interface");
    } else if (rcvd1234 < ((1 - Tolerance) * (xmit1 + xmit2))) {
        verdict = false;
        logError("Ch1 or Ch2 not received on U-interface with S-tag");
    } else { logInfo("Ch2 correctly received with S-tag"); }

    /// Send Join Channel 3
    TrafficGenerator.StartTrafficOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    logInfo("");
    logInfo("Send Join Channel 3 at U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoinChannel3Datagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    //var rcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var rcvdIGMPv3all = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Check that the traffic is correcly forwarded for Ch1
    sleep(4000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var xmit1 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var xmit2 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var xmit3 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var xmit4 = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var rcvd1234 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var rcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var rcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var rcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var rcvd4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);

    logInfo("Transmitted " + xmit1 + " packets for Ch1");
    logInfo("Transmitted " + xmit2 + " packets for Ch2");
    logInfo("Transmitted " + xmit3 + " packets for Ch3");
    logInfo("Transmitted " + xmit4 + " packets for Ch4");
    logInfo("Received (filter ABCD)" + rcvd1234 + " packets");
    logInfo("Received (TID1)" + rcvd1 + " packets for Ch1");
    logInfo("Received (TID2)" + rcvd2 + " packets for Ch2");
    logInfo("Received (TID3)" + rcvd3 + " packets for Ch3");
    logInfo("Received (TID4)" + rcvd4 + " packets for Ch4");

    logInfo("Total IGMP frames received : " + rcvdIGMPv3all);
    //logInfo("Correct IGMP frames received : " +rcvdIGMP);

    if (rcvdIGMPv3all == 0) {
        verdict = false;
        logError("No IGMP frame received");
    } else { logInfo("Correct IGMP frames received"); }


    if (rcvd3 < ((1 - Tolerance) * xmit1)) {
        verdict = false;
        logError("Ch3 not received on U-interface");
    } else if (rcvd1234 < ((1 - Tolerance) * (xmit1 + xmit2 + xmit3))) {
        verdict = false;
        logError("Ch1 or Ch2 or Ch3 not received on U-interface with S-tag");
    } else { logInfo("Ch3 correctly received with S-tag"); }
    if (rcvd4 > 0) {
        verdict = false;
        logError("Ch4 received on U-interface");
    } else { logInfo("Ch4 correctly rejected on U-interface"); }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast streams");
    else testPassedWithTraffic();
}

testPassed();