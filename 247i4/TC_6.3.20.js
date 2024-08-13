//  Individual multicast groups in Dynamic Access Control List table
testPassed("Individual multicast groups in Dynamic Access Control List table");

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

function testChannel(channelIdx, upstreamFlows, numMcastFlows) {
    var verdict = true;
    var DS_criteria = [];
    for (var i = 1; i <= numMcastFlows; i++) {
        if (i == channelIdx) DS_criteria.push(true);
        else DS_criteria.push(false);
    }

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    logInfo("Testing channel " + channelIdx);

    logInfo("################################");
    testPassed("testing channel " + channelIdx + " join -- must be received at S/R interface");
    //joins
    var local_verdict = TrafficGenerator.TestSingleUpstreamFlow((2 * channelIdx) - 1, 2, upstreamFlows, 0);
    verdict = verdict && local_verdict;

    sleep(2000);
    logInfo("################################");
    testPassed("testing channel " + channelIdx + " downstream flow -- must be received at U interfaces/All other flows must be dicarded");
    local_verdict = TrafficGenerator.TestDownstreamFlows(DS_criteria);
    verdict = verdict && local_verdict;

    ///Leaves
    logInfo("################################");
    testPassed("testing channel " + channelIdx + " Leave -- must be received at S/R interface");
    local_verdict = TrafficGenerator.TestSingleUpstreamFlow((2 * channelIdx), 2, upstreamFlows, 0);
    verdict = verdict && local_verdict;

    sleep(IGMP.LEAVE_DELAY());

    ///After leave, all downstream flow must be rejected
    logInfo("################################");
    testPassed("after the leave, testing that all multicast flows are discarded at the at ONU")
    DS_criteria[channelIdx - 1] = false;
    local_verdict = TrafficGenerator.TestDownstreamFlows(DS_criteria);
    verdict = verdict && local_verdict;

    return verdict;
}

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7); /// SPbit1 randomly chosen
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var numMcastChannels = 1000;
var AllocId1 = GEM1;

var IP_S1 = IPv4Address("128.0.0.32");

var IGMP_IP_Gs = [];

///Generate the 1000 addresses and select IP_G1 & IP_G5 as min and max, respectively
var IP_G1 = IPv4Address("255.255.255.255");
var IP_G5 = IPv4Address("0.0.0.0");
for (var i = 0; i < numMcastChannels; i++) {
    var groupIP = IGMP.GetUnusedMcastIPv4Address();
    IGMP_IP_Gs.push(groupIP);
    if (groupIP.ToInt() < IP_G1.ToInt())
        IP_G1 = groupIP;
    if (groupIP.ToInt() > IP_G5.ToInt())
        IP_G5 = groupIP;
}
var IP_G2_Idx = RandomInteger(1, 999);
var IP_G2 = IGMP_IP_Gs[IP_G2_Idx];
var IP_G3_Idx = RandomIntegerExcept(1, 999, [IP_G2_Idx]);
var IP_G3 = IGMP_IP_Gs[IP_G3_Idx];
var IP_G4_Idx = RandomIntegerExcept(1, 999, [IP_G2_Idx, IP_G3_Idx]);
var IP_G4 = IGMP_IP_Gs[IP_G4_Idx];

logInfo("IP_G1: " + IP_G1.ToString());
logInfo("IP_G2: " + IP_G2.ToString());
logInfo("IP_G3: " + IP_G3.ToString());
logInfo("IP_G4: " + IP_G4.ToString());
logInfo("IP_G5: " + IP_G5.ToString());

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

var OMCIMibConsistencyCheckShadow = OMCI.MibConsistencyCheck;
OMCI.MibConsistencyCheck = false;
var OMCITimeoutShadow = OMCI.Timeout;
OMCI.Timeout = 120000;

for (var i = 0; i < numMcastChannels; i++) {
    logInfo("creating " + (i + 1) + " entry in DynamicACLTable for group address " + IGMP_IP_Gs[i].ToString());
    OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
        "DynamicACLTable": {
            "TableIndex": 0x4000 + i,
            "GEMPortID": GEM2,
            "VlanID": SVID1,
            "SourceIPAddr": "0.0.0.0",
            "DestIPAddrStart": IGMP_IP_Gs[i].ToString(),
            "DestIPAddrEnd": IGMP_IP_Gs[i].ToString(),
            "ImputedGroupBandwidth": 0,
            "Reserved": 0
        }
    });
}

OMCI.MibConsistencyCheck = OMCIMibConsistencyCheckShadow;

if (OMCI.MibConsistencyCheck) {
    var resp = OMCI.Get(OMCC, "Multicast_Opr_Profile", MOP1, ["DynamicACLTable"]);

    if (undefined == resp) {
        OMCI.log(OMCI.MibConsistencyStopOnError, "No Response to get message");
    }
    if (resp['DynamicACLTable'] === undefined) {
        OMCI.log(OMCI.MibConsistencyStopOnError, "Attribute DynamicACLTable not in Get response");
    }

    for (var i = 0; i < numMcastChannels; i++) {
        ///Tables are not guaranteed to be send in row key order
        var tableIndex = resp['DynamicACLTable'][i]['TableIndex'];
        if (IGMP_IP_Gs[tableIndex] == undefined)
            testFailed("duplicate entry in table");

        if (resp['DynamicACLTable'][i]['DestIPAddrStart'] != IGMP_IP_Gs[tableIndex].ToString())
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable DestIPAddrStart is not correct (" + resp['DynamicACLTable'][i]['DestIPAddrStart'] + "/expected: " + IGMP_IP_Gs[tableIndex].ToString() + ")");
        if (resp['DynamicACLTable'][i]['DestIPAddrEnd'] != IGMP_IP_Gs[tableIndex].ToString())
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable DestIPAddrEnd is not correct (" + resp['DynamicACLTable'][i]['DestIPAddrEnd'] + "/expected: " + IGMP_IP_Gs[tableIndex].ToString() + ")");

        if (resp['DynamicACLTable'][i]['GEMPortID'] != GEM2)
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ", DynamicACLTable GEMPortID is not correct (" + resp['DynamicACLTable'][i]['GEMPortID'] + "/expected: " + GEM2 + ")");
        if (resp['DynamicACLTable'][i]['VlanID'] != SVID1)
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable VlanID is not correct (" + resp['DynamicACLTable'][i]['VlanID'] + "/expected: " + SVID1 + ")");
        if (resp['DynamicACLTable'][i]['SourceIPAddr'] != "0.0.0.0")
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable SourceIPAddr is not correct (" + resp['DynamicACLTable'][i]['SourceIPAddr'] + "/expected: " + "0.0.0.0" + ")");
        if (resp['DynamicACLTable'][i]['ImputedGroupBandwidth'] != 0)
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable ImputedGroupBandwidth is not correct (" + resp['DynamicACLTable'][i]['ImputedGroupBandwidth'] + "/expected: " + 0 + ")");
        if (resp['DynamicACLTable'][i]['Reserved'] != 0)
            OMCI.log(OMCI.MibConsistencyStopOnError, "at entry " + tableIndex + ",DynamicACLTable Reserved is not correct (" + resp['DynamicACLTable'][i]['Reserved'] + "/expected: " + 0 + ")");

        IGMP_IP_Gs[tableIndex] = undefined; ///this index has been checked

        ///Tables are ordered in reverse in resp (!!!)

    }
}

OMCI.Timeout = OMCITimeoutShadow;

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

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "Join Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 1", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G2, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin2IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 2", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave2IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 3", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G3, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin3IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 3", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave3IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 4", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G4, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin4IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 4", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave4IPDatagram) });
    upstreamFlows.push({ name: "Join Channel 5", frame: IEEE_802_1Q.Build_STag_Frame(MAC_G5, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin5IPDatagram) });
    upstreamFlows.push({ name: "Leave Channel 5", frame: IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave5IPDatagram) });

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.20", [
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

    /// Start all downstream multicast stream

    logInfo("################################");
    logInfo("################################");
    testPassed("testing that all downstream multicast flows are discarded");
    verdict = TrafficGenerator.TestDownstreamFlows([false, false, false, false, false]) && verdict;

    logInfo("################################");
    logInfo("################################");
    testPassed("testing channel 1 subscription");
    verdict = testChannel(1, upstreamFlows, 5) && verdict;
    logInfo("################################");
    logInfo("################################");
    testPassed("testing channel 2 subscription");
    verdict = testChannel(2, upstreamFlows, 5) && verdict;
    logInfo("################################");
    logInfo("################################");
    testPassed("testing channel 3 subscription");
    verdict = testChannel(3, upstreamFlows, 5) && verdict;
    logInfo("################################");
    logInfo("################################");
    testPassed("testing channel 4 subscription");
    verdict = testChannel(4, upstreamFlows, 5) && verdict;
    logInfo("################################");
    logInfo("################################");
    testPassed("testing channel 5 subscription");
    verdict = testChannel(5, upstreamFlows, 5) && verdict;

    TrafficGenerator.Disconnect();

    if (verdict)
        testPassedWithTraffic();
    else
        testFailed("Error in the treatment of multicast streams")
}


testPassed();