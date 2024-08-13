include("Config.js");

//test case 6.2.3 Mapping Traffic from GEM Ports to U Interface in the Downstream Direction in a VBES Architecture
/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1]); /// CVID2 randomly chosen in range [1..4094]
var SVID1 = RandomIntegerExcept(1, 4094, [CVID1, CVID2]); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomIntegerExcept(1, 4094, [CVID1, CVID2, SVID1]); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var SPbits1 = RandomInteger(0, 7);

//test case 6.2.3 Mapping Traffic from GEM Ports to U Interface in the Downstream Direction in a VBES Architecture

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
sleep(200);

testPassed("ONU activated");

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var TCONT2 = OMCI.GetTCONT(OMCC, 1);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var UpPQ2 = OMCI.GetUpPQ(OMCC, TCONT2);
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });



/// Send config
// create GEM ports
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//Associated with ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: 3, TPPointer: PMAP2 });

var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, VLANFilterList: [SVID2], ForwardOpr: 16, NumberOfEntries: 1 });

//IWTPs for GEM Ports
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP2, GALProfilePointer: GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
    [SPbits1, IWTP1]
]));
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
    [SPbits1, IWTP2]
]));

//Associated with UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOC = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 8,
        FilterInnerVID: CVID1,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 4096,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits1,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 8,
        FilterInnerVID: CVID2,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 4096,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits1,
        TreatInnerVID: SVID2,
        TreatInnerTPID: 6
    }
});


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });
testPassed("MIB Configuration set");

logInfo("Random values Stream 1: GEM1=" + GEM1 + " ; CVID1=" + CVID1 + " ; SVID1=" + SVID1 + " ; SPbits1=" + SPbits1);
logInfo("Random values Stream 2: GEM2=" + GEM2 + " ; CVID2=" + CVID2 + " ; SVID2=" + SVID2);

addTranslationEthToGpon(SVID1, 0xff, GEM1);
addTranslationEthToGpon(SVID2, 0xff, GEM2);

if (TrafficGenerator.activateAutomatisation) {

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);
        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    } else {
        logInfo("No MAC Adresses randomisation");
        var MAC1 = 0x202233445501;
        var MAC2 = 0x102233445502;
    }
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.2.3", [
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<SPbits1>", SPbits1 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "Frame Set B": 0, "TID 1:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set A": 0, "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}

testPassed();