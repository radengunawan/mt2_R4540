//Test Case on Maximum Multicast Bandwidth
testPassed("Maximum Multicast Bandwidth");

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");


/// Initialize Variables
var MCastBandwidthUpdateLatency = 15000; //in msecs
var numberOfIGMPMessages = 2;
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7); /// SPbit1 randomly chosen
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095); /// GEM2 randomly chosen in range [256..4094]
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]

var AllocId1 = GEM1;

var IP_G1 = IPv4Address("224.1.1.2");
var IP_S1 = IPv4Address("192.168.2.200");
var IP_G2 = IPv4Address("224.1.1.3");
var IP_G3 = IPv4Address("224.1.1.4");

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    IP_G2 = IGMP.GetUnusedMcastIPv4Address();
    IP_G3 = IGMP.GetUnusedMcastIPv4Address();
}

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var IP_IGMP_US_S1 = IPv4Address("10.0.0.1");
    ///MACs are only used in automated mode
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_G2 = IGMP.GroupMACAddressFromIP(IP_G2);
    var MAC_G3 = IGMP.GroupMACAddressFromIP(IP_G3);
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
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x88a8, OutputTPID: 0x88a8, "DownstreamMode": 0 });


//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
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
        "TableIndex": 0x4001,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G2.ToString(),
        "DestIPAddrEnd": IP_G2.ToString(),
        "ImputedGroupBandwidth": 512000,
        "Reserved": 0
    }
});

OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000 + 2,
        "GEMPortID": GEM2,
        "VlanID": SVID1,
        "SourceIPAddr": "0.0.0.0",
        "DestIPAddrStart": IP_G3.ToString(),
        "DestIPAddrEnd": IP_G3.ToString(),
        "ImputedGroupBandwidth": 768000,
        "Reserved": 0
    }
});


var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

testPassed("OMCI Configuration completed (step 6)");

OMCI.Set(OMCC, "Multicast_Subsc_Config_Info", MSCI1, { "MaxMulticastBandwidth": 1024000, "BandwidthEnforce": 1 });

testPassed("MaxMulticastBandwidth set to 1024000 (step 7)");

var MSM1 = OMCI.Create(OMCC, "Multicast_Subsc_Monitor", { "meid": BPCD3, "MEtype": 0 });

testPassed("Step 8. Multicast Subscription Monitor created");
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

    var IGMPJoin1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPJoin2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Join(IP_S1, IP_G2));
    var IGMPJoin3IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Join(IP_S1, IP_G3));
    var IGMPLeave1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Leave(IP_G1));
    var IGMPLeave2IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), "0.0.0.0", 0x02, IGMP.Build_Leave(IP_G2));
    var IGMPQuery1IPDatagram = IP.Build_Frame_RouterAlert(IP_G1, IP_S1, 0x02, IGMP.Build_Query(IP_G1));
    var IGMPQuery2IPDatagram = IP.Build_Frame_RouterAlert(IP_G2, IP_S1, 0x02, IGMP.Build_Query(IP_G2));

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "Join Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin2IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave2IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 3", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin3IPDatagram) });

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.15", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_G2>", MAC_G2],
        ["<MAC_G3>", MAC_G3],
        ["<MAC_S1>", MAC_S1],
        ["<IP_G1>", IP_G1],
        ["<IP_G2>", IP_G2],
        ["<IP_G3>", IP_G3],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPJoin2_IPDATAGRAM>", IGMPJoin2IPDatagram],
        ["<IGMPJoin3_IPDATAGRAM>", IGMPJoin3IPDatagram],
        ["<IGMPLeave1_IPDATAGRAM>", IGMPLeave1IPDatagram],
        ["<IGMPLeave2_IPDATAGRAM>", IGMPLeave2IPDatagram],
        ["<IGMPQuery1_IPDATAGRAM>", IGMPQuery1IPDatagram],
        ["<IGMPQuery2_IPDATAGRAM>", IGMPQuery2IPDatagram]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    testPassed("Step 10. Sending join for channel 1");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, numberOfIGMPMessages, upstreamFlows, 0);
    verdict = localVerdict & verdict;

    localVerdict = TrafficGenerator.TestDownstreamFlows([true, false, false]);
    verdict = localVerdict & verdict;

    ///sending IGMP join channel 2
    testPassed("Step 11. Sending join for channel 2");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(3, numberOfIGMPMessages, upstreamFlows, 0);
    verdict = localVerdict & verdict;

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, true, false]);
    verdict = localVerdict & verdict;

    ///sending IGMP join channel 3
    testPassed("Step 12. Sending join for channel 3");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(5, numberOfIGMPMessages, upstreamFlows, 0, true, true);
    verdict = localVerdict & verdict;

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, true, false]);
    verdict = localVerdict & verdict;

    ///Restart flows to measure the bandwidth
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(MCastBandwidthUpdateLatency);

    logInfo("Retrieving CurrentMulticastBandwidth (step 13-1)");
    var resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["CurrentMulticastBandwidth"]);

    TrafficGenerator.StopTrafficOnPort(0);

    logInfo("Measured CurrentMulticast Bandwidth is: " + resp["CurrentMulticastBandwidth"]);
    if (resp["CurrentMulticastBandwidth"] == 0) {
        verdict = false;
        logError("CurrentMulticastBandwidth must be >  0");
    }
    logInfo("Retrieving BandwidthExceededCounter (step 13-2)");
    resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["BandwidthExceededCounter"]);
    if (resp["BandwidthExceededCounter"] != numberOfIGMPMessages) {
        verdict = false;
        logError("BandwidthExceededCounter must be " + numberOfIGMPMessages + " (measured value: " + resp["BandwidthExceededCounter"] + ")");
    }

    testPassed("Step 14. Sending Leave channel 2 message on U-interface");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(4, numberOfIGMPMessages, upstreamFlows, 0);
    verdict = localVerdict & verdict;

    ///Send downstream group query to group 2 -- this insures that the Leave is taken in account
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_STag_Frame(MAC_G2, MAC_S1, SPbit1, SVID1, 0x0800, IGMPQuery2IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 0);
        TrafficGenerator.DisableStreamOnPort(2, 0);
        TrafficGenerator.DisableStreamOnPort(3, 0);
        TrafficGenerator.EnableStreamOnPort(4, 0);
        TrafficGenerator.DisableStreamOnPort(5, 0);
        TrafficGenerator.StartTrafficOnPort(0, numberOfIGMPMessages);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
        TrafficGenerator.DisableStreamOnPort(4, 0);
    }
    sleep(26000); // tempo leave not immediate -- No constraint in the test plan, leave extra time just in case

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, false, false]);
    verdict = localVerdict & verdict;
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    ///sending IGMP join channel 3 -- again
    testPassed("Step 15. Sending join for channel 3");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(5, numberOfIGMPMessages, upstreamFlows, 0, true, true);
    verdict = localVerdict & verdict;

    var localVerdict = TrafficGenerator.TestDownstreamFlows([true, false, false]);
    verdict = localVerdict & verdict;

    ///Restart flows to measure the bandwidth
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(MCastBandwidthUpdateLatency);

    logInfo("Retrieving CurrentMulticastBandwidth (step 16-1)");

    resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["CurrentMulticastBandwidth"]);
    TrafficGenerator.StopTrafficOnPort(0);

    logInfo("Measured CurrentMulticast Bandwidth is: " + resp["CurrentMulticastBandwidth"]);

    if (resp["CurrentMulticastBandwidth"] == 0) {
        verdict = false;
        logError("CurrentMulticastBandwidth must be > 0 ");
    }
    logInfo("Retrieving BandwidthExceededCounter (step 16-2)");
    resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["BandwidthExceededCounter"]);
    if (resp["BandwidthExceededCounter"] != (2 * numberOfIGMPMessages)) {
        verdict = false;
        logError("BandwidthExceededCounter must be " + numberOfIGMPMessages + "  (measured value: " + resp["BandwidthExceededCounter"] + ")");
    }

    testPassed("Step 17. Sending Leave channel 1 message on U-interface");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(2, numberOfIGMPMessages, upstreamFlows, 0);
    verdict = localVerdict & verdict;

    ///Send downstream group query to group 1 -- this insures that the Leave is taken in account
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(0, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_S1, SPbit1, SVID1, 0x0800, IGMPQuery1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.DisableStreamOnPort(1, 0);
        TrafficGenerator.DisableStreamOnPort(2, 0);
        TrafficGenerator.DisableStreamOnPort(3, 0);
        TrafficGenerator.DisableStreamOnPort(4, 0);
        TrafficGenerator.EnableStreamOnPort(5, 0);
        TrafficGenerator.StartTrafficOnPort(0, numberOfIGMPMessages);
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(0);
        TrafficGenerator.DisableStreamOnPort(5, 0);
    }
    sleep(26000); // tempo leave not immediate -- No constraint in the test plan, leave extra time just in case

    ///sending IGMP join channel 3 -- 3rd time makes the charm
    testPassed("Step 18. Sending Join channel 3 message on U-interface");
    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(5, numberOfIGMPMessages, upstreamFlows, 0);
    verdict = localVerdict & verdict;

    var localVerdict = TrafficGenerator.TestDownstreamFlows([false, false, true]);
    verdict = localVerdict & verdict;

    ///Restart flows to measure the bandwidth
    TrafficGenerator.StartTrafficOnPort(0);

    sleep(MCastBandwidthUpdateLatency);

    logInfo("Retrieving CurrentMulticastBandwidth (step 19-1)");
    resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["CurrentMulticastBandwidth"]);

    TrafficGenerator.StopTrafficOnPort(0);

    logInfo("Measured CurrentMulticast Bandwidth is: " + resp["CurrentMulticastBandwidth"]);

    if (resp["CurrentMulticastBandwidth"] == 0) {
        verdict = false;
        logError("CurrentMulticastBandwidth must be > 0");
    }
    logInfo("Retrieving BandwidthExceededCounter (step 19-2)");
    resp = OMCI.Get(OMCC, "Multicast_Subsc_Monitor", MSM1, ["BandwidthExceededCounter"]);
    if (resp["BandwidthExceededCounter"] != (2 * numberOfIGMPMessages)) {
        verdict = false;
        logError("BandwidthExceededCounter must be " + numberOfIGMPMessages + " (measured value: " + resp["BandwidthExceededCounter"] + ")");
    }

    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.StopTrafficOnPort(1);

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}


testPassed();