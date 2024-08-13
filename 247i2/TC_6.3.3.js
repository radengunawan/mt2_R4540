include("Config.js");

//Test case 6.3.3 ONU silent discarding of IGMPv1 messages (Same sequence as 6.3.1!)
/// Initialize Variables
var numberOfIGMPMessages = 2;
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM2 = PLOAMMapper.ReserveDataGEMPort(4095);
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var TPID = 0x8100;

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
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: TPID, OutputTPID: 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 0,
        TreatInnerVID: VID1,
        TreatInnerTPID: 6
    }
});


//Create MOP and MC Sub Info
var MOP1 = OMCI.Create(OMCC, "Multicast_Opr_Profile");
OMCI.Set(OMCC, "Multicast_Opr_Profile", MOP1, {
    "DynamicACLTable": {
        "TableIndex": 0x4000,
        "GEMPortID": GEM2,
        "VlanID": VID1,
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


logInfo("Random value: VID1=" + VID1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

addTranslationGponToEth(GEM1);

if (TrafficGenerator.activateAutomatisation) {
    include("IEEE_802_1Q.js");
    include("IP.js");
    include("IGMP.js");
    var verdict = true;
    /// MAC source address
    var IP_IGMP_US_S1 = IPv4Address("128.0.0.5");
    var IP_G1 = IPv4Address("224.4.5.1");
    if (UtilsParameters.IGMPRandomisation) {
        IP_IGMP_US_S1 = IPv4Address(RandomIPv4Address());
        IP_G1 = IGMP.GetUnusedMcastIPv4Address();
    }
    var MAC_IGMP_US_S1 = IP.MACAddressFromIP(IP_IGMP_US_S1);
    /// MAC destination addresses 
    var MAC_G1 = IGMP.GroupMACAddressFromIP(IP_G1);

    var IGMPv1MembershipReportDataGram = IP.Build_Frame(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v1(IP_G1));

    var IGMPv2MembershipReportDataGram = IP.Build_Frame_RouterAlert(IP_G1, IP_IGMP_US_S1, 0x02, IGMP.Build_MembershipReport_v2(IP_G1));

    var upstreamFlows = []; ///order must be the same as the traffic file
    upstreamFlows.push({ name: "IGMPv1 membership report", frame: IEEE_802_1Q.Build_Untagged_Frame(MAC_G1, MAC_IGMP_US_S1, 0x0800, IGMPv1MembershipReportDataGram) });
    upstreamFlows.push({ name: "IGMPv2 membership report", frame: IEEE_802_1Q.Build_Untagged_Frame(MAC_G1, MAC_IGMP_US_S1, 0x0800, IGMPv2MembershipReportDataGram) });

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var struct = TrafficGenerator.SendTemplateConfig("6.3.3", [
        ["<VID1>", VID1, 3],
        ["<MAC_IGMP_US_S1>", MAC_IGMP_US_S1, 0xC],
        ["<MAC_G1>", MAC_G1, 0xC],
        ["<IGMPv1MembershipReportDataGram>", IGMPv1MembershipReportDataGram],
        ["<IGMPv2MembershipReportDataGram>", IGMPv2MembershipReportDataGram],
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Start all downstream multicast stream
    testPassed("Send IGMP frames");

    logInfo("");
    logInfo("Sending IGMPv1 membership report message on U-interface");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(1, numberOfIGMPMessages, upstreamFlows, 0, true, false);
    if (!localVerdict) {
        verdict = false;
        logError("IGMP frame v1 received on S/R interface");
    } else {
        logInfo("No IGMP frame v1 received on S/R interface");
    }

    logInfo("");
    logInfo("Sending IGMPv2 membership report message on U-interface");

    var localVerdict = TrafficGenerator.TestSingleUpstreamFlow(2, numberOfIGMPMessages, upstreamFlows, 0, false, false);
    if (!localVerdict) {
        verdict = false;
        logError("IGMP frame v2 not received on S/R interface");
    } else {
        logInfo("IGMP frame v2 correctly received on S/R interface");
    }

    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on treatment of Multicast flows");
    else testPassedWithTraffic();
}

testPassed();