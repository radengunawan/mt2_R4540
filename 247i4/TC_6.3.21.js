// Whole Multicast Range Learning

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

function testChannel(channelIdx, joinDatagram, leaveDatagram) {
    var verdict = true;
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeTraffic);

    logInfo("Testing channel " + channelIdx);
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, joinDatagram, 2);
        sleep(2000);
    } else {

        ///sending of frame IGMP join
        for (var i = 0; i < 5; i++) {
            TrafficGenerator.DisableStreamOnPort((i * 2) + 1, 1); ///joins
            TrafficGenerator.DisableStreamOnPort((i * 2) + 2, 1); ///leaves
        }
        TrafficGenerator.EnableStreamOnPort((channelIdx * 2) - 1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    for (var i = 0; i < 5; i++) {
        TrafficGenerator.EnableStreamOnPort(i + 1, 0);
    }
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(5000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    /// Check if the frame has been received
    var RcvdIGMPJoin = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, channelIdx - 1);
    if (RcvdIGMPJoin == 0) {
        verdict = false;
        logError("No IGMP Join (channel " + channelIdx + " received at S/R interface");
    } else {
        logInfo("Join Channel " + channelIdx + " received at  S/R interface");
    }

    var rxAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
    logInfo("Rx " + rxAtU + " frames at U interface");

    var rxCh1AtU = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    logInfo("Rx " + rxCh1AtU + " channel 1 frames at U interface");
    var rxCh2AtU = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);
    logInfo("Rx " + rxCh2AtU + " channel 2 frames at U interface");
    var rxCh3AtU = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    logInfo("Rx " + rxCh3AtU + " channel 3 frames at U interface");
    var rxCh4AtU = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);
    logInfo("Rx " + rxCh4AtU + " channel 4 frames at U interface");
    var rxCh5AtU = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    logInfo("Rx " + rxCh5AtU + " channel 5 frames at U interface");

    var RcvdMCastChannel = [];
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 4));

    for (var i = 0; i < 5; i++) {
        logInfo("Channel " + (i + 1) + " Mcast received at U interface: " + RcvdMCastChannel[i]);
        if (i != (channelIdx - 1)) {
            if (RcvdMCastChannel[i] != 0) {
                verdict = false;
                logError("Channel " + (i + 1) + " Multicast received at U interface");
            }
        } else if (RcvdMCastChannel[i] == 0) {
            verdict = false;
            logError("No Channel " + channelIdx + " Multicast received at U interface");
        }
    }

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    logInfo("Send IGMP messages to leave channels Ch" + channelIdx);
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, leaveDatagram, 2);
        sleep(2000);
    } else {

        ///sending of frame IGMP Leave
        for (var i = 0; i < 5; i++) {
            TrafficGenerator.DisableStreamOnPort((i * 2) + 1, 1); ///joins
            TrafficGenerator.DisableStreamOnPort((i * 2) + 2, 1); ///leaves
        }
        TrafficGenerator.EnableStreamOnPort(channelIdx * 2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    /// Check if the frame has been received
    var RcvdIGMPLeave = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 5);
    if (RcvdIGMPLeave == 0) {
        verdict = false;
        logError("No IGMP Leave (channel " + channelIdx + " received at S/R interface");
    } else {
        logInfo("Leave Channel " + channelIdx + " received at  S/R interface");
    }

    sleep(IGMP.LEAVE_DELAY());

    TrafficGenerator.StartTrafficOnPort(0);

    sleep(5000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var RcvdMCastChannel = []
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3));
    RcvdMCastChannel.push(TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 4));

    for (var i = 0; i < 5; i++) {
        if (RcvdMCastChannel[i] != 0) {
            verdict = false;
            logError("Channel " + (i + 1) + " Multicast received at U interface");
        }
    }
    return verdict;
}

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7); /// SPbit1 randomly chosen
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095); /// GEM2 randomly chosen in range [256..4094]
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]

var AllocId1 = GEM1;

var IP_S1 = IPv4Address("128.0.0.32");
var IP_G1 = IPv4Address("224.0.1.0");
var IP_G2 = IPv4Address(IP_G1.ToInt() + 200);
var IP_G3 = IPv4Address(IP_G1.ToInt() + 400);
var IP_G4 = IPv4Address(IP_G1.ToInt() + 600);
var IP_G5 = IPv4Address("239.255.255.255");

if (UtilsParameters.IGMPRandomisation) {
    IP_G2 = IGMP.GetUnusedMcastIPv4Address(); /// is this enough in terms of range ?
    IP_G3 = IGMP.GetUnusedMcastIPv4Address();
    IP_G4 = IGMP.GetUnusedMcastIPv4Address();
}

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var IP_IGMP_US_S1 = IPv4Address("10.0.0.1");
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
    var MAC_G3 = IGMP.GroupMACAddressFromIP(IP_G3);
    var MAC_G4 = IGMP.GroupMACAddressFromIP(IP_G4);
    var MAC_G5 = IGMP.GroupMACAddressFromIP(IP_G5);
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

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random values SVID1=" + SVID1);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

addTranslationGponToEth(GEM1);
addTranslationEthToGpon(SVID1, 0xff, GEM2);


if (TrafficGenerator.activateAutomatisation) {

    var verdict = true;

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var IGMPJoin1IPDatagram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));
    var IGMPJoin2IPDatagram = IP.Build_Frame_RouterAlert(IP_G2, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G2));
    var IGMPJoin3IPDatagram = IP.Build_Frame_RouterAlert(IP_G3, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G3));
    var IGMPJoin4IPDatagram = IP.Build_Frame_RouterAlert(IP_G4, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G4));
    var IGMPJoin5IPDatagram = IP.Build_Frame_RouterAlert(IP_G5, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G5));
    var IGMPLeave1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G1));
    var IGMPLeave2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G2));
    var IGMPLeave3IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G3));
    var IGMPLeave4IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G4));
    var IGMPLeave5IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G5));

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.21", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_IGMP_ALL_ROUTERS>", IGMP.MAC_ALL_ROUTERS()],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_G3>", MAC_G3],
        ["<MAC_G4>", MAC_G4],
        ["<MAC_G5>", MAC_G5],
        ["<MAC_S1>", MAC_S1],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_G3>", IP_G3],
        ["<IP_G4>", IP_G4],
        ["<IP_G5>", IP_G5],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPJoin2_IPDATAGRAM>", IGMPJoin2IPDatagram],
        ["<IGMPJoin3_IPDATAGRAM>", IGMPJoin3IPDatagram],
        ["<IGMPJoin4_IPDATAGRAM>", IGMPJoin4IPDatagram],
        ["<IGMPJoin5_IPDATAGRAM>", IGMPJoin5IPDatagram],
        ["<IGMPLeave1_IPDATAGRAM>", IGMPLeave1IPDatagram],
        ["<IGMPLeave2_IPDATAGRAM>", IGMPLeave2IPDatagram],
        ["<IGMPLeave3_IPDATAGRAM>", IGMPLeave3IPDatagram],
        ["<IGMPLeave4_IPDATAGRAM>", IGMPLeave4IPDatagram],
        ["<IGMPLeave5_IPDATAGRAM>", IGMPLeave5IPDatagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    testPassed("Send IGMP frames");

    /// Start all downstream multicast stream
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);
    TrafficGenerator.EnableStreamOnPort(5, 0);
    logInfo("Sending multicast streams")
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(5000);

    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    var RcvdMCastChannel1 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdMCastChannel2 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 1);
    var RcvdMCastChannel3 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2);
    var RcvdMCastChannel4 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3);
    var RcvdMCastChannel5 = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 4);

    if (RcvdMCastChannel1 > 0) {
        verdict = false;
        logError("Channel 1 multicast received at U interface when it should be discarded");
    }
    if (RcvdMCastChannel2 > 0) {
        verdict = false;
        logError("Channel 2 multicast received at U interface when it should be discarded");
    }
    if (RcvdMCastChannel3 > 0) {
        verdict = false;
        logError("Channel 3 multicast received at U interface when it should be discarded");
    }
    if (RcvdMCastChannel4 > 0) {
        verdict = false;
        logError("Channel 4 multicast received at U interface when it should be discarded");
    }
    if (RcvdMCastChannel5 > 0) {
        verdict = false;
        logError("Channel 2 multicast received at U interface when it should be discarded");
    }

    verdict = testChannel(1, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram), IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram)) && verdict;
    verdict = testChannel(2, IEEE_802_1Q.Build_STag_Frame(MAC_G2, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin2IPDatagram), IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave2IPDatagram)) && verdict;
    verdict = testChannel(3, IEEE_802_1Q.Build_STag_Frame(MAC_G3, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin3IPDatagram), IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave3IPDatagram)) && verdict;
    verdict = testChannel(4, IEEE_802_1Q.Build_STag_Frame(MAC_G4, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin4IPDatagram), IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave4IPDatagram)) && verdict;
    verdict = testChannel(5, IEEE_802_1Q.Build_STag_Frame(MAC_G5, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin5IPDatagram), IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave5IPDatagram)) && verdict;

    TrafficGenerator.Disconnect();

    if (verdict)
        testPassedWithTraffic();
    else
        testFailed("Error in the treatment of multicast streams")
}


testPassed();