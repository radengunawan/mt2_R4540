///Test Case on not to use MAC Addresses as classification criteria
include("Config.js");

/// Initialize Variables
var CVIDs = [];
for (var i = 0; i < 3; i++) {
    CVIDs.push(RandomIntegerExcept(1, 4094, CVIDs)); /// CVID randomly chosen in range [1..4094]
}
var SVIDs = [];
for (var i = 0; i < 3; i++) {
    SVIDs.push(RandomIntegerExcept(1, 4094, CVIDs.concat(SVIDs))); /// CVID randomly chosen in range [1..4094]
}
var CPbits = [];
for (var i = 0; i < 3; i++) {
    CPbits.push(RandomIntegerExcept(0, 7, CPbits)); /// CVID randomly chosen in range [1..4094]
}
var SPbits = [];
for (var i = 0; i < 3; i++) {
    SPbits.push(RandomIntegerExcept(0, 7, CPbits.concat(SPbits))); /// CVID randomly chosen in range [1..4094]
}

var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId2 = GEM2;

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
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { "AllocId": AllocId2 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);
bwmapAddEntry(ONUID, AllocId2, 50);

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DwPQ2 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// 2ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP1 });
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVIDs[0]], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { "P0Ptr": IWTP1, "P1Ptr": IWTP1, "P2Ptr": IWTP1, "P3Ptr": IWTP1, "P4Ptr": IWTP1, "P5Ptr": IWTP1, "P6Ptr": IWTP1, "P7Ptr": IWTP1 });

var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": 3, "TPPointer": PMAP2 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, "VLANFilterList": [SVIDs[1], SVIDs[2]], "ForwardOpr": 16, "NumberOfEntries": 2 });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, { "P0Ptr": IWTP2, "P1Ptr": IWTP2, "P2Ptr": IWTP2, "P3Ptr": IWTP2, "P4Ptr": IWTP2, "P5Ptr": IWTP2, "P6Ptr": IWTP2, "P7Ptr": IWTP2 });

// UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 3, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

//Rewrite 3 default to drop unrecognized frames
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
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

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 14,
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

// Set test specific translation CVID1/CPBIT1->SVID1/SPBIT1
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbits[0],
        "FilterInnerVID": CVIDs[0],
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits[0],
        "TreatInnerVID": SVIDs[0],
        "TreatInnerTPID": 6
    }
});

// Set test specific translation CVID1/CPBIT2->SVID1/SPBIT2
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbits[1],
        "FilterInnerVID": CVIDs[0],
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits[1],
        "TreatInnerVID": SVIDs[0],
        "TreatInnerTPID": 6
    }
});

// Set test specific translation CVID2/CPBIT3->SVID2/SPBIT3
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbits[2],
        "FilterInnerVID": CVIDs[1],
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits[2],
        "TreatInnerVID": SVIDs[1],
        "TreatInnerTPID": 6
    }
});

// Set test specific translation CVID3/CPBIT3->SVID3/SPBIT3
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbits[2],
        "FilterInnerVID": CVIDs[2],
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits[2],
        "TreatInnerVID": SVIDs[2],
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");


/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(SVIDs[0], 0xff, GEM1);
addTranslationEthToGpon(SVIDs[1], 0xff, GEM2);
addTranslationEthToGpon(SVIDs[2], 0xff, GEM2);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

for (var i = 0; i < 3; i++) {
    logInfo("Random values CVID" + (i + 1) + "=" + CVIDs[i]);
    logInfo("Random values SVID" + (i + 1) + "=" + SVIDs[i]);
}
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

testPassed("Starting traffics");
//// Traffic Generator config
if (TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file
    var verdict = true;
    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        var MAC3 = RandomUnicastMACAddressExcept([MAC1, MAC2]);
        var MAC4 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3]);
        var MAC5 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4]);
        var MAC6 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5]);
        var MAC7 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC6]);
        var MAC8 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC6, MAC7]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
        logInfo("Random value: MAC3=" + MAC3.hex(12, 0));
        logInfo("Random value: MAC4=" + MAC4.hex(12, 0));
        logInfo("Random value: MAC5=" + MAC5.hex(12, 0));
        logInfo("Random value: MAC6=" + MAC6.hex(12, 0));
        logInfo("Random value: MAC7=" + MAC7.hex(12, 0));
        logInfo("Random value: MAC8=" + MAC8.hex(12, 0));
    } else {
        var MAC1 = 0x102233445501;
        var MAC2 = 0x202233445502;
        var MAC3 = 0x302233445503;
        var MAC4 = 0x402233445504;
        var MAC5 = 0x502233445505;
        var MAC6 = 0x602233445506;
        var MAC7 = 0x702233445507;
        var MAC8 = 0x802233445508;
    }

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.29-1", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC],
        ["<MAC7>", MAC7, 0xC],
        ["<MAC8>", MAC8, 0xC]
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Ads": { "Frame Set Ads": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Bds": { "Frame Set Bds": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Cds": { "Frame Set Cds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Dds": { "Frame Set Dds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = verdict && local_verdict;

    sleep(TrafficGenerator.delayBeforeTraffic);

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.29-2", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC],
        ["<MAC7>", MAC7, 0xC],
        ["<MAC8>", MAC8, 0xC]
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Eds": { "Frame Set Eds": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Fds": { "Frame Set Fds": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Gds": { "Frame Set Gds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Hds": { "Frame Set Hds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = verdict && local_verdict;

    /// Connect to the TrafficGenerator
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.29-3", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC],
        ["<MAC7>", MAC7, 0xC],
        ["<MAC8>", MAC8, 0xC]
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Aus": { "Frame Set Aus": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Bus": { "Frame Set Bus": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Cus": { "Frame Set Cus": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Dus": { "Frame Set Dus": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend },
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = verdict && local_verdict;

    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.29-4", [
        ["<SVID1>", SVIDs[0], 3],
        ["<SVID2>", SVIDs[1], 3],
        ["<SVID3>", SVIDs[2], 3],
        ["<CVID1>", CVIDs[0], 3],
        ["<CVID2>", CVIDs[1], 3],
        ["<CVID3>", CVIDs[2], 3],
        ["<CPbit1>", CPbits[0] << 1, 1],
        ["<CPbit2>", CPbits[1] << 1, 1],
        ["<CPbit3>", CPbits[2] << 1, 1],
        ["<SPbit1>", SPbits[0] << 1, 1],
        ["<SPbit2>", SPbits[1] << 1, 1],
        ["<SPbit3>", SPbits[2] << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC],
        ["<MAC7>", MAC7, 0xC],
        ["<MAC8>", MAC8, 0xC]
    ]);
    /// Check verdict for all streams
    var local_verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set Eus": { "Frame Set Eus": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Fus": { "Frame Set Fus": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Gus": { "Frame Set Gus": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set Hus": { "Frame Set Hus": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend },
    });
    TrafficGenerator.Disconnect();
    if (local_verdict == false) logError("Error on received stream");
    verdict = verdict && local_verdict;

    if (!verdict)
        testFailed("Error on received stream");

    testPassedWithTraffic();
}
testPassed();