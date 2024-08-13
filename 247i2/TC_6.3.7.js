include("Config.js");
include("IGMP.js");

//Test case 6.3.7 Multicast White List

/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1]); /// CVID2 randomly chosen in range [1..4094]
var CVID3 = RandomIntegerExcept(1, 4094, [CVID1, CVID2]); /// CVID3 randomly chosen in range [1..4094]
var CPbits1 = RandomInteger(0, 7);
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;

var IP_S1 = IPv4Address("192.168.1.1");
var IP_S2 = IPv4Address("192.168.1.3");
var IP_S3 = IPv4Address("192.168.1.2");
var IP_S4 = IPv4Address("192.168.1.4");
var IP_S5 = IPv4Address("192.168.1.5");
var IP_G1 = IPv4Address("224.1.1.1");
var IP_G2 = IPv4Address("224.1.1.3");
var IP_G3 = IPv4Address("224.1.1.2");
var IP_G4 = IPv4Address("224.1.1.4");
var IP_G5 = IPv4Address("224.1.1.5");

var IND1 = 0;
var IND3 = IND1 + 1;
var IND5 = IND3 + 1;


/// Use other IP values when TrafficGenerator automatisation is activated
if (UtilsParameters.IGMPRandomisation) {
    IP_S1 = IPv4Address(RandomIPv4Address());
    IP_S2 = IPv4Address(RandomIPv4AddressExcept(
        [
            IP_S1.ToString(),
        ]));
    IP_S3 = IPv4Address(RandomIPv4AddressExcept(
        [
            IP_S1.ToString(),
            IP_S2.ToString(),
        ]));
    IP_S4 = IPv4Address(RandomIPv4AddressExcept(
        [
            IP_S1.ToString(),
            IP_S2.ToString(),
            IP_S3.ToString()
        ]));
    IP_S5 = IPv4Address(RandomIPv4AddressExcept(
        [
            IP_S1.ToString(),
            IP_S2.ToString(),
            IP_S3.ToString(),
            IP_S4.ToString()
        ]));

    IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    IP_G2 = IGMP.GetUnusedMcastIPv4Address();
    IP_G3 = IGMP.GetUnusedMcastIPv4Address();
    IP_G4 = IGMP.GetUnusedMcastIPv4Address();
    IP_G5 = IGMP.GetUnusedMcastIPv4Address();
}

logInfo("IP_S1: " + IP_S1.ToString());
logInfo("IP_G1: " + IP_G1.ToString());
logInfo("IP_S2: " + IP_S2.ToString());
logInfo("IP_G2: " + IP_G2.ToString());
logInfo("IP_S3: " + IP_S3.ToString());
logInfo("IP_G3: " + IP_G3.ToString());
logInfo("IP_S4: " + IP_S4.ToString());
logInfo("IP_G4: " + IP_G4.ToString());
logInfo("IP_S5: " + IP_S5.ToString());
logInfo("IP_G5: " + IP_G5.ToString());

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
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND1,
        "GEMPortID": GEM2,
        "VlanID": CVID1,
        "SourceIPAddr": IP_S1.ToString(),
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND3,
        "GEMPortID": GEM2,
        "VlanID": CVID1,
        "SourceIPAddr": IP_S3.ToString(),
        "DestIPAddrStart": IP_G3.ToString(),
        "DestIPAddrEnd": IP_G3.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + IND5,
        "GEMPortID": GEM2,
        "VlanID": CVID2,
        "SourceIPAddr": IP_S4.ToString(),
        "DestIPAddrStart": IP_G5.ToString(),
        "DestIPAddrEnd": IP_G5.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

addTranslationGponToEth(GEM1);
addTranslationEthToGpon(0xffff, 0xff, GEM2);

logInfo("Random values CVID1=" + CVID1 + " ; CVID2=" + CVID2 + " ; CVID3=" + CVID3);
logInfo("Random value: CPbits1=" + CPbits1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");

    var Tolerance = Tol_6_3_7;
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var IP_IGMP_US_S1 = IPv4Address("128.0.0.7");

    if (UtilsParameters.IGMPRandomisation) {
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S1.ToString(),
                IP_S2.ToString(),
                IP_S3.ToString(),
                IP_S4.ToString(),
                IP_S5.ToString()
            ]));
    }

    logInfo("IP_IGMP_US_S1: " + IP_IGMP_US_S1.ToString());

    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
    var MAC_G3 = IGMP.GroupMACAddressFromIP(IP_G3);
    var MAC_G4 = IGMP.GroupMACAddressFromIP(IP_G4);
    var MAC_G5 = IGMP.GroupMACAddressFromIP(IP_G5);

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_S2 = IP.MACAddressFromIP(IP_S2);
    var MAC_S3 = IP.MACAddressFromIP(IP_S3);
    var MAC_S4 = IP.MACAddressFromIP(IP_S4);
    var MAC_S5 = IP.MACAddressFromIP(IP_S5);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);

    var IGMPJoinChannel1Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPLeaveChannel1Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G1));
    var IGMPQueryChannel1Datagram = IP.Build_Frame_RouterAlert(IP_G1, IP_S1, 0x02, IGMP.Build_Query(IP_G1));
    var IGMPJoinchannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S2, IP_G2));
    var IGMPLeaveChannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G2));
    var IGMPJoinchannel3Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S3, IP_G3));
    var IGMPLeavechannel3Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G3));
    var IGMPQueryChannel3Datagram = IP.Build_Frame_RouterAlert(IP_G3, IP_S3, 0x02, IGMP.Build_Query(IP_G3));
    var IGMPJoinChannel4Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S3, IP_G4));
    var IGMPLeaveChannel4Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G4));
    var IGMPJoinChannel5Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S4, IP_G5));
    var IGMPLeaveChannel5Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G5));
    var IGMPQueryChannel5Datagram = IP.Build_Frame_RouterAlert(IP_G5, IP_S4, 0x02, IGMP.Build_Query(IP_G5));
    var IGMPJoinChannel6Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S5, IP_G5));
    var IGMPLeaveChannel6Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G5));


    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.3.7", [
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CVID3>", CVID3, 3],
        ["<CPbits1>", CPbits1 << 1, 1],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_G3>", MAC_G3],
        ["<MAC_G4>", MAC_G4],
        ["<MAC_G5>", MAC_G5],
        ["<MAC_S1>", MAC_S1],
        ["<MAC_S2>", MAC_S2],
        ["<MAC_S3>", MAC_S3],
        ["<MAC_S4>", MAC_S4],
        ["<MAC_S5>", MAC_S5],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<IP_S1>", IP_S1],
        ["<IP_G1>", IP_G1],
        ["<IP_S2>", IP_S2],
        ["<IP_G2>", IP_G2],
        ["<IP_S3>", IP_S3],
        ["<IP_G3>", IP_G3],
        ["<IP_S4>", IP_S4],
        ["<IP_G4>", IP_G4],
        ["<IP_S5>", IP_S5],
        ["<IP_G5>", IP_G5],
        ["<IGMPJoinChannel1Datagram>", IGMPJoinChannel1Datagram],
        ["<IGMPLeaveChannel1Datagram>", IGMPLeaveChannel1Datagram],
        ["<IGMPQueryChannel1Datagram>", IGMPQueryChannel1Datagram],
        ["<IGMPJoinchannel2Datagram>", IGMPJoinchannel2Datagram],
        ["<IGMPLeaveChannel2Datagram>", IGMPLeaveChannel2Datagram],
        ["<IGMPJoinchannel3Datagram>", IGMPJoinchannel3Datagram],
        ["<IGMPLeavechannel3Datagram>", IGMPLeavechannel3Datagram],
        ["<IGMPQueryChannel3Datagram>", IGMPQueryChannel3Datagram],
        ["<IGMPJoinChannel4Datagram>", IGMPJoinChannel4Datagram],
        ["<IGMPLeaveChannel4Datagram>", IGMPLeaveChannel4Datagram],
        ["<IGMPJoinChannel5Datagram>", IGMPJoinChannel5Datagram],
        ["<IGMPLeaveChannel5Datagram>", IGMPLeaveChannel5Datagram],
        ["<IGMPQueryChannel5Datagram>", IGMPQueryChannel5Datagram],
        ["<IGMPJoinChannel6Datagram>", IGMPJoinChannel6Datagram],
        ["<IGMPLeaveChannel6Datagram>", IGMPLeaveChannel6Datagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    testPassed("Send IGMP frames");

    /// Start all downstream multicast stream
    logInfo("Starting Multicast streams");
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);
    TrafficGenerator.EnableStreamOnPort(5, 0);
    TrafficGenerator.EnableStreamOnPort(6, 0);
    TrafficGenerator.DisableStreamOnPort(7, 0);
    TrafficGenerator.DisableStreamOnPort(8, 0);
    TrafficGenerator.DisableStreamOnPort(9, 0);

    TrafficGenerator.StartTrafficOnPort(0);
    /// Wait for stream establishment
    sleep(500);
    /// Send IGMP Join Ch1

    logInfo("");
    logInfo("Sending IGMP Join Channel 1");
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPJoinChannel1Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.DisableStreamOnPort(4, 1);
        TrafficGenerator.DisableStreamOnPort(5, 1);
        TrafficGenerator.DisableStreamOnPort(6, 1);
        TrafficGenerator.DisableStreamOnPort(7, 1);
        TrafficGenerator.DisableStreamOnPort(8, 1);
        TrafficGenerator.DisableStreamOnPort(9, 1);
        TrafficGenerator.DisableStreamOnPort(10, 1);
        TrafficGenerator.DisableStreamOnPort(11, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for stream establishment
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0); ///Moved here to accomodate the fact that STC clears Rx and Tx stats at the same tome
    var RcvdIGMPAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);


    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface
    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMPv3 all): " + RcvdIGMPv3 + " Packets");
    logInfo("Nb of correct IGMP packets received on Interface S/R (Filter IGMPAC): " + RcvdIGMPAC + " Packets");
    if ((RcvTID1 < ((1 - Tolerance) * TransmittedA)) || (RcvdFilterAC < ((1 - Tolerance) * TransmittedA))) {
        verdict = false;
        logError("Multicast flow 1 not received on U-Interface");
    } else if (RcvdIGMPv3 == 0) {
        verdict = false;
        logError("No IGMP frame received on U-Interface");
    } else if ((RcvdIGMPv3 > 0) && (RcvdIGMPAC == 0)) {
        verdict = false;
        logError("Incorrect IGMP frame to join stream 1 received on U-Interface");
    } else { logInfo("Multicast flow 1 correctly received on U-interface"); }

    /// Send IGMP Leave Ch1	
    logInfo("Sending IGMP Leave Channel 1");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPLeaveChannel1Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_Frame(MAC_G1, MAC_S1, CPbits1, CVID1, 0x0800, IGMPQueryChannel1Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.EnableStreamOnPort(7, 0);
        TrafficGenerator.StartTrafficOnPort(0, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
    }
    /// Send IGMP Join Ch2

    logInfo("");
    logInfo("Sending IGMP Join Channel 2");
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPJoinchannel2Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(7, 0);
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface

    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMPv3 all): " + RcvdIGMPv3 + " Packets");
    if (RcvTID2 > 0) {
        verdict = false;
        logError("Multicast flow 2 received on U-Interface");
    } else logInfo("Multicast flow 2 correctly rejected on U-interface");
    if (RcvdIGMPv3) {
        verdict = false;
        logError("IGMP join message received on S/R-interface");
    } else logInfo("IGMP join message correctly rejected on S/R-interface");

    /// Send IGMP Leave Ch2
    logInfo("Sending IGMP Leave Channel 2");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPLeaveChannel2Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.EnableStreamOnPort(3, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    /// Send IGMP Join Ch3
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    logInfo("");
    logInfo("Sending IGMP Join Channel 3");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPJoinchannel3Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.EnableStreamOnPort(4, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var RcvdIGMPAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface

    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMPv3 all): " + RcvdIGMPv3 + " Packets");
    logInfo("Nb of correct IGMP packets received on Interface S/R (Filter IGMPAC): " + RcvdIGMPAC + " Packets");
    if ((RcvTID3 < ((1 - Tolerance) * TransmittedC)) || (RcvdFilterAC < ((1 - Tolerance) * TransmittedC))) {
        verdict = false;
        logError("Multicast flow 3 not received on U-Interface");
    } else if (RcvdIGMPv3 == 0) {
        verdict = false;
        logError("No IGMP frame received on U-Interface");
    } else if ((RcvdIGMPv3 > 0) && (RcvdIGMPAC == 0)) {
        verdict = false;
        logError("Incorrect IGMP frame to join stream 3 received on U-Interface");
    } else { logInfo("Multicast flow 3 correctly received on U-interface"); }

    /// Send IGMP Leave Ch3
    logInfo("Sending IGMP Leave Channel 3");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPLeavechannel3Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(4, 1);
        TrafficGenerator.EnableStreamOnPort(5, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_Frame(MAC_G3, MAC_S3, CPbits1, CVID1, 0x0800, IGMPQueryChannel3Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(5, 1);
        TrafficGenerator.EnableStreamOnPort(8, 0);
        TrafficGenerator.StartTrafficOnPort(0);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
        sleep(1000);
    }

    /// Send IGMP Join Ch4
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    logInfo("");
    logInfo("Sending IGMP Join Channel 4");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPJoinChannel4Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(8, 0);
        TrafficGenerator.EnableStreamOnPort(6, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface
    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMPv3 all): " + RcvdIGMPv3 + " Packets");
    if (RcvTID4 > 0) {
        verdict = false;
        logError("Multicast flow 4 received on U-Interface");
    } else logInfo("Multicast flow 4 correctly rejected on U-interface");
    if (RcvdIGMPv3) {
        verdict = false;
        logError("IGMP join message received on S/R-interface");
    } else logInfo("IGMP join message correctly rejected on S/R-interface");

    /// Send IGMP Leave Ch4
    logInfo("Sending IGMP Leave Channel 4");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID1, 0x0800, IGMPLeaveChannel4Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(6, 1);
        TrafficGenerator.EnableStreamOnPort(7, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    /// Send IGMP Join Ch5
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    logInfo("");
    logInfo("Sending IGMP Join Channel 5");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID2, 0x0800, IGMPJoinChannel5Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(7, 1);
        TrafficGenerator.EnableStreamOnPort(8, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var RcvdIGMPE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 2);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface
    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMPv3 all): " + RcvdIGMPv3 + " Packets");
    logInfo("Nb of correct IGMP packets received on Interface S/R (Filter IGMPE): " + RcvdIGMPE + " Packets");
    if ((RcvTID5 < ((1 - Tolerance) * TransmittedE)) || (RcvdFilterE < ((1 - Tolerance) * TransmittedE))) {
        verdict = false;
        logError("Multicast flow 5 not received on U-Interface");
    } else if (RcvdIGMPv3 == 0) {
        verdict = false;
        logError("No IGMP frame received on U-Interface");
    } else if ((RcvdIGMPv3 > 0) && (RcvdIGMPE == 0)) {
        verdict = false;
        logError("Incorrect IGMP frame to join stream 5 received on U-Interface");
    } else { logInfo("Multicast flow 5 correctly received on U-interface"); }

    /// Send IGMP Leave Ch5
    logInfo("Sending IGMP Leave Channel 5");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID2, 0x0800, IGMPLeaveChannel5Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(8, 1);
        TrafficGenerator.EnableStreamOnPort(9, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_Frame(MAC_G1, MAC_S1, CPbits1, CVID2, 0x0800, IGMPQueryChannel5Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(9, 1);
        TrafficGenerator.EnableStreamOnPort(9, 0);
        TrafficGenerator.StartTrafficOnPort(0);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0, 2);
        sleep(1000);
    }
    /// Send IGMP Join Ch6
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    sleep(1000);
    logInfo("");
    logInfo("Sending IGMP Join Channel 6");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID3, 0x0800, IGMPJoinChannel6Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(9, 0);
        TrafficGenerator.EnableStreamOnPort(10, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    sleep(TrafficGenerator.delayAfterSend);
    var RcvdIGMPv3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    sleep(TrafficGenerator.delayAfterSend);
    var TransmittedA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    var TransmittedB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var TransmittedC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    var TransmittedD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var TransmittedE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    var TransmittedF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    logInfo("Transmitted: A:" + TransmittedA + " B:" + TransmittedB + " C:" + TransmittedC);
    logInfo("Transmitted: D:" + TransmittedD + " E:" + TransmittedE + " F:" + TransmittedF);
    /// Check that IGMP Join message is not sent on S/R interface

    var RcvdFilterAC = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdFilterE = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    /// Check if U interface receive Multicast flow 1
    var RcvTID1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var RcvTID2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvTID3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvTID4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    var RcvTID5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var RcvTID6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);
    logInfo("Nb of Multicast Flow Ch1 packets received on Interface U (TID1): " + RcvTID1 + " Packets");
    logInfo("Nb of Multicast Flow Ch2 packets received on Interface U (TID2): " + RcvTID2 + " Packets");
    logInfo("Nb of Multicast Flow Ch3 packets received on Interface U (TID3): " + RcvTID3 + " Packets");
    logInfo("Nb of Multicast Flow Ch4 packets received on Interface U (TID4): " + RcvTID4 + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (TID5): " + RcvTID5 + " Packets");
    logInfo("Nb of Multicast Flow Ch6 packets received on Interface U (TID6): " + RcvTID6 + " Packets");
    logInfo("Nb of Multicast Flow Ch1/Ch3 packets received on Interface U (Filter A/C): " + RcvdFilterAC + " Packets");
    logInfo("Nb of Multicast Flow Ch5 packets received on Interface U (Filter E): " + RcvdFilterE + " Packets");
    logInfo("Nb of IGMP packets received on Interface S/R (Filter IGMP): " + RcvdIGMPv3 + " Packets");
    if (RcvTID6 > 0) {
        verdict = false;
        logError("Multicast flow 6 received on U-Interface");
    } else logInfo("Multicast flow 6 correctly rejected on U-interface");
    if (RcvdIGMPv3) {
        verdict = false;
        logError("IGMP join message received on S/R-interface");
    } else logInfo("IGMP join message correctly rejected on S/R-interface");
    /// Send IGMP Leave Ch6
    logInfo("Sending IGMP Leave Channel 6");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, CPbits1, CVID3, 0x0800, IGMPLeaveChannel6Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(10, 1);
        TrafficGenerator.EnableStreamOnPort(11, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    /// End of test
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}


testPassed();