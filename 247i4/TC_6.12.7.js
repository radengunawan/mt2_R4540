//Create, Delete and Add New Services in Strict Priority Downstream Scheduling Context
testPassed("Create, Delete and Add New Services in Strict Priority Downstream Scheduling Context");
include("Config.js");

/// Initialize Variables
var LossToleranceRatio = 0.001;
var MinLossRatio = 0.1;
var testPriorities = true; ///is set to false, this is equivalent to test 6.12.7
var baseBitRate = 1000; ///in PacketsPerSecond. flows will start at baseBitRate
var portSpeedMbps = 100;

var testPhaseLength = 20000; ///increase for ONUs with larger buffer
var packetModifier = 0xFFFF0000;
var maxPackets2Exponent = 15; ///MAX 15
var maxPacketsMask = (0x0000FFFF << maxPackets2Exponent) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?LAST packet in the traffic analysis period?
var packetOffset2Exponent = 11; /// SETTABLE / MAX< maxPackets2Exponent: Exponent of the number of the ?FIRST packet in the traffic analysis?
var packetOffsetMask = ((0x0000FFFF << packetOffset2Exponent) & (~maxPacketsMask)) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?FIRST packet in the traffic analysis?, taking into account the mask of the ?LAST packet in the traffic analysis?.

var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var SVID1 = RandomIntegerExcept(1, 4094, [CVID1]);
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1, SVID1]);
var SVID2 = RandomIntegerExcept(1, 4094, [CVID1, SVID1, CVID2]);
var CPbit1 = RandomInteger(0, 7);
var SPbit1 = RandomIntegerExcept(0, 7, [CPbit1]);
var CPbit2 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1]);
var SPbit2 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1, CPbit2]);
var CPbit3 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1, CPbit2, SPbit2]);
var SPbit3 = RandomIntegerExcept(0, 7, [CPbit1, SPbit1, CPbit2, SPbit2, CPbit3]);

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
    var MAC5 = 0x302233445505;
    var MAC6 = 0x402233445506;

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        var MAC3 = RandomUnicastMACAddressExcept([MAC1, MAC2]);
        var MAC4 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3]);
        var MAC5 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4]);
        var MAC6 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
        logInfo("Random value: MAC3=" + MAC3.hex(12, 0));
        logInfo("Random value: MAC4=" + MAC4.hex(12, 0));
        logInfo("Random value: MAC5=" + MAC4.hex(12, 0));
        logInfo("Random value: MAC6=" + MAC4.hex(12, 0));
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

logInfo("################################");
logInfo("################################");
testPassed("Loading OMCI configuration 1");

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var TCONT2 = OMCI.GetTCONT(OMCC, 1);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
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
// Create GEM ports
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ2 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP1 });
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": 3, "TPPointer": PMAP2 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
    [SPbit1, IWTP1]
]));
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
    [SPbit2, IWTP2]
]));

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

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbit2,
        "FilterInnerVID": CVID1,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbit2,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");

/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(SVID1, SPbit1, GEM1);
addTranslationEthToGpon(SVID1, SPbit2, GEM2);
addTranslationEthToGpon(SVID2, SPbit3, GEM2);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

logInfo("Random value: CVID1=" + CVID1 + ", CVID2=" + CVID2);
logInfo("Random value: CPbit1=" + CPbit1 + ", CPbit2=" + CPbit2 + ", CPbit3=" + CPbit3);
logInfo("Random value: SVID1=" + SVID1 + ", SVID2=" + SVID2);
logInfo("Random value: SPbit1=" + SPbit1 + ", SPbit2=" + SPbit2 + ", SPbit3=" + SPbit3);

logInfo("################################");
testPassed("Testing configuration 1 -- Step 6 & 7");

if (TrafficGenerator.activateAutomatisation) {

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-us", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set E": { "Frame Set E": 0, "TID 3:0": 0 }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false) {
        testFailed("Error on received stream");
    }

    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-ds", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);

    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "TID 4:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set D": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set F": { "Frame Set F": 0, "TID 6:1": 0 }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) {

        testFailed("Error on received stream");
    }

} else {}

if (testPriorities) {
    logInfo("################################");
    testPassed("Testing priorisation, with flow D being high priority and flow C low priority -- Step 8 & 9");

    if (TrafficGenerator.activateAutomatisation) {
        sleep(TrafficGenerator.delayBeforeTraffic);

        /// Connect to the TrafficGenerator
        TrafficGenerator.Connect();

        /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
        var struct = TrafficGenerator.SendTemplateConfig("6.12.7-2", [
            ["<MOD>", packetModifier],
            ["<PACKETMAXMASK>", maxPacketsMask, 4],
            ["<PACKETOFFSETMASK>", packetOffsetMask, 4],
            ["<SPbit1>", SPbit1 << 1, 1],
            ["<SVID1>", SVID1, 3],
            ["<CPbit1>", CPbit1 << 1, 1],
            ["<CVID1>", CVID1, 3],
            ["<SPbit2>", SPbit2 << 1, 1],
            ["<SVID2>", SVID2, 3],
            ["<CPbit2>", CPbit2 << 1, 1],
            ["<CVID2>", CVID2, 3],
            ["<SPbit3>", SPbit3 << 1, 1],
            ["<CPbit3>", CPbit3 << 1, 1],
            ["<MAC1>", MAC1, 0xC],
            ["<MAC2>", MAC2, 0xC],
            ["<MAC3>", MAC3, 0xC],
            ["<MAC4>", MAC4, 0xC],
            ["<MAC5>", MAC5, 0xC],
            ["<MAC6>", MAC6, 0xC]
        ]);

        TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

        sleep(TrafficGenerator.delayBeforeTraffic);

        var flowStates = [
            ///Flow with increasing datarate first
            {
                name: "D",
                flowIndex: 2,
                filterIndex: 1,
                TID: 2,
                priority: 2,
                bitRatePPS: baseBitRate,
                bitRateIncrementPPS: baseBitRate
            }, {
                name: "C",
                flowIndex: 1,
                filterIndex: 0,
                TID: 1,
                priority: 1,
                bitRatePPS: baseBitRate,
                bitRateIncrementPPS: 0
            }
        ];

        verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
            loseTolerance: LossToleranceRatio, //1%
            remainTolerance: MinLossRatio, //2%
            transitionPhaseLength: 4000,
            testPhaseLength: testPhaseLength,
            packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
            maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
            portSpeedMbps: portSpeedMbps, //mbps
            firstStep: 8, //from test description
            lastStep: 8, //from test description,
            useRepeatModifier: true,
            modifierPos: 120
        });

        TrafficGenerator.Disconnect();

        if (!verdict) {
            testFailed("Priority is not respected: stream A loss when it is High Priority");
        }
    } else {}
}
logInfo("################################");
logInfo("################################");
testPassed("Delete Service -- Step 10");

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
    [SPbit2, 0xFFFF]
]));
OMCI.Delete(OMCC, "GEM_Interworking_Termination_Point", IWTP2);
OMCI.Delete(OMCC, "VLAN_Tagging_Filter_Data", TF2);
OMCI.Delete(OMCC, "MAC_Bridge_Port_Configuration_Data", BPCD2);
OMCI.Delete(OMCC, "Pbit_Mapper_Service_Profile", PMAP2);
OMCI.Delete(OMCC, "GEM_Port_Network_CTP", CTP2);

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbit2,
        "FilterInnerVID": CVID1,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 3,
        "Padding3": 0x3FF,
        "TreatOuterPriority": 0x0f,
        "TreatOuterVID": 0x1fff,
        "TreatOuterTPID": 0x07,
        "Padding4": 0xfff,
        "TreatInnerPriority": 0x0f,
        "TreatInnerVID": 0x1fff,
        "TreatInnerTPID": 0x07
    }
});

logInfo("################################");
testPassed("Testing configuration between 1&2 -- Step 11 & 12");

if (TrafficGenerator.activateAutomatisation) {
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-us", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": {
            "Frame Set A": TrafficGenerator.nbOfPacketToSend,
            "TID 1:0": TrafficGenerator.nbOfPacketToSend
        },
        "Frame Set B": {
            "Frame Set B": 0,
            "TID 2:0": 0
        },
        "Frame Set E": {
            "Frame Set E": 0,
            "TID 3:0": 0
        }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) {

        testFailed("Error on received stream");
    }
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-ds", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "TID 4:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set D": 0, "TID 5:1": 0 },
        "Frame Set F": { "Frame Set F": 0, "TID 6:1": 0 }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false) {
        testFailed("Error on received stream");
    }

} else {}

logInfo("################################");
logInfo("################################");
testPassed("Create new Service -- Step 13");

var DwPQ3 = OMCI.GetDwPQ(OMCC, 2);

var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DwPQ3 });
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": 3, "TPPointer": PMAP2 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, "VLANFilterList": [SVID2], "ForwardOpr": 16, "NumberOfEntries": 1 });

var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
    [SPbit3, IWTP2]
]));

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": CPbit3,
        "FilterInnerVID": CVID2,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbit3,
        "TreatInnerVID": SVID2,
        "TreatInnerTPID": 6
    }
});

logInfo("################################");
testPassed("Testing configuration 2 -- Step 14 & 15");

if (TrafficGenerator.activateAutomatisation) {
    sleep(TrafficGenerator.delayBeforeTraffic);
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-us", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set B": 0, "TID 2:0": 0 },
        "Frame Set E": { "Frame Set E": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false) {

        testFailed("Error on received stream");
    }

    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.7-1-ds", [
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SVID1>", SVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<CVID1>", CVID1, 3],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SVID2>", SVID2, 3],
        ["<CPbit2>", CPbit2 << 1, 1],
        ["<CVID2>", CVID2, 3],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<CPbit3>", CPbit3 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC],
        ["<MAC5>", MAC5, 0xC],
        ["<MAC6>", MAC6, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "TID 4:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set D": 0, "TID 5:1": 0 },
        "Frame Set F": { "Frame Set F": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false) {
        testFailed("Error on received stream");
    }

} else {}

if (testPriorities) {

    logInfo("################################");
    testPassed("Testing priorisation, Testing priorisation, with flow D being high priority and flow C low priority -- Step 16 & 17");

    if (TrafficGenerator.activateAutomatisation) {
        sleep(TrafficGenerator.delayBeforeTraffic);
        /// Connect to the TrafficGenerator
        TrafficGenerator.Connect();

        /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
        var struct = TrafficGenerator.SendTemplateConfig("6.12.7-2", [
            ["<MOD>", packetModifier],
            ["<PACKETMAXMASK>", maxPacketsMask, 4],
            ["<PACKETOFFSETMASK>", packetOffsetMask, 4],
            ["<SPbit1>", SPbit1 << 1, 1],
            ["<SVID1>", SVID1, 3],
            ["<CPbit1>", CPbit1 << 1, 1],
            ["<CVID1>", CVID1, 3],
            ["<SPbit2>", SPbit2 << 1, 1],
            ["<SVID2>", SVID2, 3],
            ["<CPbit2>", CPbit2 << 1, 1],
            ["<CVID2>", CVID2, 3],
            ["<SPbit3>", SPbit3 << 1, 1],
            ["<CPbit3>", CPbit3 << 1, 1],
            ["<MAC1>", MAC1, 0xC],
            ["<MAC2>", MAC2, 0xC],
            ["<MAC3>", MAC3, 0xC],
            ["<MAC4>", MAC4, 0xC],
            ["<MAC5>", MAC5, 0xC],
            ["<MAC6>", MAC6, 0xC]
        ]);

        TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

        sleep(TrafficGenerator.delayBeforeTraffic);

        var flowStates = [
            ///Flow with increasing datarate first
            {
                name: "C",
                flowIndex: 1,
                filterIndex: 0,
                TID: 1,
                priority: 2,
                bitRatePPS: baseBitRate,
                bitRateIncrementPPS: baseBitRate
            }, {
                name: "F",
                flowIndex: 3,
                filterIndex: 2,
                TID: 3,
                priority: 1,
                bitRatePPS: baseBitRate,
                bitRateIncrementPPS: 0
            }
        ];

        verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
            loseTolerance: LossToleranceRatio, //1%
            remainTolerance: MinLossRatio, //2%
            transitionPhaseLength: 4000,
            testPhaseLength: testPhaseLength,
            packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
            maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
            portSpeedMbps: portSpeedMbps, //mbps
            firstStep: 16, //from test description
            lastStep: 16, //from test description,
            useRepeatModifier: true,
            modifierPos: 120
        });

        TrafficGenerator.Disconnect();
        if (!verdict) {
            testFailed("Priority is not respected: stream A loss when it is High Priority");
        }
        testPassedWithTraffic();
    } else {}
}

testPassed();