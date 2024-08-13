include("Config.js");

//Test case 6.1.8
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomIntegerExcept(1, 4094, [SVID1]); /// SVID2 randomly chosen in range [1..4094]
var SVID10 = RandomIntegerExcept(1, 4094, [SVID1, SVID2]); /// SVID10 randomly chosen in range [1..4094]
var SVID20 = RandomIntegerExcept(1, 4094, [SVID1, SVID2, SVID10]); /// SVID20 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var SPbits1 = RandomInteger(0, 7);
var SPbits2 = RandomIntegerExcept(0, 7, [SPbits1]);


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
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
var DwPQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

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
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": BPCD1, "VLANFilterList": [SVID10, SVID20], "ForwardOpr": 16, "NumberOfEntries": 2 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });

// CoS based on first 3 p-bits. All other pbit values get discarded due to null pointers in pbit mapper
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbits1, IWTP1],
    [SPbits2, IWTP2]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x88a8, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

//Translate SVID1 to SVID10 and keep pbit value
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 8,
        "FilterOuterVID": SVID1,
        "FilterOuterTPID": 5,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 9,
        "TreatInnerVID": SVID10,
        "TreatInnerTPID": 6
    }
});

//Translate SVID2 to SVID20 and keep pbit value
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 8,
        "FilterOuterVID": SVID2,
        "FilterOuterTPID": 5,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 0,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 9,
        "TreatInnerVID": SVID20,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { "AdminState": 0 });

testPassed("MIB Configuration set");


logInfo("Random values: SVID1=" + SVID1 + " ; SVID2=" + SVID2);
logInfo("Random values: SVID10=" + SVID10 + " ; SVID20=" + SVID20);
logInfo("Random values: SPbits1 = " + SPbits1);
logInfo("Random values: SPbits2 = " + SPbits2);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);

addTranslationEthToGpon(0xffff, SPbits1, GEM1);
addTranslationEthToGpon(0xffff, SPbits2, GEM2);


if (TrafficGenerator.activateAutomatisation) {
    var CVID1 = RandomIntegerExcept(1, 4094, [SVID1, SVID2, SVID10, SVID20]); /// CVID1 randomly chosen in range [1..4094]
    var CVID2 = RandomIntegerExcept(1, 4094, [SVID1, SVID2, SVID10, SVID20, CVID1]); /// CVID2 randomly chosen in range [1..4094]
    logInfo("Random values used for traffic: CVID1=" + CVID1 + " ; CVID2=" + CVID2);

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    } else {
        var MAC1 = 0x202233445501;
        var MAC2 = 0x102233445502;
    }

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.8", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<SVID10>", SVID10, 3],
        ["<SVID20>", SVID20, 3],
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<SPbits1>", SPbits1 << 1, 1],
        ["<SPbits2>", SPbits2 << 1, 1],
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