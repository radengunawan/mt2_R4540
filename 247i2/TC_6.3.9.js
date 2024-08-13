include("Config.js");

//Test case 6.3.9 IGMP Immediate Leave

/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var MGEM = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var Pbit1 = RandomInteger(0, 7);
var IP_G1 = IPv4Address("224.1.1.1");
var IND1 = 0;

if (UtilsParameters.IGMPRandomisation) {
    IP_G1 = IGMP.GetUnusedMcastIPv4Address();
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

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);

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
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile", { "ImmediateLeave": 1 });
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
var MSCI1 = OMCI.Create(OMCC, "Multicast_Subsc_Config_Info", { "meid": BPCD3, "MulticastOprProfilePtr": MOP1 });


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random value: VID1=" + VID1);
logInfo("Random value: Pbit1=" + Pbit1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: MGEM=" + MGEM);

addTranslationGponToEth(GEM1);
addTranslationEthToGpon(0xffff, 0xff, MGEM);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");

    var IP_S1 = IPv4Address("128.0.0.1");
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.7");

    if (UtilsParameters.IGMPRandomisation) {
        IP_S1 = IPv4Address(RandomIPv4Address());
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4AddressExcept([IP_S1]));
    }

    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);
    var MAC_S1 = IP.MACAddressFromIP(IP_S1);
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);

    var IGMPJoinDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Join(IP_S1, IP_G1));
    var IGMPLeaveDatagram = IP.Build_Frame_RouterAlert(IGMP.IP_IGMPv3_REPORT(), IP_IGMP_US_S1, 0x02, IGMP.Build_Leave(IP_G1));

    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.3.9", [
        ["<VID1>", VID1, 3],
        ["<Pbit1>", Pbit1 << 1, 1],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1],
        ["<MAC_IGMPv3_REPORT>", IGMP.MAC_IGMPv3_REPORT()],
        ["<MAC_S1>", MAC_S1],
        ["<MAC_G1>", MAC_G1],
        ["<IP_G1>", IP_G1],
        ["<IP_S1>", IP_S1],
        ["<IGMPJoinDatagram>", IGMPJoinDatagram],
        ["<IGMPLeaveDatagram>", IGMPLeaveDatagram]
    ]);
    testPassed("Starting stream tests");
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.DisableStreamOnPort(0, 1);
    TrafficGenerator.DisableStreamOnPort(1, 1);
    /// Step 10 - 10.	Generate multicast traffic defines in test condition 3 at the V-interface 
    logInfo("Generate multicast traffic at the V-interface");
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Wait for establishment  
    sleep(2000);
    /// Send Join Channel 1
    logInfo("Send Join Channel 1");
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPJoinDatagram), 2);
        sleep(500);
    } else {
        TrafficGenerator.EnableStreamOnPort(0, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(500);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    /// Check that the traffic is correcly forwarded
    sleep(4000);
    var rcvdAfterJoin = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Received " + rcvdAfterJoin + " packets after join");
    if (rcvdAfterJoin > 0) { logInfo("Ch1 correctly forwarded after Join IGMP message"); } else {
        verdict = false;
        logError("Ch1 is not forwarded after Join IGMP message");
    }
    /// Send Leave Channel 1
    logInfo("Send Leave Channel 1");
    TrafficGenerator.StopTrafficOnPort(0);
    if (UtilsParameters.IGMPRandomisation && TrafficGenerator.driver != "STC") {
        TrafficGenerator.SendFrameOnPort(1, IEEE_802_1Q.Build_Frame(IGMP.MAC_IGMPv3_REPORT(), MAC_IGMP_US_S1, Pbit1, VID1, 0x0800, IGMPLeaveDatagram), 2);
        sleep(100);
    } else {
        TrafficGenerator.EnableStreamOnPort(1, 1);
        TrafficGenerator.DisableStreamOnPort(0, 1);
        TrafficGenerator.StartTrafficOnPort(1, 2);
        sleep(100);
        TrafficGenerator.StopTrafficOnPort(1);
    }
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.StartTrafficOnPort(0);
    /// Check that the traffic is correcly rejected
    sleep(4000);
    var rcvdAfterLeave = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    logInfo("Received " + rcvdAfterLeave + " packets after Immediate Leave");
    if (rcvdAfterLeave == 0) { logInfo("Ch1 correctly skipped after Immediate Leave IGMP message"); } else {
        verdict = false;
        logError("Ch1 is not rejected after Immediate Leave IGMP message");
    }
    TrafficGenerator.StopTrafficOnPort(0);
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of IGMP frame limits");
    else testPassedWithTraffic();
}

testPassed();