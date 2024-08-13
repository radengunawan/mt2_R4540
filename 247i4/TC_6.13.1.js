//Test Case on Performance Monitoring of Ethernet Frames
testPassed("Performance Monitoring on Ethernet Frames");

include("Config.js");

var time_before_EFEPM_clear = 10000; // milliseconds
var time_after_EFEPM_clear = 1000; // milliseconds
var time_before_EFEPM_reading = 60000; // milliseconds

var numberOfFrames = 10000;

function clearCounters(omcc, EFEPMs) {
    var verdict = true;
    for (var i = 0; i < EFEPMs.length; i++) {
        OMCI.Set(omcc, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, {
            Control_Block: {
                Parent_ME_Class: EFEPMs[i].Parent_ME_Class,
                Parent_ME_Instance: EFEPMs[i].Parent_ME_Instance,
                Accumulation_Disable: 0x8000,
                TCA_Disable: 0,
                Control_fields: EFEPMs[i].Control_fields,
                TCI: EFEPMs[i].TCI
            }
        });
    }

    sleep(2000); ///The clear action may take time to take effect

    for (var i = 0; i < EFEPMs.length; i++) {
        var resp = OMCI.Get(omcc, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["CRC_errored_Frames", "Frames", "Multicast_Frames"]);
        OMCI.logInfo("    CRC errored Frames:      " + resp["CRC_errored_Frames"]);
        OMCI.logInfo("    Frames:           " + resp["Frames"]);
        OMCI.logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
        if ((resp["CRC_errored_Frames"] != 0) ||
            (resp["Frames"] != 0) ||
            (resp["Multicast_Frames"] != 0)) {
            OMCI.logError("counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not cleared:");
            verdict = false;
        }
    }
    return verdict;
}

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomIntegerExcept(1, 4094, [SVID1]); /// SVID1 randomly chosen in range [1..4094]
var SVID3 = RandomIntegerExcept(1, 4094, [SVID1, SVID2]); /// SVID1 randomly chosen in range [1..4094]
var SVID4 = RandomIntegerExcept(1, 4094, [SVID1, SVID2, SVID3]); /// SVID1 randomly chosen in range [1..4094]
var SVID5 = RandomIntegerExcept(1, 4094, [SVID1, SVID2, SVID3, SVID4]); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7);
var SPbit2 = RandomIntegerExcept(0, 7, [SPbit1]);
var SPbit3 = RandomIntegerExcept(0, 7, [SPbit1, SPbit2]);
var SPbit4 = RandomIntegerExcept(0, 7, [SPbit1, SPbit2, SPbit3]);
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocIdNb1 = GEM1;
var AllocIdNb2 = GEM2;
var AllocIdNb3 = GEM3;

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

testPassed("MIB Upload");

OMCI.MIB_Upload(OMCC);

testPassed("Step 4. Cause the OLT emulator to send the configured OMCI message sequence to provision the ONU");

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

var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb1);
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb2);
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb3);
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdNb1, 100);
bwmapAddEntry(ONUID, AllocIdNb2, 100);
bwmapAddEntry(ONUID, AllocIdNb3, 100);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdNb1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocIdNb2 });
OMCI.Set(OMCC, "T_CONT", TCONT3, { AllocId: AllocIdNb3 });

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwPQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DwPQ2 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM3, TCONTPointer: TCONT3, TMPointerUp: UpPQ3, PQPointerDown: DwPQ3 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP3 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: 3, TPPointer: PMAP2 });
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 3, TPtype: 3, TPPointer: PMAP3 });
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, VLANFilterList: [SVID2], ForwardOpr: 16, NumberOfEntries: 1 });
var TF3 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD3, VLANFilterList: [SVID3, SVID4], ForwardOpr: 16, NumberOfEntries: 2 });

var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP2, GALProfilePointer: GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP3, ServiceProfilePointer: PMAP3, GALProfilePointer: GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
    [SPbit1, IWTP1],
    [SPbit2, IWTP1]
]));
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, { P0Ptr: IWTP2, P1Ptr: IWTP2, P2Ptr: IWTP2, P3Ptr: IWTP2, P4Ptr: IWTP2, P5Ptr: IWTP2, P6Ptr: IWTP2, P7Ptr: IWTP2 });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP3, OMCI.BuildPMapper([
    [SPbit3, IWTP3]
]));

// UNI side port
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 4, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { AssociationType: OMCI.GetTPAssociationType(OMCC), AssocMEPointer: OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x88a8, OutputTPID: 0x88a8, DownstreamMode: 0 });

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
// SVID1 && SPbit1, map 1:1 to allow passing flows A and E								 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: SPbit1,
        FilterInnerVID: SVID1,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});
// SVID1 && SPbit2, map 1:1 to allow passing flows B and F
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: SPbit2,
        FilterInnerVID: SVID1,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});
// SVID2 map to allow passing flow C & G
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 8,
        FilterInnerVID: SVID2,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});
// SPbit3 to allow passing flow D & H
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: SPbit3,
        FilterInnerVID: 4096,
        FilterInnerTPID: 5,
        FilterEtherType: 0,
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 8,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

testPassed("Step 5. Cause the OLT emulator to create Ethernet Frame Extended PM MEs");

/// Test Procedure Step 5:
// Create the counters, using multiple Ethernet Frame Extended PM Managed Entities.
//
// The control field is coded as:
// -----------------------------
// Upstream, no filter on VID or Pbit:         1 = 0x0001
// Upstream, filter on VID, not on Pbit:   32769 = 0x8001
// Upstream, filter on Pbit, not on VID:   16385 = 0x4001
// Upstream, filter on VID and Pbit:       49153 = 0xC001
// Downstream, no filter on VID or Pbit:       3 = 0x0003
// Downstream, filter on VID, not on Pbit: 32771 = 0x8003
// Downstream, filter on Pbit, not on VID: 16387 = 0x4003
// Downstream, filter on VID and Pbit:     49155 = 0xC003

// This assumes that continuous accumulation is always enabled (LSB = 1).

var EFEPMs = [{
        id: undefined,
        title: "PPTP Ethernet UNI, all upstream traffic", ///#0
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult_phase1: numberOfFrames * 4,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: numberOfFrames * 2
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, upstream traffic on SVID1 marked with SPbit1", ///#1
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC001,
        TCI: SVID1 | (SPbit1 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, upstream traffic on SVID1 marked with SPbit2", ///#2
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC001,
        TCI: SVID1 | (SPbit2 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all upstream traffic on SVID2", ///#3
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x8001,
        TCI: SVID2,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all upstream traffic marked with SPbit3", ///#4
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x4001,
        TCI: (SPbit3 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all downstream traffic", ///#5
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult_phase1: numberOfFrames * 4,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: numberOfFrames,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit1", ///#6
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC003,
        TCI: SVID1 | (SPbit1 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: -1, //we can not anticipate the result
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, downstream traffic on SVID1 marked with SPbit2", ///#7
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0xC003,
        TCI: SVID1 | (SPbit2 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: -1, //we can not anticipate the result
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all downstream traffic on SVID2", ///#8
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x8003,
        TCI: SVID2,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: -1, //we can not anticipate the result
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "PPTP Ethernet UNI, all downstream traffic marked with SPbit3", ///#9
        Parent_ME_Class: 11,
        Parent_ME_Instance: OMCITP,
        Control_fields: 0x4003,
        TCI: (SPbit3 << 13),
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: -1, //we can not anticipate the result
        expectedResult_phase3: 0
    },

    {
        id: undefined,
        title: "GEM 1, all upstream traffic", ///#10
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP1,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult_phase1: numberOfFrames * 2,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "GEM 2, all upstream traffic", ///#11
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP2,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "GEM 3, all upstream traffic", ///#12
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP3,
        Control_fields: 0x0001,
        TCI: 0,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: 0
    },
    {
        id: undefined,
        title: "GEM 1, all downstream traffic", ///#13
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP1,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult_phase1: numberOfFrames * 2,
        expectedResult_phase2_discard: numberOfFrames,
        expectedResult_phase2_forward: numberOfFrames,
        expectedResult_phase3: numberOfFrames
    },
    {
        id: undefined,
        title: "GEM 2, all downstream traffic", ///#14
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP2,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: numberOfFrames
    },
    {
        id: undefined,
        title: "GEM 3, all downstream traffic", ///#15
        Parent_ME_Class: 266,
        Parent_ME_Instance: IWTP3,
        Control_fields: 0x0003,
        TCI: 0,
        expectedResult_phase1: numberOfFrames,
        expectedResult_phase2_discard: 0,
        expectedResult_phase2_forward: 0,
        expectedResult_phase3: numberOfFrames
    },
];

for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("creating counter " + i + " for " + EFEPMs[i].title);
    EFEPMs[i].id = OMCI.Create(OMCC, "Ethernet_Frame_Extended_PM", {
        Control_Block: {
            Parent_ME_Class: EFEPMs[i].Parent_ME_Class,
            Parent_ME_Instance: EFEPMs[i].Parent_ME_Instance,
            Accumulation_Disable: 0,
            TCA_Disable: 0,
            Control_fields: EFEPMs[i].Control_fields,
            TCI: EFEPMs[i].TCI
        }
    });
}

testPassed("OMCI Configuration complete");

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("Step 6. Cause the OLT emulator to retrieve all ONU counters");
for (var i = 0; i < EFEPMs.length; i++) {
    logInfo("Getting counters " + i + " (" + EFEPMs[i].title + "):");
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    if (resp == undefined)
        testFailed("No answer for counters " + i + " (" + EFEPMs[i].title + ") at step 5");
    OMCI.logInfo("    Frames:           " + resp["Frames"]);
    OMCI.logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
}

sleep(time_before_EFEPM_clear);

testPassed("Step 7 & 8. Clearing all ONU counters, and checks");

clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);


/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(SVID1, SPbit1, GEM1);
addTranslationEthToGpon(SVID1, SPbit2, GEM1);
addTranslationEthToGpon(SVID2, 0xff, GEM2);
addTranslationEthToGpon(0xffff, SPbit3, GEM3);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);
addTranslationGponToEth(GEM3);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SVID2=" + SVID2);
logInfo("Random value: SVID3=" + SVID3);
logInfo("Random value: SVID4=" + SVID4);
logInfo("Random value: SVID5=" + SVID5);
logInfo("Random value: SPbit1=" + SPbit1);
logInfo("Random value: SPbit2=" + SPbit2);
logInfo("Random value: SPbit3=" + SPbit3);
logInfo("Random value: SPbit4=" + SPbit4);

logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);

testPassed("Starting traffics");

//// Traffic Generator config

testPassed("Step 9. Cause the Traffic Generator to send 10 000 packets for each flow, upstream and downstream");

var verdict = true;

if (TrafficGenerator.activateAutomatisation) {
    ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// nbOfPacketToSend: Nb of packet to send in automatisation
        {
            name: "nbOfPacketToSend",
            defaultValue: numberOfFrames,
            dsts: ["TrafficGenerator", "MT2EthTG", "PCAP", "STC", "Xena"]
        }
    ]);

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);
        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    }

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result_step9 = TrafficGenerator.SendTemplateConfigAndDoTest("6.13.1-1", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<SVID3>", SVID3, 3],
        ["<SVID4>", SVID4, 3],
        ["<SVID5>", SVID5, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<SPbit4>", SPbit4 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ]);

    /// Check verdict for all streams
    var verdictPartial = TrafficGenerator.ApplyVerdict(result_step9, {
        "Frame Set A": { "Frame Set A": numberOfFrames, "TID 1:0": numberOfFrames },
        "Frame Set B": { "Frame Set B": numberOfFrames, "TID 2:0": numberOfFrames },
        "Frame Set C": { "Frame Set C": numberOfFrames, "TID 3:0": numberOfFrames },
        "Frame Set D": { "Frame Set D": numberOfFrames, "TID 4:0": numberOfFrames },
        "Frame Set E": { "Frame Set E": numberOfFrames, "TID 5:1": numberOfFrames },
        "Frame Set F": { "Frame Set F": numberOfFrames, "TID 6:1": numberOfFrames },
        "Frame Set G": { "Frame Set G": numberOfFrames, "TID 7:1": numberOfFrames },
        "Frame Set H": { "Frame Set H": numberOfFrames, "TID 8:1": numberOfFrames }
    });

    TrafficGenerator.Disconnect();
    verdict = verdict && verdictPartial;
    if (verdictPartial == false) logError("Error on received stream");
} else {
    popup("Action", "Run " + numberOfFrames + " frames for stream A, B, C, D, F, G, H, then click OK");
}


sleep(time_before_EFEPM_reading);
testPassed("Step 10. Cause the OLT emulator to retrieve all ONU counters");
for (var i = 0; i < EFEPMs.length; i++) {
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    OMCI.logInfo("    Frames:           " + resp["Frames"]);
    OMCI.logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if (resp["Multicast_Frames"] != 0) {
        logError("Pass/Fail 6: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not correct");
        logError("    Multicast_Frames: " + resp["Multicast_Frames"]);
        verdict = false;
    }
    if (resp["Frames"] != EFEPMs[i].expectedResult_phase1) {
        logError("Pass/Fail 5: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not properly incremented");
        logError("    frames:           " + resp["Frames"] + " (expected: " + EFEPMs[i].expectedResult_phase1 + ")");
        verdict = false;
    }
}

sleep(time_before_EFEPM_clear);

testPassed("Step 11 & 12. Cause the OLT emulator clear all ONU counters & check");

clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

delAllTranslationRules();
addTranslationEthToGpon(SVID1, SPbit3, GEM1);

testPassed("Step 13. Cause the Traffic Generator to send fo flow I");


var verdictDiscard = false;
if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    var result_step9 = TrafficGenerator.SendTemplateConfigAndDoTest("6.13.1-2", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<SVID3>", SVID3, 3],
        ["<SVID4>", SVID4, 3],
        ["<SVID5>", SVID5, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<SPbit4>", SPbit4 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ]);

    /// Check verdict for all streams
    verdictDiscard = TrafficGenerator.ApplyVerdict(result_step9, {
        "Frame Set I": { "All Ds": 0, "TID 5:1": 0 }
    });
    var verdictForward = TrafficGenerator.ApplyVerdict(result_step9, {
        "Frame Set I": { "All Ds": numberOfFrames, "TID 5:1": numberOfFrames }
    });

    TrafficGenerator.Disconnect();

    if (!(verdictDiscard || verdictForward)) {
        //One or the other must be valid
        verdict = false;
        logError("Flow I should either be forwarded or discarded");
    }
    if (verdictDiscard)
        logInfo("ONU is discarding flow I");
    else
        logInfo("ONU is forwarding flow I");

}

sleep(time_before_EFEPM_reading);
testPassed("Step 14. Cause the OLT emulator to retrieve all ONU counters");

for (var i = 0; i < EFEPMs.length; i++) {
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    OMCI.logInfo("    Frames:           " + resp["Frames"]);
    OMCI.logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if (resp["Multicast_Frames"] != 0) {
        logError("Pass/Fail 6: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not correct");
        logError("    Multicast_Frames: " + resp["Multicast_Frames"]);
        verdict = false;
    }
    var expectedFramesCounter = EFEPMs[i].expectedResult_phase2_forward;
    if (verdictDiscard)
        expectedFramesCounter = EFEPMs[i].expectedResult_phase2_discard;
    if (expectedFramesCounter >= 0) {
        if (resp["Frames"] != expectedFramesCounter) {
            logError("Pass/Fail 5: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are " + ((expectedFramesCounter == 0) ? "wrongly incremented" : "not properly incremented"));
            logError("    frames:           " + resp["Frames"] + " (expected: " + expectedFramesCounter + ")");
            verdict = false;
        }
    }
}

sleep(time_before_EFEPM_clear);

testPassed("Step 15 & 16. Cause the OLT emulator clear all ONU counters & check");

clearCounters(OMCC, EFEPMs);

sleep(time_after_EFEPM_clear);

testPassed("Step 17.... Cause the Traffic Generator to send fo flow M, N, J, K, L & retrieve counters");

addTranslationEthToGpon(SVID2, SPbit1, GEM1);
addTranslationEthToGpon(SVID1, SPbit2, GEM2);
addTranslationEthToGpon(SVID5, SPbit1, GEM3);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);
addTranslationGponToEth(GEM3);


if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    sleep(TrafficGenerator.delayBeforeTraffic);
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    var result_step17 = TrafficGenerator.SendTemplateConfigAndDoTest("6.13.1-3", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<SVID3>", SVID3, 3],
        ["<SVID4>", SVID4, 3],
        ["<SVID5>", SVID5, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<SPbit2>", SPbit2 << 1, 1],
        ["<SPbit3>", SPbit3 << 1, 1],
        ["<SPbit4>", SPbit4 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ]);

    /// Check verdict for all streams
    var verdictPartial = TrafficGenerator.ApplyVerdict(result_step17, {
        "Frame Set M": { "All Us": 0, "TID 1:0": 0 },
        "Frame Set N": { "All Us": 0, "TID 2:0": 0 },

        "Frame Set J": { "All Ds": 0, "TID 6:1": 0 },
        "Frame Set K": { "All Ds": 0, "TID 7:1": 0 },
        "Frame Set L": { "All Ds": 0, "TID 8:1": 0 }
    });

    TrafficGenerator.Disconnect();
    verdict = verdict & verdictPartial;
    if (verdictPartial == false) logError("Error on received stream");

} else {
    popup("Action", "Run " + numberOfFrames + " frames for stream I, J, K, L, M, N, then click OK");
}

sleep(time_before_EFEPM_reading);


testPassed("Step 10. Cause the OLT emulator to retrieve all ONU counters");
for (var i = 0; i < EFEPMs.length; i++) {
    var resp = OMCI.Get(OMCC, "Ethernet_Frame_Extended_PM", EFEPMs[i].id, ["Frames", "Multicast_Frames"]);
    OMCI.logInfo("    Frames:           " + resp["Frames"]);
    OMCI.logInfo("    Multicast_Frames: " + resp["Multicast_Frames"]);
    if (resp["Multicast_Frames"] != 0) {
        logError("Pass/Fail 6: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not correct");
        logError("    Multicast_Frames: " + resp["Multicast_Frames"]);
        verdict = false;
    }
    if (resp["Frames"] != EFEPMs[i].expectedResult_phase3) {
        logError("Pass/Fail 5: counters for EFEPM " + i + " (" + EFEPMs[i].title + ") are not properly incremented");
        logError("    frames:           " + resp["Frames"] + " (expected: " + EFEPMs[i].expectedResult_phase3 + ")");
        verdict = false;
    }
}

if (verdict == false) testFailed("Error on counters");

if (TrafficGenerator.activateAutomatisation) {
    testPassedWithTraffic();
}


testPassed();
