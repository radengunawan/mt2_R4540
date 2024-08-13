include("Config.js");

//Test case 6.1.27 Deriving p-bits as a function of received user port -- split from issue 1 test case 6.1.12
//According to TR-156, each UNI gets its own bridge.

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var CVID1 = RandomIntegerExcept(1, 4094, [SVID1]); /// CVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var SPbits1 = RandomInteger(0, 7);
var SPbits2 = RandomIntegerExcept(0, 7, [SPbits1]);
var CPbits1 = RandomIntegerExcept(0, 7, [SPbits1, SPbits2]);

TrafficGenerator.GEMTranslationMode = LoadValue('GEMTranslationMode', 'ignore');///acceptable values: 'ignore', 'legacy'

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
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0, 1);
var DwPQ2 = OMCI.GetDwPQ(OMCC, 0, 2);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);
var OMCITP2 = OMCI.GetTerminationPoint(OMCC, 1);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT1 with the Alloc Id1
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId2, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT2 with the Alloc Id2
OMCI.Set(OMCC, "T_CONT", TCONT2, { "AllocId": AllocId2 });

/// Send config
// Create GEM port GEM1 through GEM2

var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DwPQ2 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
//Create one bridge per UNI
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var BSP2 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
//Create one p-bit mapper per UNI
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port 1
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP1, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP1 });
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": [BPCD1], "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });

//ANI side port bridge 2
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP2, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP2 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": [BPCD2], "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });

// CoS based on first 3 p-bits. All other pbit values get discarded due to null pointers in pbit mapper
// var PMAPPbit1 = new Object();
// PMAPPbit1["P"+SPbits1+"Ptr"] = IWTP1;
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
            [SPbits1, IWTP1]
]));
// var PMAPPbit2 = new Object();
// PMAPPbit2["P"+SPbits2+"Ptr"] = IWTP2;
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
            [SPbits2, IWTP2]
]));

//UNI side Bridge 1
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP1, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

//Add SVID1 to all CVID1 frames. Use pbit value of Pbit1
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 4096,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

//Add SVID1 to all untagged frames. Use pbit value of Pbit1
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 15,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 0,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 4096,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

//UNI side bridge 2
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP2, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP2 });
var EVTOCD2 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP2 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

//Add SVID1 to all CVID1 frames. Use pbit value of Pbit2
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 4096,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits2,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

//Add SVID1 to all untagged frames. Use pbit value of Pbit2
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 15,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 0,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 4096,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits2,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { "AdminState": 0 });
// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP2, { "AdminState": 0 });

/// All frame received from GEM1 to GEM2 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

logInfo("Random values: SVID1=" + SVID1 + " CVID1=" + CVID1);
logInfo("Random values: SPbits1 = " + SPbits1 + " ; SPbits2 = " + SPbits2);
logInfo("Random values: CPbits1 = " + CPbits1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    var MAC3 = 0x102233445503;
    var MAC4 = 0x202233445504;

    var GEMTable = {
        "Frame Set A": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set B": [0xffff, 0xff, 0xffff, GEM2],
        "Frame Set C": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set D": [0xffff, 0xff, 0xffff, GEM2]
    };

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.27", [
                ["<SVID1>", SVID1, 3],
                ["<CVID1>", CVID1, 3],
                ["<SPbits1>", SPbits1 << 1, 1],
                ["<SPbits2>", SPbits2 << 1, 1],
                ["<CPbits1>", CPbits1 << 1, 1],
                ["<MAC1>", MAC1, 0xC],
                ["<MAC2>", MAC2, 0xC],
                ["<MAC3>", MAC3, 0xC],
                ["<MAC4>", MAC4, 0xC]
            ], GEMTable);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "Frame Set B": 0, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set A": 0, "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set C": { "Frame Set C": TrafficGenerator.nbOfPacketToSend, "Frame Set D": 0, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set C": 0, "Frame Set D": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false)
        testFailed("Error on received stream");
    else
        testPassedWithTraffic();
}

testPassed();
