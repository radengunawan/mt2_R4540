// Maximum Multicast Bandwidth Modification
testPassed("Maximum Multicast Bandwidth Modification");

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7); /// SPbit1 randomly chosen
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095); /// GEM2 randomly chosen in range [256..4094]
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]

var AllocId1 = GEM1;

var IP_S1 = IPv4Address("128.0.0.32");
var IP_G1 = IPv4Address("224.1.1.2");
var IP_G2 = IPv4Address("224.1.1.3");

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    IP_G2 = IGMP.GetUnusedMcastIPv4Address();
}

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var IP_IGMP_US_S1 = IPv4Address("10.0.0.1");
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
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



///Step 7. Cause the OLT Emulator to configure the dynamic access list control table of the Multicast Operations Profile ME at the ONU (table index IND1 & IND2)

testPassed("Step 7. Cause the OLT Emulator to configure the dynamic access list control table of the Multicast Operations Profile ME at the ONU (table index IND1 & IND2)");

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 512000,
        "Reserved": 0
    }
});

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + 1,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 512000,
        "Reserved": 0
    }
});




///Step 8. Cause the OLT Emulator to specify to 1024 kbytes per second the maximum multicast bandwidth that may be delivered at the ONU and to configure the bandwidth enforcement attribute with the value true

testPassed("Step 8. Cause the OLT Emulator to specify to 1024 kbytes per second the maximum multicast bandwidth that may be delivered at the ONU and to configure the bandwidth enforcement attribute with the value true");

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1, "MaxMulticastBandwidth": 1024000, "BandwidthEnforce": 1 });

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
    var IGMPLeave1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G1));
    var IGMPLeave2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G2));

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "Join Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G2, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin2IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave2IPDatagram) });

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.19", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_IGMP_ALL_ROUTERS>", IGMP.MAC_ALL_ROUTERS()],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_S1>", MAC_S1],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPJoin2_IPDATAGRAM>", IGMPJoin2IPDatagram],
        ["<IGMPLeave1_IPDATAGRAM>", IGMPLeave1IPDatagram],
        ["<IGMPLeave2_IPDATAGRAM>", IGMPLeave2IPDatagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    testPassed("Send IGMP frames");

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, false]);
    verdict = verdict && localVerdict;




    ///Step 9. At the U-interface send IGMP messages to join channels Ch1 and Ch2          (MAX CH is 2 => OK)

    testPassed("Step 9. At the U-interface send IGMP messages to join channels Ch1 and Ch2");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);
    verdict = localVerdict && verdict;
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, true]);
    verdict = verdict && localVerdict;




    ///Step 10. At the U-interface send IGMP messages to leave channels Ch1 and Ch2

    testPassed("Step 10. At the U-interface send IGMP messages to leave channels Ch1 and Ch2");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(2, 2, upstreamFlows, 2);
    verdict = localVerdict && verdict;
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(4, 2, upstreamFlows, 2);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, false]);
    verdict = verdict && localVerdict;
} else {
    popup("Traffic Configuration", "Send a Join for Channel 1 & 2 and wait till it has taken effecr, then start sending downstream flows 1 & 2");
    if (0 == popup("Question", "Is Multicast flow 1 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 1 not received at U interface");
    if (0 == popup("Question", "Is Multicast flow 2 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 2 not received at U interface");
    popup("Traffic Configuration", "Send a Leave for Channel 1 & 2 and wait till it has taken effecr, then start sending downstream flows 1 & 2");
    if (0 != popup("Question", "Is Multicast flow 1 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 1 received at U interface");
    if (0 != popup("Question", "Is Multicast flow 2 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 2 received at U interface");
}




///Step 11.Cause the OLT emulator to specify to 512 kbytes per second the maximum multicast bandwidth that may be delivered at the ONU

testPassed("Step 11.Cause the OLT emulator to specify to 512 kbytes per second the maximum multicast bandwidth that may be delivered at the ONU");

OMCI.Set(OMCC, "Multicast_Subsc_Config_Info", BPCD3, { "MaxMulticastBandwidth": 512000 });

sleep(TrafficGenerator.delayBeforeTraffic);

if (TrafficGenerator.activateAutomatisation) {
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);




    ///Step 12: At the U-interface send IGMP message to join channel Ch1          (MAX CH is 1 => OK)

    testPassed("Step 12: At the U-interface send IGMP message to join channel Ch1");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, false]);
    verdict = verdict && localVerdict;




    ///Step 13. At the U-interface send IGMP message to join channel Ch2          (MAX CH is 1 => KO)

    testPassed("Step 13. At the U-interface send IGMP message to join channel Ch2");

    ///Sending join 2: should fail
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1, true, true);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, false]);
    verdict = verdict && localVerdict;




    ///Step 14. At the U-interface send IGMP messages to leave channel Ch1 and Ch2

    testPassed("Step 14. At the U-interface send IGMP messages to leave channel Ch1 and Ch2");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(2, 2, upstreamFlows, 2);
    verdict = localVerdict && verdict;
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(4, 2, upstreamFlows, 2, true, true);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, false]);
    verdict = verdict && localVerdict;

    ///Now swap channel 1 & 2




    ///Step 15. At the U-interface send IGMP message to join channel Ch2          (MAX CH is 1 => OK)

    testPassed("Step 15. At the U-interface send IGMP message to join channel Ch2");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, true]);
    verdict = verdict && localVerdict;




    ///Step 16. At the U-interface send IGMP message to join channel Ch1          (MAX CH is 1 => KO)

    testPassed("Step 16. At the U-interface send IGMP message to join channel Ch1");

    ///Sending join 1: should fail
    ///sending IGMP join channel 1
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0, true, true);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, true]);
    verdict = verdict && localVerdict;




    ///Step 17. At the U-interface send IGMP messages to leave channels Ch1 and Ch2

    testPassed("Step 17. At the U-interface send IGMP messages to leave channels Ch1 and Ch2");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(2, 2, upstreamFlows, 2, true, true);
    verdict = localVerdict && verdict;
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(4, 2, upstreamFlows, 2);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, false]);
    verdict = verdict && localVerdict;
} else {
    popup("Traffic Configuration", "Check that only 1 traffic class can be joined");
}




///Step 18. Cause the OLT emulator to specify to value 2 the maximum number of dynamic multicast groups that may be replicated at the ONU

testPassed("Step 18. Cause the OLT emulator to specify to value 2 the maximum number of dynamic multicast groups that may be replicated at the ONU");

OMCI.Set(OMCC, "Multicast_Subsc_Config_Info", BPCD3, { "MaxMulticastBandwidth": 1024000 });


sleep(TrafficGenerator.delayBeforeTraffic);

if (TrafficGenerator.activateAutomatisation) {



    ///Step 19. At the U-interface send IGMP messages to join channels Ch1 and Ch2          (MAX CH is 2 => OK)

    testPassed("Step 19. At the U-interface send IGMP messages to join channels Ch1 and Ch2");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);
    verdict = localVerdict && verdict;
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);
    verdict = localVerdict && verdict;

    sleep(2000);

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, true]);
    verdict = verdict && localVerdict;

    TrafficGenerator.Disconnect();

    if (verdict)
        testPassedWithTraffic();
    else
        testFailed("Error in the treatment of multicast streams")
} else {
    popup("Traffic Configuration", "Send a Join for Channel 1 & 2 and wait till it has taken effecr, then start sending downstream flows 1 & 2");
    if (0 == popup("Question", "Is Multicast flow 1 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 1 not received at U interface");
    if (0 == popup("Question", "Is Multicast flow 2 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 2 not received at U interface");
    popup("Traffic Configuration", "Send a Leave for Channel 1 & 2 and wait till it has taken effecr, then start sending downstream flows 1 & 2");
    if (0 != popup("Question", "Is Multicast flow 1 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 1 received at U interface");
    if (0 != popup("Question", "Is Multicast flow 2 received at U interface?", "YesNo"))
        testFailed("Multicast Channel 2 received at U interface");
}
testPassed();