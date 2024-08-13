include("Config.js");

//Test case 6.3.6 IGMP Controlled Multicast

/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var VID2 = RandomIntegerExcept(1, 4094, [VID1]); /// VID2 randomly chosen in range [1..4094]
var VID3 = RandomIntegerExcept(1, 4094, [VID1, VID2]); /// VID3 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095); /// MGEM randomly chosen in range [256..4094]
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var Pbit1 = RandomInteger(0, 7); /// Pbit1 randomly chosen

var IP_G1 = IPv4Address("224.1.1.2");
var IP_S2 = IPv4Address("192.168.1.200");
var IP_G2 = IPv4Address("224.1.1.3");

/// Use other IP values when TrafficGenerator automatisation is activated
if (UtilsParameters.IGMPRandomisation) {
    var IP_S2 = IPv4Address(RandomIPv4Address());
    var IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    var IP_G2 = IGMP.GetUnusedMcastIPv4Address();
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
        "TableIndex": 0x4000,
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
        "TableIndex": 0x4001,
        "GEMPortID": MGEM,
        "VlanID": VID2,
        "SourceIPAddr": IP_S2.ToString(),
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random values VID1=" + VID1 + " ; VID2=" + VID2 + " ; VID3=" + VID3);
logInfo("Random value: Pbit1=" + Pbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM=" + MGEM);


addTranslationGponToEth(GEM1);
addTranslationEthToGpon(VID1, 0xff, MGEM);
addTranslationEthToGpon(VID2, 0xff, MGEM);
addTranslationEthToGpon(VID3, 0xff, GEM1);

if (TrafficGenerator.activateAutomatisation) {
    var verdict = true;

    var IP_S1 = IPv4Address("128.0.0.10");
    var IP_UNICAST_DS_S3 = IPv4Address("128.0.0.11");
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.120");
    var IP_IGMP_US_S2 = IPv4Address("128.0.0.6");
    var IP_UNICAST_US_S3 = IPv4Address("128.0.0.7");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S2.ToString()
            ]));
        IP_UNICAST_DS_S3 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S1.ToString(),
                IP_S2.ToString()
            ]));
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S1.ToString(),
                IP_S2.ToString(),
                IP_UNICAST_DS_S3.ToString()
            ]));
        IP_IGMP_US_S2 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S1.ToString(),
                IP_S2.ToString(),
                IP_UNICAST_DS_S3.ToString(),
                IP_IGMP_US_S1.ToString()
            ]));
        IP_UNICAST_US_S3 = IPv4Address(RandomIPv4AddressExcept(
            [
                IP_S1.ToString(),
                IP_S2.ToString(),
                IP_UNICAST_DS_S3.ToString(),
                IP_IGMP_US_S1.ToString(),
                IP_IGMP_US_S2.ToString()
            ]));
    }

    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_S2 = IP.MACAddressFromIP(IP_S2);
    var MAC_UNICAST_US_S3 = IP.MACAddressFromIP(IP_UNICAST_US_S3);
    var MAC_UNICAST_DS_S3 = IP.MACAddressFromIP(IP_UNICAST_DS_S3);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_IGMP_US_S2 = IP.MACAddressFromIP(IP_IGMP_US_S2);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);

    var IGMPJoinChannel1Datagram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));
    var IGMPLeaveChannel1Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G1));
    var IGMPJoinChannel2Datagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Join(IP_S2, IP_G2))

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.6", [
        ["<Pbits1>", Pbit1 << 1, 1],
        ["<VID1>", VID1, 3],
        ["<VID2>", VID2, 3],
        ["<VID3>", VID3, 3],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_IGMP_US_S2>", MAC_IGMP_US_S2],
        ["<MAC_UNICAST_US_S3>", MAC_UNICAST_US_S3],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_S1>", MAC_S1],
        ["<MAC_S2>", MAC_S2],
        ["<MAC_UNICAST_DS_S3>", MAC_UNICAST_DS_S3],
        ["<IP_G1>", IP_G1],
        ["<IP_S1>", IP_S1],
        ["<IP_G2>", IP_G2],
        ["<IP_S2>", IP_S2],
        ["<IGMPJoinChannel1Datagram>", IGMPJoinChannel1Datagram],
        ["<IGMPLeaveChannel1Datagram>", IGMPLeaveChannel1Datagram],
        ["<IGMPJoinChannel2Datagram>", IGMPJoinChannel2Datagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    testPassed("Send IGMP frames");

    /// Start all downstream multicast stream
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(0, 1);
    logInfo("Sending multicast streams")
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);

    testPassed("Sending Join channel 1 message on U-interface");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(MAC_G1, MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinChannel1Datagram), 2);
        sleep(2000);
    } else {
        ///sending of frame IGMP join1
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Check if the frame has been received
    TrafficGenerator.StopTrafficOnPort(0);
    var RcvdIGMPJoin1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 3);
    var RcvdStreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    logInfo("Correct IGMP Frame Join to StreamA received:" + RcvdIGMPJoin1);
    logInfo("Frames from StreamA received:" + RcvdStreamA);

    if ((RcvdIGMPJoin1 > 0) && (RcvdStreamA > 0)) { logInfo("IGMP frame and stream A correctly received ");; } else if ((RcvdIGMPJoin1 > 0) && (RcvdStreamA == 0)) {
        verdict = false;
        logError("IGMP frame correctly received  but no streamA frame received");
    } else if ((RcvdIGMPJoin1 == 0) && (RcvdIGMP > 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received ");
    } else {
        verdict = false;
        logError("No IGMP frame received ");
    }

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    testPassed("Sending Leave channel 1 message on U-interface");

    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPLeaveChannel1Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(3, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

	TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    testPassed("Sending Join channel 2 message on U-interface");

    TrafficGenerator.StartTrafficOnPort(0);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S2, Pbit1, VID2, 0x0800, IGMPJoinChannel2Datagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(3, 1);
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the frame has been received
    var RcvdIGMPJoin2 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 1);
    var RcvdIGMP = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 3);
    var RcvdStreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Correct IGMP Frame Join to StreamB received:" + RcvdIGMPJoin2);
    logInfo("Frames from StreamB received:" + RcvdStreamB);

    if ((RcvdIGMPJoin2 > 0) && (RcvdStreamB > 0)) { logInfo("IGMP frame and stream B correctly received");; } else if ((RcvdIGMPJoin2 > 0) && (RcvdStreamB == 0)) {
        verdict = false;
        logError("IGMP frame correctly received but no streamB frame received");
    } else if ((RcvdIGMPJoin2 == 0) && (RcvdIGMP > 0)) {
        verdict = false;
        logError("Incorrect IGMP frame received ");
    } else {
        verdict = false;
        logError("No IGMP frame received ");
    }

    TrafficGenerator.ClearReceiveStatsOnPort(1);

    testPassed("Sending unicast flows  on U-interface and on V-interface");

    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(0, 1);
    TrafficGenerator.DisableStreamOnPort(1, 1);
    TrafficGenerator.DisableStreamOnPort(2, 1);
    TrafficGenerator.DisableStreamOnPort(3, 1);
    TrafficGenerator.SetBitRateForStream(1, 0, 2000000);
    TrafficGenerator.StartTrafficOnPort(0);
    TrafficGenerator.StartTrafficOnPort(1);

    /// Wait for frame to travel
    sleep(5000);
    TrafficGenerator.StopTrafficOnPort(1);
    TrafficGenerator.StopTrafficOnPort(0);

    /// Check if the frame has been received
    var RcvdFrameSetC = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvdFrameSetD = TrafficGenerator.GetReceivedStatsOnPortAndTID(0, 4);
    var RcvdStreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    var RcvdStreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    logInfo("Frames C received: " + RcvdFrameSetC);
    logInfo("Frames D received: " + RcvdFrameSetD);
    logInfo("Frames from StreamB received: " + RcvdStreamB);
    if (RcvdStreamA > 0) ///Frames from stream A may be received, as Leave is not immediate
        logWarning("Frames from Stream A received after Leave: " + RcvdStreamA);

    if ((RcvdFrameSetC > 0) && (RcvdFrameSetD > 0) && (RcvdStreamB > 0)) { logInfo("Frame C and D,and stream B correctly received ");; } else if (RcvdFrameSetC == 0) {
        verdict = false;
        logError("Frame C not received");
    } else if (RcvdFrameSetD == 0) {
        verdict = false;
        logError("Frame D not received");
    } else {
        verdict = false;
        logError("Stream B not received ");
    }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}

testPassed();