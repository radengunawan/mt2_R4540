include("Config.js");

//Test case 6.1.17 - VID Support for Priority Tagged Frames with Priority Preservation (1:1 VLAN Architecture Double-Tagged at the V Interface)
/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1]); /// CVID2 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var CPbits1 = RandomInteger(0, 7);
var CPbits2 = RandomIntegerExcept(0, 7, [CPbits1]);
var CPbits4 = RandomIntegerExcept(0, 7, [CPbits1, CPbits2]);

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
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DnUni1PQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": BPCD1, "VLANFilterList": [CVID1, CVID2], "ForwardOpr": 16, "NumberOfEntries": 2 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, { "P0Ptr": IWTP1, "P1Ptr": IWTP1, "P2Ptr": IWTP1, "P3Ptr": IWTP1, "P4Ptr": IWTP1, "P5Ptr": IWTP1, "P6Ptr": IWTP1, "P7Ptr": IWTP1 });

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

// Filtering/Tagging for IPoE Priority Tagged (VID=0)
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 0,
        "FilterInnerTPID": 0,
        "FilterEtherType": 1,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 8,
        "TreatInnerVID": CVID1,
        "TreatInnerTPID": 4
    }
});

// Filtering/Tagging for PPPoE Priority Tagged (VID=0)
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 0,
        "FilterInnerTPID": 0,
        "FilterEtherType": 2,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 8,
        "TreatInnerVID": CVID2,
        "TreatInnerTPID": 4
    }
});
// Filtering/Tagging for ARP Priority Tagged (VID=0)
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": 8,
        "FilterInnerVID": 0,
        "FilterInnerTPID": 0,
        "FilterEtherType": 3,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 8,
        "TreatInnerVID": CVID1,
        "TreatInnerTPID": 4
    }
});

OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { "AdminState": 0 });

/// All frame received from GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);

logInfo("Random value: CVID1=" + CVID1);
logInfo("Random value: CVID2=" + CVID2);
logInfo("Random value: CPbits1=" + CPbits1);
logInfo("Random value: CPbits2=" + CPbits2);
logInfo("Random value: CPbits4=" + CPbits4);
logInfo("Random value: GEM1=" + GEM1);

if (TrafficGenerator.activateAutomatisation) {

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        var MAC3 = RandomUnicastMACAddressExcept([MAC1, MAC2]);
        var MAC4 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3]);
        var MAC5 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4]);
        var MAC6 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5]);
        var MAC7 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC6]);
        var MAC8 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC7, MAC8]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
        logInfo("Random value: MAC3=" + MAC3.hex(12, 0));
        logInfo("Random value: MAC4=" + MAC4.hex(12, 0));
        logInfo("Random value: MAC5=" + MAC5.hex(12, 0));
        logInfo("Random value: MAC6=" + MAC6.hex(12, 0));
        logInfo("Random value: MAC7=" + MAC7.hex(12, 0));
        logInfo("Random value: MAC8=" + MAC8.hex(12, 0));
    } else {
        logInfo("No MAC Adresses randomisation");
        var MAC1 = 0x102233445501;
        var MAC2 = 0x202233445502;
        var MAC3 = 0x102233445503;
        var MAC4 = 0x202233445504;
        var MAC5 = 0x102233445505;
        var MAC6 = 0x202233445506;
        var MAC7 = 0x102233445507;
        var MAC8 = 0x202233445508;
    }
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.17", [
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CPbits1>", CPbits1 << 1, 1],
        ["<CPbits2>", CPbits2 << 1, 1],
        ["<CPbits4>", CPbits4 << 1, 1],
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
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "Frame Set B": 0, "Frame Set C": 0, "Frame Set D": 0, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set A": 0, "Frame Set B": TrafficGenerator.nbOfPacketToSend, "Frame Set C": 0, "Frame Set D": 0, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set C": { "Frame Set A": 0, "Frame Set B": 0, "Frame Set C": TrafficGenerator.nbOfPacketToSend, "Frame Set D": 0, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set D": { "Frame Set A": 0, "Frame Set B": 0, "Frame Set C": 0, "Frame Set D": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}

testPassed();