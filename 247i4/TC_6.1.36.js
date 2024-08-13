//Test Case on downstream translation for code point 6
include("Config.js");

/// Initialize Variables -- indexes start at 0 (BBF tables start at 1)
var CVIDs = [];
for (var i = 0; i < 5; i++) {
    CVIDs.push(RandomIntegerExcept(1, 4094, CVIDs)); /// CVID randomly chosen in range [1..4094]
}
var SVIDs = [];
for (var i = 0; i < 5; i++) {
    SVIDs.push(RandomIntegerExcept(1, 4094, CVIDs.concat(SVIDs))); /// CVID randomly chosen in range [1..4094]
}
var CPbits = [];
for (var i = 0; i < 6; i++) {
    CPbits.push(RandomIntegerExcept(0, 7, CPbits)); /// CVID randomly chosen in range [1..4094]
}
var SPbits = [];
for (var i = 0; i < 6; i++) {
    SPbits.push(RandomIntegerExcept(0, 7, SPbits)); /// CVID randomly chosen in range [1..4094]
}

var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocId2 = GEM2;
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocId3 = GEM3;
var GEM4 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocId4 = GEM4;

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
var TCONT2 = OMCI.GetTCONT(OMCC, 1);
var UpPQ2 = OMCI.GetUpPQ(OMCC, TCONT2);
var DwPQ2 = OMCI.GetDwPQ(OMCC, 1);
var TCONT3 = OMCI.GetTCONT(OMCC, 2);
var UpPQ3 = OMCI.GetUpPQ(OMCC, TCONT3);
var DwPQ3 = OMCI.GetDwPQ(OMCC, 2);
var TCONT4 = OMCI.GetTCONT(OMCC, 3);
var UpPQ4 = OMCI.GetUpPQ(OMCC, TCONT4);
var DwPQ4 = OMCI.GetDwPQ(OMCC, 3);

var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
PLOAMMapper.AssignAllocId(ONUID, AllocId3);
PLOAMMapper.AssignAllocId(ONUID, AllocId4);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { "AllocId": AllocId2 });
OMCI.Set(OMCC, "T_CONT", TCONT3, { "AllocId": AllocId3 });
OMCI.Set(OMCC, "T_CONT", TCONT4, { "AllocId": AllocId4 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);
bwmapAddEntry(ONUID, AllocId2, 50);
bwmapAddEntry(ONUID, AllocId3, 50);
bwmapAddEntry(ONUID, AllocId4, 50);

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DwPQ2 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM3, "TCONTPointer": TCONT3, "TMPointerUp": UpPQ3, "PQPointerDown": DwPQ3 });
var CTP4 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM4, "TCONTPointer": TCONT4, "TMPointerUp": UpPQ4, "PQPointerDown": DwPQ4 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });

var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP3, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP4 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP4, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbits[0], IWTP1],
    [SPbits[1], IWTP2],
    [SPbits[2], IWTP3],
    [SPbits[3], IWTP4],
    [SPbits[4], IWTP4],
    [SPbits[5], IWTP2]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x8100, "DownstreamMode": 6 });

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbits[0],
        FilterInnerVID: CVIDs[0],
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits[0],
        TreatInnerVID: SVIDs[0],
        TreatInnerTPID: 6
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbits[2],
        FilterInnerVID: CVIDs[0],
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits[1],
        TreatInnerVID: SVIDs[0],
        TreatInnerTPID: 6
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbits[3],
        FilterInnerVID: CVIDs[2],
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits[2],
        TreatInnerVID: SVIDs[1],
        TreatInnerTPID: 6
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbits[5],
        FilterInnerVID: CVIDs[4],
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbits[3],
        TreatInnerVID: SVIDs[2],
        TreatInnerTPID: 6
    }
});



// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");

for (var i = 0; i < 5; i++) {
    logInfo("Random values CVID" + (i + 1) + "=" + CVIDs[i]);
}
for (var i = 0; i < 5; i++) {
    logInfo("Random values SVID" + (i + 1) + "=" + SVIDs[i]);
}
for (var i = 0; i < 6; i++) {
    logInfo("Random values CPbit" + (i + 1) + "=" + CPbits[i]);
}
for (var i = 0; i < 6; i++) {
    logInfo("Random values CPbit" + (i + 1) + "=" + SPbits[i]);
}

logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);
logInfo("Random value: GEM4=" + GEM4);

testPassed("Starting traffics");
//// Traffic Generator config
if (TrafficGenerator.activateAutomatisation) {
    var verdict = true;
    /// Declare variable used in TrafficGenerator file
    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        MAC1 = RandomUnicastMACAddress();
        MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    }

    /// translation rules: downstream
    addTranslationEthToGpon(SVIDs[0], SPbits[0], GEM1); ///Flow A ds
    addTranslationEthToGpon(SVIDs[0], SPbits[1], GEM2); ///Flow B ds
    addTranslationEthToGpon(SVIDs[1], SPbits[2], GEM3); ///Flow C ds
    addTranslationEthToGpon(SVIDs[2], SPbits[3], GEM4); ///Flow D ds

    /// translation rules: upstream
    addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[0], SPbits[0], 0x8100, 0, GEM1); ///Flow A us
    addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[0], SPbits[1], 0x8100, 0, GEM2); ///Flow B us
    addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[1], SPbits[2], 0x8100, 0, GEM3); ///Flow C us
    addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[2], SPbits[3], 0x8100, 0, GEM4); ///Flow D us

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.36-1", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<SVID4>", SVIDs[3], 3],
        ["<SVID5>", SVIDs[4], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CVID4>", CVIDs[3], 3],
        ["<CVID5>", CVIDs[4], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<CPbit4>", CPbits[3] << 1, 1],
        ["<CPbit5>", CPbits[4] << 1, 1],
        ["<CPbit6>", CPbits[5] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<SPbit4>", SPbits[3] << 1, 1],
        ["<SPbit5>", SPbits[4] << 1, 1],
        ["<SPbit6>", SPbits[5] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Aus": { "Frame Set Aus": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Bus": { "Frame Set Bus": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Cus": { "Frame Set Cus": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Dus": { "Frame Set Dus": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend },

        "Frame Set Ads": { "Frame Set Ads": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Bds": { "Frame Set Bds": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Cds": { "Frame Set Cds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Dds": { "Frame Set Dds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = local_verdict && verdict;

    delAllTranslationRules();
    /// Translation rules: downstream
    addTranslationEthToGpon(SVIDs[2], SPbits[2], GEM3); ///Flow E ds
    addTranslationEthToGpon(SVIDs[3], SPbits[0], GEM1); ///Flow F ds
    addTranslationEthToGpon(SVIDs[2], SPbits[4], GEM4); ///Flow G ds
    addTranslationEthToGpon(SVIDs[1], SPbits[0], GEM1); ///Flow H ds

    ///Replication rules: upstream
    addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[2], SPbits[2], 0x8100, 0, GEM3); ///Flow E us


    /// Connect to the TrafficGenerator
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.36-2", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<SVID4>", SVIDs[3], 3],
        ["<SVID5>", SVIDs[4], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CVID4>", CVIDs[3], 3],
        ["<CVID5>", CVIDs[4], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<CPbit4>", CPbits[3] << 1, 1],
        ["<CPbit5>", CPbits[4] << 1, 1],
        ["<CPbit6>", CPbits[5] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<SPbit4>", SPbits[3] << 1, 1],
        ["<SPbit5>", SPbits[4] << 1, 1],
        ["<SPbit6>", SPbits[5] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Eus": { "Frame Set Eus": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },

        "Frame Set Eds": { "Frame Set Eds": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Fds": { "All Ds": 0, "TID 6:1": 0 },
        "Frame Set Gds": { "Frame Set Gds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Hds": { "Frame Set Hds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = local_verdict && verdict;

    delAllTranslationRules();
    /// Replication rules: downstream
    addTranslationEthToGpon(SVIDs[4], SPbits[5], GEM2); /// Flow I ds

    /// Connect to the TrafficGenerator
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.36-3", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<SVID4>", SVIDs[3], 3],
        ["<SVID5>", SVIDs[4], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CVID4>", CVIDs[3], 3],
        ["<CVID5>", CVIDs[4], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<CPbit4>", CPbits[3] << 1, 1],
        ["<CPbit5>", CPbits[4] << 1, 1],
        ["<CPbit6>", CPbits[5] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<SPbit4>", SPbits[3] << 1, 1],
        ["<SPbit5>", SPbits[4] << 1, 1],
        ["<SPbit6>", SPbits[5] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Ids": { "All Ds": 0, "TID 5:1": 0 },
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = local_verdict && verdict;

    if (verdict == false) testFailed("Error on received stream");


    testPassedWithTraffic();

} else {
    /// First rule = least priority
    addTranslationEthToGpon(SVIDs[2], 0xff, GEM4);
    addTranslationEthToGpon(0xffff, SPbits[0], GEM1);
    addTranslationEthToGpon(0xffff, SPbits[2], GEM3);
    addTranslationEthToGpon(SVIDs[0], SPbits[1], GEM2);
    addTranslationEthToGpon(SVIDs[4], SPbits[5], GEM2);


    /// All frame received from the GEM1 has to be replicated on OLT Ethernet port
    addTranslationGponToEth(GEM1);
    addTranslationGponToEth(GEM2);
    addTranslationGponToEth(GEM3);
    addTranslationGponToEth(GEM4);
}
testPassed();