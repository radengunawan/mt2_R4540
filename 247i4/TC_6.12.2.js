///%%Test Case on creation and modification of the configuration%%

include("Config.js");

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomInteger(1, 4094, [SVID1]);
var CVID1 = RandomInteger(1, 4094, [SVID1, SVID2]);
var CVID2 = RandomInteger(1, 4094, [SVID1, SVID2, CVID1]);
var CPbit1 = RandomInteger(0, 7);
var CPbit2 = RandomIntegerExcept(0, 7, [CPbit1]);
var SPbit1 = RandomIntegerExcept(0, 7, [CPbit1, CPbit2]);
var SPbit2 = RandomIntegerExcept(0, 7, [CPbit1, CPbit2, SPbit1]);
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocIdNb = GEM1;

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

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdNb, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdNb });

logInfo("#############################");
testPassed("Step 4. Cause the OLT emulator to send the configured OMCI message sequence to provision the ONU (Configuration1)");

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbit1, IWTP1]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { AssociationType: OMCI.GetTPAssociationType(OMCC), AssocMEPointer: OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, DownstreamMode: 0 });

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

//Set the test specific tag rule												 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbit1,
        FilterInnerVID: CVID1,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbit1,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});
// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB Configuration set");

/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, 0xff, GEM1);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);


logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SVID2=" + SVID2);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random value: SPbit2=" + SPbit2);
logInfo("Random value: CVID1=" + CVID1);
logInfo("Random value: CVID2=" + CVID2);
logInfo("Random value: CPbit1=" + CPbit1);
logInfo("Random value: CPbit2=" + CPbit2);
logInfo("Random value: GEM1=" + GEM1);

testPassed("Starting traffics");

//// Traffic Generator config

// PORT1 connected to eOLT Eth port
// PORT1 : Stream E, double tagged traffic with SVID1

// PORT2 connected to ONT first eth port
// PORT2 : Stream A, untagged traffic
// PORT2 : Stream B, single tagged traffic
// PORT2 : Stream C, double tagged traffic

if (TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file
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
    } else {
        var MAC1 = 0x102233445501;
        var MAC2 = 0x202233445502;
        var MAC3 = 0x102233445503;
        var MAC4 = 0x202233445504;
    }

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.2-1", [
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
    var verdict_US = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set C": { "Frame Set C": 0, "TID 2:0": 0 }
    });

    TrafficGenerator.Disconnect();
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.2-2", [
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
    var verdict_DS = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set B": { "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 3:1": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set D": 0, "TID 4:1": 0 },
    });
    TrafficGenerator.Disconnect();
    if (verdict_US == false) {
        testFailed("Error on received upstream stream");
    }
    if (verdict_DS == false) {
        testFailed("Error on received downstream stream");
    }

} else {
    popup("Test Configuration 1", "Run Traffic Stream Configuration 1, then click OK.");
}

logInfo("#############################");
testPassed("Step 7. Cause the OLT Emulator to modify the service configuration on the ONU (Configuration 2)"); //(MIB reset is not allowed), the same service configuration is used only VID, P-bit and filter are modified (Configuration 2)

OMCI.Set(OMCC, "VLAN_Tagging_Filter_Data", TF, { VLANFilterList: [SVID2], ForwardOpr: 16, NumberOfEntries: 1 });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbit2, IWTP1],
    [SPbit1, 0xffff]
]));

//remove existing rule											 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbit1,
        FilterInnerVID: CVID1,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        Padding3: 0x3FF,
        TreatOuterPriority: 0x0f,
        TreatOuterVID: 0x1fff,
        TreatOuterTPID: 0x07,
        Padding4: 0xfff,
        TreatInnerPriority: 0x0f,
        TreatInnerVID: 0x1fff,
        TreatInnerTPID: 0x07
    }
});

//Set the test specific tag rule												 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: CPbit2,
        FilterInnerVID: CVID2,
        FilterInnerTPID: 4,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: SPbit2,
        TreatInnerVID: SVID2,
        TreatInnerTPID: 6
    }
});


sleep(TrafficGenerator.delayBeforeTraffic);

if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.2-1", [
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
    var verdict_US = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": 0, "TID 1:0": 0 },
        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend }
    });

    TrafficGenerator.Disconnect();
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.2-2", [
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
    var verdict_DS = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set B": { "Frame Set B": 0, "TID 3:1": 0 },
        "Frame Set D": { "Frame Set D": TrafficGenerator.nbOfPacketToSend, "TID 4:1": TrafficGenerator.nbOfPacketToSend },
    });
    TrafficGenerator.Disconnect();
    if (verdict_US == false) {
        testFailed("Error on received upstream stream");
    }
    if (verdict_DS == false) {
        testFailed("Error on received downstream stream");
    }
    testPassedWithTraffic();
} else {
    popup("Test Configuration 1", "Run Traffic Stream Configuration 1, then click OK.");
}
testPassed();