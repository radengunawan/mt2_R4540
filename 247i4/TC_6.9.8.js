//Test Case on OMCI reset and MIB synchronization

include("Config.js");

/// Initialize Variables
var rebootTimeOut = 160000; //ms
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var SVID1 = RandomIntegerExcept(1, 4094, [CVID1]);
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1, SVID1]);
var SVID2 = RandomIntegerExcept(1, 4094, [CVID1, SVID1, CVID2]);
var CPbit1 = RandomInteger(0, 7);
var SPbit1 = RandomIntegerExcept(0, 7, [CPbit1]);
var CPbit2 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1]);
var SPbit2 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1, CPbit2]);

var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId2 = GEM2;

if (TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    var MAC3 = 0x302233445503;
    var MAC4 = 0x402233445504;

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        var MAC3 = RandomUnicastMACAddressExcept([MAC1, MAC2]);
        var MAC4 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
        logInfo("Random value: MAC3=" + MAC3.hex(12, 0));
        logInfo("Random value: MAC4=" + MAC4.hex(12, 0));
    }
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

testPassed("ONU activated");

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");


/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);


/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbit1, IWTP1]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbit1,
        "FilterInnerVID": CVID1,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbit1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

///default rule for single-tagged frames: discard
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");


/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(SVID1, SPbit1, GEM1);
addTranslationEthToGpon(SVID2, SPbit2, GEM2);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

logInfo("Random value: CVID1=" + CVID1);
logInfo("Random value: CPbit1=" + CPbit1);
logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SPbit1=" + SPbit1);

testPassed("Starting traffics");

//// Traffic Generator config
if (TrafficGenerator.activateAutomatisation) {

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.9.8", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set B": 0, "TID 2:0": 0 },

        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set D": 0, "TID 6:1": 0 }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
} else {
    if (0 == popup("Run Traffic Flow A & C and check Traffic format. If both flows are correctly received click Yes", "YesNo"))
        testFailed("Error on received stream");
    if (0 == popup("Run Traffic Flow B & D. If they are correctly discarded by the ONU click Yes", "YesNo"))
        testFailed("Error on received stream");
}

/// MIB Reset
OMCI.MIB_Reset(OMCC);


logInfo("Step 8. Cause the OLT emulator to send the GET MIB data sync OMCI message");

var dataSyncAfterReset = (OMCI.Get(OMCC, "ONU_Data", 0, ["MIBDataSync"])).MIBDataSync;

if (dataSyncAfterReset != 0)
    testFailed("Pass/Fail 7 At Step 8, The MIB data sync OMCI message reports a non 0 value after the MIB RESET");

if (TrafficGenerator.activateAutomatisation) {
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.9.8", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": 0, "TID 1:0": 0 },
        "Frame Set B": { "Frame Set B": 0, "TID 2:0": 0 },

        "Frame Set C": { "Frame Set C": 0, "TID 5:1": 0 },
        "Frame Set D": { "Frame Set D": 0, "TID 6:1": 0 }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
} else {
    if (0 == popup("Run Traffic Flow A, B, C, D. If they are correctly discarded by the ONU click Yes", "YesNo"))
        testFailed("Error on received stream");
}

OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");


/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId2 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId2, 50);


/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVID2], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbit2, IWTP1]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbit2,
        "FilterInnerVID": CVID2,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbit2,
        "TreatInnerVID": SVID2,
        "TreatInnerTPID": 6
    }
});

///default rule for single-tagged frames: discard
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});
// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");

//// Traffic Generator config
if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.9.8", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": 0, "TID 1:0": 0 },
        "Frame Set B": { "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },

        "Frame Set C": { "Frame Set C": 0, "TID 5:1": 0 },
        "Frame Set D": { "Frame Set D": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");

    testPassedWithTraffic();
} else {
    if (0 == popup("Run Traffic Flow B & D and check Traffic format. If both flows are correctly received click Yes", "YesNo"))
        testFailed("Error on received stream");
    if (0 == popup("Run Traffic Flow A & C. If they are correctly discarded by the ONU click Yes", "YesNo"))
        testFailed("Error on received stream");
}

testPassed();