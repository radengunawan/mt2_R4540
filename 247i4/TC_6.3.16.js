///%%VID and Pbit translation in upstream and downstream for IGMP/MLD and Multicast packets%%
testPassed("VID and Pbit translation in upstream and downstream for IGMP/MLD and Multicast packets");

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");


/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1]);
var CVID3 = RandomIntegerExcept(1, 4094, [CVID1, CVID2]);
var CPbit1 = RandomInteger(0, 7); /// CPbit1 randomly chosen
var CPbit2 = RandomIntegerExcept(0, 7, [CPbit1]);
var CPbit3 = RandomIntegerExcept(0, 7, [CPbit1, CPbit2]);

var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]

var AllocId1 = GEM1;


var IP_G1 = IPv4Address("224.1.1.1");
var IP_S1 = IPv4Address("192.168.2.201");
var IP_G2 = IPv4Address("224.1.1.2");
var IP_S2 = IPv4Address("192.168.2.202");

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address(); // used with IGMPv2
    IP_G2 = IGMP.GetUnusedMcastIPv4Address(); // used with IGMPv3
}

var UsedUnicastMACAddresses = [];

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var IP_IGMP_US_S1 = IPv4Address("10.0.0.1"); ///IP_G1 subscriber
    var IP_IGMP_US_S2 = IPv4Address("10.0.0.2"); ///IP_G2 subscriber
    var IP_S1 = IPv4Address("128.0.0.1");
    var IP_S2 = IPv4Address("128.0.0.2");

    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1); // called MAC3 in the test plan
    UsedUnicastMACAddresses.push(MAC_IGMP_US_S1.ToInt());
    var MAC_IGMP_US_S2 = IP.MACAddressFromIP(IP_IGMP_US_S2); // called MAC4 in the test plan
    UsedUnicastMACAddresses.push(MAC_IGMP_US_S2.ToInt());
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    UsedUnicastMACAddresses.push(MAC_S1.ToInt());
    var MAC_S2 = IP.MACAddressFromIP(IP_S2);
    UsedUnicastMACAddresses.push(MAC_S2.ToInt());
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
}

var MAC1 = IEEE_802_1QAddress(RandomUnicastMACAddressExcept(UsedUnicastMACAddresses)); // note: this is used for the ETHtoPON translation => has to be defined at the begin of the test
UsedUnicastMACAddresses.push(MAC1.ToInt());
var MAC2 = IEEE_802_1QAddress(RandomUnicastMACAddressExcept(UsedUnicastMACAddresses)); // note: this is used for the ETHtoPON translation => has to be defined at the begin of the test
UsedUnicastMACAddresses.push(MAC2.ToInt());


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
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x8100, "DownstreamMode": 0 });

//Set the test specific tag rule												 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbit3,
        FilterInnerVID: CVID3,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: CPbit1,
        TreatInnerVID: CVID1,
        TreatInnerTPID: 6
    }
});

//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, { UpstreamIGMPTCI: (CVID1 | (CPbit1 << 13)) });

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, { UpstreamIGMPTagControl: 2 });

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, { DownstreamIGMPAndMulticastTCI: { Control: 3, TCI: (CVID2 | (CPbit2 << 13)) } });


OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": CVID1,
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
        "GEMPortID": GEM2,
        "VlanID": CVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random values CVID1=" + CVID1);
logInfo("Random value: CPbit1=" + CPbit1);
logInfo("Random values CVID2=" + CVID2);
logInfo("Random value: CPbit2=" + CPbit2);
logInfo("Random values CVID3=" + CVID3);
logInfo("Random value: CPbit3=" + CPbit3);

logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);


addTranslationGponToEth(GEM1);
///Last added has priority
addTranslationEthToGpon(0xffff, 0xff, GEM2); // multicast GEM
addTranslationEthToGponExt2({ macAddressSrc: MAC1.ToArray(), macAddressDst: MAC2.ToArray(), nbTagToCheck: 1, innerVid: CVID1, innerPbit: CPbit1 }, GEM1); // unicast stream only on bidir GEM


if (TrafficGenerator.activateAutomatisation) {

    var verdict = true;

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();


    var IGMPJoin1IPDatagram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));
    var IGMPLeave1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G1));
    var IGMPJoin2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Join(IP_S2, IP_G2));
    var IGMPLeave2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Leave(IP_G2));

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "Join Channel 1", frame: IEEE_802_1Q.Build_Frame(MAC_G1, MAC_IGMP_US_S1, CPbit2, CVID2, 0x0800, IGMPJoin1IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 1", frame: IEEE_802_1Q.Build_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, CPbit2, CVID2, 0x0800, IGMPLeave1IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 2", frame: IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S2, CPbit2, CVID2, 0x0800, IGMPJoin2IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 2", frame: IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S2, CPbit2, CVID2, 0x0800, IGMPLeave2IPDatagram) });

    var IGMPGlobalQuery1 = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_SYSTEMS(), IP_S1, 0x02, IGMP.Build_GeneralQuery());
    var IGMPGlobalQuery2 = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_SYSTEMS(), IP_S2, 0x02, IGMP.Build_GeneralQuery());

    var downstreamFlows = []; ///used only to test query: fill up with dummys for the first 3 flows
    downstreamFlows.push({ name: "Channel 1" });
    downstreamFlows.push({ name: "Channel 2" });
    downstreamFlows.push({ name: "Stream B" });
    downstreamFlows.push({ name: "Global Query from IP-S1", frame: IEEE_802_1Q.Build_Frame(IGMP.MAC_ALL_SYSTEMS(), MAC_S1, CPbit1, CVID1, 0x0800, IGMPGlobalQuery1) });
    downstreamFlows.push({ name: "Global Query from IP-S2", frame: IEEE_802_1Q.Build_Frame(IGMP.MAC_ALL_SYSTEMS(), MAC_S2, CPbit1, CVID1, 0x0800, IGMPGlobalQuery2) });


    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.16", [
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<CVID3>", CVID3, 3],
        ["<MAC1>", MAC1],
        ["<MAC2>", MAC2],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_S1>", MAC_S1],
        ["<MAC_S2>", MAC_S2],
        ["<MAC_IGMP_ALL_SYSTEMS>", IGMP.MAC_ALL_SYSTEMS()],
        ["<MAC_IGMP_ALL_ROUTERS>", IGMP.MAC_ALL_ROUTERS()],
        ["<MAC_IGMP_V3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_IGMP_US_S2>", MAC_IGMP_US_S2],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_S1>", IP_S1],
        ["<IP_S2>", IP_S2],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPLeave1_IPDATAGRAM>", IGMPLeave1IPDatagram],
        ["<IGMPJoin2_IPDATAGRAM>", IGMPJoin2IPDatagram],
        ["<IGMPLeave2_IPDATAGRAM>", IGMPLeave2IPDatagram],
        ["<IGMPQuery1_IPDATAGRAM>", IGMPGlobalQuery1],
        ["<IGMPQuery2_IPDATAGRAM>", IGMPGlobalQuery2]

    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeTraffic);

    logInfo("################################");
    logInfo("################################");
    testPassed("Step 10. Cause the Traffic Generator to transmit unicast traffic");
    TrafficGenerator.EnableStreamOnPort(3, 0); ///stream B
    TrafficGenerator.EnableStreamOnPort(5, 1); ///stream A
    TrafficGenerator.StartTrafficOnPort(0);
    TrafficGenerator.StartTrafficOnPort(1);
    sleep(10000);
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.StopTrafficOnPort(1);

    sleep(TrafficGenerator.delayAfterTraffic);

    var RcvdCorrectDsUnicast = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2);
    var RcvdStreamB = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var RcvdAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);

    logInfo("Correct Downstream Unicast Received: " + RcvdCorrectDsUnicast);
    logInfo("Flow B Received  at U interface: " + RcvdStreamB);
    logInfo("Received At U interface: " + RcvdAtU);
    if ((RcvdCorrectDsUnicast == 0) || (RcvdCorrectDsUnicast != RcvdStreamB)) {
        logError("Pass/Fail 3: Downstream Unicast is not correctly tagged");
        verdict = false;
    }

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Downstream unicast criteria are not respected");
    }

    var RcvdCorrectUs = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 2);
    var RcvdStreamA = TrafficGenerator.GetReceivedStatsOnPortAndTID(0, 4);
    var RcvdAtSR = TrafficGenerator.GetTotalReceiveStatsOnPort(0);

    logInfo("Correct Upstream Received: " + RcvdCorrectUs);
    logInfo("Flow A Received at S/R interface: " + RcvdStreamA);
    logInfo("Received At S/R interface: " + RcvdAtSR);
    if ((RcvdCorrectUs == 0) || (RcvdCorrectUs != RcvdStreamA)) {
        logError("Pass/Fail 4: Upstream Unicast is not correctly tagged");
        verdict = false;
    }

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Upstream unicast criteria are not respected");
    }

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    logInfo("################################");
    logInfo("################################");
    testPassed("Step 12. Cause the traffic generator to transmit multicast traffic");

    var verdict = TrafficGenerator.TestDownstreamFlows([false /* Channel 1 */ , false /* Channel 2 */ , true /* Unicast */ ]);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Downstream channels criteria are not respected");
    }


    logInfo("################################");
    logInfo("################################");
    testPassed("Step 13. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch1");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 1 not received (OR not in the correct format) at step 13");
    }

    sleep(2000);

    var verdict = TrafficGenerator.TestDownstreamFlows([true /* Channel 1 */ , false /* Channel 2 */ , true /* Unicast */ ]);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Downstream channels criteria are not respected");
    }


    logInfo("################################");
    logInfo("################################");
    logInfo("Step 14. Cause the traffic generator to send one IGMP global/general query message to the multicast GEM port with CVID1 and CPbit1 from IP-S1");

    var verdict = TrafficGenerator.TestSingleDownstreamFlow(4, 1, downstreamFlows, 3);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("IGMP (General Query) message from IP-S1 not received (OR not in the correct format) at step 14");
    }


    logInfo("################################");
    logInfo("################################");
    testPassed("Step 15. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch1");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 1 not received (OR not in the correct format) at step 15");
    }


    logInfo("################################");
    logInfo("################################");
    logInfo("Step 16. Cause the traffic generator to send one IGMP global/general query message to the unicast GEM port GEM1 with CVID1 and CPbit1 from IP-S1.");

    ///Send global queries from MAC_S1 to unicast: must update translation rules

    ///Last added has priority
    addTranslationEthToGponExt2({ macAddressSrc: MAC_S1.ToArray(), macAddressDst: IGMP.MAC_ALL_SYSTEMS().ToArray(), nbTagToCheck: 1, innerVid: CVID1, innerPbit: CPbit1 }, GEM1); // DS Query 1 added on bidir GEM

    var verdict = TrafficGenerator.TestSingleDownstreamFlow(4, 1, downstreamFlows, 3);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("IGMP (General Query) message from IP-S1 not received (OR not in the correct format) at step 16");
    }


    logInfo("################################");
    logInfo("################################");
    testPassed("Step 17. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch1");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(1, 2, upstreamFlows, 0);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 1 not received (OR not in the correct format) at step 17");
    }

    logInfo("################################");
    logInfo("################################");
    testPassed("Step 18. At the U-interface, cause the traffic generator to transmit IGMP messages to leave channel Ch1");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(2, 2, upstreamFlows, 3);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Leave Channel 1 not received (OR not in the correct format) at step 18");
    }


    // No modification on translation rules to do.


    TrafficGenerator.StartTrafficOnPort(0);

    logInfo("################################");
    logInfo("################################");
    testPassed("Step 19. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch2");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 2 not received (OR not in the correct format) at step 19");
    }

    sleep(2000);

    var verdict = TrafficGenerator.TestDownstreamFlows([false /* Channel 1 */ , true /* Channel 2 */ , true /* Unicast */ ]);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Downstream channels criteria are not respected");
    }

    logInfo("################################");
    logInfo("################################");
    logInfo("Step 20. Cause the traffic generator to send one IGMP global/general query message to the multicast GEM port with CVID1 and CPbit1 from IP-S2");

    var verdict = TrafficGenerator.TestSingleDownstreamFlow(5, 1, downstreamFlows, 3);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("IGMP (General Query) message from IP-S2 not received (OR not in the correct format) at step 20");
    }


    logInfo("################################");
    logInfo("################################");
    testPassed("Step 21. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch2");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 2 not received (OR not in the correct format) at step 21");
    }

    logInfo("################################");
    logInfo("################################");
    logInfo("Step 22. Cause the traffic generator to send one IGMP global/general query message to the unicast GEM port GEM1 with CVID1 and CPbit1 for IP-G2.");

    ///Send global queries from MAC_S2 to unicast: must update translation rules

    ///Last added has priority
    addTranslationEthToGponExt2({ macAddressSrc: MAC_S2.ToArray(), macAddressDst: IGMP.MAC_ALL_SYSTEMS().ToArray(), nbTagToCheck: 1, innerVid: CVID1, innerPbit: CPbit1 }, GEM1); // DS Query 2 added on bidir GEM


    var verdict = TrafficGenerator.TestSingleDownstreamFlow(5, 1, downstreamFlows, 3);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("IGMP (General Query) message from IP-S2 not received (OR not in the correct format) at step 22");
    }



    logInfo("################################");
    logInfo("################################");
    testPassed("Step 23. At the U-interface, cause the traffic generator to transmit IGMP messages to join channel Ch2");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(3, 2, upstreamFlows, 1);

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Join Channel 2 not received (OR not in the correct format) at step 23");
    }


    logInfo("################################");
    logInfo("################################");
    testPassed("Step 24. At the U-interface, cause the traffic generator to transmit IGMP messages to leave channel Ch2");
    var verdict = TrafficGenerator.TestSingleUpstreamFlow(4, 2, upstreamFlows, 1);

    TrafficGenerator.Disconnect();
    if (!verdict) {
        testFailed("Leave Channel 2 not received (OR not in the correct format) at step 24");
    }


    testPassedWithTraffic();


}


testPassed();