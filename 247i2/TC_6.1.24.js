include("Config.js");

//Test case 6.1.3
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId = GEM1;
var SPbits1 = RandomInteger(0, 7);
var SPbits3 = RandomIntegerExcept(0, 7, [SPbits1]);
var SPbits2 = RandomIntegerExcept(0, 7, [SPbits1, SPbits3]);
var SPbits4 = RandomIntegerExcept(0, 7, [SPbits1, SPbits3, SPbits2]);

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
bwmapAddEntry(ONUID, AllocId, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId });

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });

var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
            [SPbits1, IWTP1],
            [SPbits2, IWTP2]
]));

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x88a8, "OutputTPID": 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": SPbits3,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    "RcvFrameVLANTagOperTbl": {
        "FilterOuterPriority": 15,
        "FilterOuterVID": 4096,
        "FilterOuterTPID": 0,
        "FilterInnerPriority": SPbits4,
        "FilterInnerVID": 4096,
        "FilterInnerTPID": 5,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbits2,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB Configuration set");

/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SPbits1=" + SPbits1);
logInfo("Random value: SPbits2=" + SPbits2);
logInfo("Random value: SPbits3=" + SPbits3);
logInfo("Random value: SPbits4=" + SPbits4);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

//// Traffic Generator config

// PORT2 connected to ONT first eth port
// PORT2 : Stream 1, single tagged traffic, SVID1, pbit1
// PORT2 : Stream 2, single tagged traffic, SVID1, pbit3
if (TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file
    var SVID2 = RandomIntegerExcept(1, 4094, [SVID1]); /// CVID1 randomly chosen in range [1..4094]
    logInfo("Random value used for traffic: SVID2=" + SVID2);

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    var MAC3 = 0x102233445503;
    var MAC4 = 0x202233445504;

    var GEMTable = {
        "Frame Set A": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set B": [0xffff, 0xff, 0xffff, GEM2]
    };

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.24", [
                ["<SVID1>", SVID1, 3],
                ["<SVID2>", SVID2, 3],
                ["<SPbits1>", SPbits1 << 1, 1],
                ["<SPbits2>", SPbits2 << 1, 1],
                ["<SPbits3>", SPbits3 << 1, 1],
                ["<SPbits4>", SPbits4 << 1, 1],
                ["<MAC1>", MAC1, 0xC],
                ["<MAC2>", MAC2, 0xC],
                ["<MAC3>", MAC3, 0xC],
                ["<MAC4>", MAC4, 0xC]
            ], GEMTable);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "Frame Set B": 0, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set A": 0, "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend }
    });

    TrafficGenerator.Disconnect();
    if (verdict == false)
        testFailed("Error on received stream");
    else
        testPassedWithTraffic();

}

testPassed();
