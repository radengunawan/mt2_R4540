//Strict Priority Downstream Scheduling Among 2 Queues on ONU with Unicast and Multicast Traffic

include("Config.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");

/// Initialize Variables
var LossToleranceRatio = 0.001;
var MinLossRatio = 0.1;
var baseBitRate = 1000; ///in PacketsPerSecond. flows will start at baseBitRate
var portSpeedMbps = 100;

var testPhaseLength = 20000; ///increase for ONUs with larger buffer
var packetModifier = 0xFFFF0000;
var maxPackets2Exponent = 15; ///MAX 15
var maxPacketsMask = (0x0000FFFF << maxPackets2Exponent) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?LAST packet in the traffic analysis period?
var packetOffset2Exponent = 11; /// SETTABLE / MAX< maxPackets2Exponent: Exponent of the number of the ?FIRST packet in the traffic analysis?
var packetOffsetMask = ((0x0000FFFF << packetOffset2Exponent) & (~maxPacketsMask)) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?FIRST packet in the traffic analysis?, taking into account the mask of the ?LAST packet in the traffic analysis?.

/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID1 = RandomIntegerExcept(1, 4094, [CVID1]);
var CPbit1 = RandomInteger(0, 7); /// SPbit1 randomly chosen
var SPbit1 = RandomIntegerExcept(0, 7, [CPbit1]);
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();

var AllocId1 = GEM1;

var IP_IGMP_US_S1 = IPv4Address("10.0.0.1");
var IP_S1 = IPv4Address("128.0.0.32");
var IP_G1 = IPv4Address("224.0.1.4");

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address(); /// is this enough in terms of range ?
}

/// Use other IP values when TrafficGenerator automatisation is activated
if (TrafficGenerator.activateAutomatisation) {
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
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
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x8100, "DownstreamMode": 0 });

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
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random values SVID1=" + SVID1);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random values CVID1=" + CVID1);
logInfo("Random value: CPbit1=" + CPbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

addTranslationGponToEth(GEM1);
addTranslationEthToGpon(CVID1, 0xff, GEM1);
addTranslationEthToGpon(SVID1, 0xff, GEM2);

if (TrafficGenerator.activateAutomatisation) {
    var IGMPJoin1IPDatagram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));
    var IGMPLeave1IPDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_ALL_ROUTERS(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave_v2(IP_G1));

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.2.25", [
        ["<MOD>", packetModifier],
        ["<PACKETMAXMASK>", maxPacketsMask, 4],
        ["<PACKETOFFSETMASK>", packetOffsetMask, 4],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_G1>", MAC_G1],
        ["<MAC_S1>", MAC_S1],
        ["<IP_G1>", IP_G1],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoin1_IPDATAGRAM>", IGMPJoin1IPDatagram],
        ["<IGMPLeave1_IPDATAGRAM>", IGMPLeave1IPDatagram],
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    logInfo("sending join for channel 1");
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    logInfo("################################");
    logInfo("################################");

    testPassed("Testing priorisation, with stream A being high priority and Mcast low priority");

    TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

    var flowStates = [
        ///Flow with increasing datarate first
        {
            name: "A",
            flowIndex: 1,
            filterIndex: 0,
            TID: 1,
            priority: 2,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }, {
            name: "Channel 1",
            flowIndex: 2,
            filterIndex: 1,
            TID: 2,
            priority: 1,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }
    ];

    var verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
        loseTolerance: LossToleranceRatio, //1%
        remainTolerance: MinLossRatio, //2%
        transitionPhaseLength: 4000,
        testPhaseLength: testPhaseLength,
        packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
        maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
        portSpeedMbps: portSpeedMbps, //mbps
        firstStep: 15, //from test description
        lastStep: 15, //from test description,
        useRepeatModifier: true,
        modifierPos: 120
    });

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Priority is not respected: stream A loss when it is High Priority");
    }
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    sleep(TrafficGenerator.delayBeforeTraffic)

    logInfo("sending leave for channel 1");
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
} else {}

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);
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
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwUni1PQ2 });
// create a Multicast GEM port GEM 2
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, Direction: 2, PQPointerDown: DwUni1PQ1 });

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
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

if (TrafficGenerator.activateAutomatisation) {
    sleep(TrafficGenerator.delayBeforeTraffic);

    logInfo("sending join for channel 1");
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    logInfo("################################");
    logInfo("################################");

    testPassed("Testing priorisation, with Mcast being high priority and flow A low priority");
    TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

    var flowStates = [
        ///Flow with increasing datarate first
        {
            name: "Channel 1",
            flowIndex: 2,
            filterIndex: 1,
            TID: 2,
            priority: 2,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }, {
            name: "A",
            flowIndex: 1,
            filterIndex: 0,
            TID: 1,
            priority: 1,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }
    ];

    var verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
        loseTolerance: LossToleranceRatio, //1%
        remainTolerance: MinLossRatio, //2%
        transitionPhaseLength: 4000,
        testPhaseLength: testPhaseLength,
        packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
        maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
        portSpeedMbps: portSpeedMbps, //mbps
        firstStep: 23, //from test description
        lastStep: 23, //from test description,
        useRepeatModifier: true,
        modifierPos: 120
    });

    if (!verdict) {
        TrafficGenerator.Disconnect();
        testFailed("Priority is not respected: Mcast loss when it is High Priority");
    }
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    sleep(TrafficGenerator.delayBeforeTraffic)

    logInfo("sending leave for channel 1");
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(IGMP.MAC_ALL_ROUTERS(), MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPLeave1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(2, 1);
        TrafficGenerator.DisableStreamOnPort(1, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }
} else {}

///All traffic to Low priority
/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);
/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
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
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwUni1PQ2 });
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
        "DestIPAddrStart": IP_G1.ToString(),
        "DestIPAddrEnd": IP_G1.ToString(),
        "ImputedGroupBandwidth": 0,
        "Reserved": 0
    }
});

var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

if (TrafficGenerator.activateAutomatisation) {
    sleep(TrafficGenerator.delayBeforeTraffic);

    logInfo("sending join for channel 1");
    if (UtilsParameters.IGMPRandomisation) {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_STag_Frame(MAC_G1, MAC_IGMP_US_S1, SPbit1, SVID1, 0x0800, IGMPJoin1IPDatagram), 2);
        sleep(2000);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(2, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        /// Wait for frame to travel
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(1);
    }

    logInfo("################################");
    logInfo("################################");

    testPassed("Testing priorisation, with Both flows being low priority");

    TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

    var flowStates = [
        ///Flow with increasing datarate first
        {
            name: "Channel 1",
            flowIndex: 2,
            filterIndex: 1,
            TID: 2,
            priority: 1,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }, {
            name: "C",
            flowIndex: 1,
            filterIndex: 0,
            TID: 1,
            priority: 1,
            bitRatePPS: baseBitRate,
            bitRateIncrementPPS: baseBitRate
        }
    ];

    var verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
        loseTolerance: LossToleranceRatio, //1%
        remainTolerance: MinLossRatio, //2%
        transitionPhaseLength: 4000,
        testPhaseLength: testPhaseLength,
        packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
        maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
        portSpeedMbps: portSpeedMbps, //mbps
        firstStep: 33, //from test description
        lastStep: 33, //from test description,
        useRepeatModifier: true,
        modifierPos: 120
    });

    TrafficGenerator.Disconnect();
    if (!verdict) {
        testFailed("Priority is not respected: Both flow must lose traffic");
    }
    testPassedWithTraffic();
} else {}

testPassed();