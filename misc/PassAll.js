include("Config.js");

var testTraffic = true;
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocIdNb = GEM1;

/// Reset the emulator
reset();
/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID);
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
var PPTPEthUni = OMCI.GetPPTPEthUni(OMCC, 0);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdNb, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, {
    AllocId: AllocIdNb
});

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", {
    PortId: GEM1,
    TCONTPointer: TCONT1,
    TMPointerUp: UpPQ1,
    PQPointerDown: DwPQ1
});
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", {
    MaxGEMPayloadSize: 4095
});
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", {
    BridgeIDPointer: BSP,
    PortNum: 1,
    TPtype: 3,
    TPPointer: PMAP
});
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", {
    meid: BPCD1,
    VLANFilterList: [SVID1],
    ForwardOpr: 16,
    NumberOfEntries: 1
});
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", {
    GEMPortNetworkCTPPointer: CTP1,
    ServiceProfilePointer: PMAP,
    GALProfilePointer: GAL
});
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, {
    P0Ptr: IWTP1,
    P1Ptr: IWTP1,
    P2Ptr: IWTP1,
    P3Ptr: IWTP1,
    P4Ptr: IWTP1,
    P5Ptr: IWTP1,
    P6Ptr: IWTP1,
    P7Ptr: IWTP1
});

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", {
    BridgeIDPointer: BSP,
    PortNum: 2,
    TPtype: 1,
    TPPointer: PPTPEthUni
});
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", {
    AssocMEPointer: PPTPEthUni
});
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    InputTPID: 0x8100,
    OutputTPID: 0x88a8,
    DownstreamMode: 0
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 0,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 2
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
        TreatTagsToRemove: 1,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 1,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 2
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
        TreatTagsToRemove: 2,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 2,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 2
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, "PPTPEthernetUni", PPTPEthUni, {
    AdminState: 0
});


testPassed("MIB Configuration set");

/// Only no tag frame recevied from Ethernet has tag with value to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, 0xff, GEM1);
addTranslationGponToEth(GEM1);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: GEM1=" + GEM1);

if (testTraffic && TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file
    var MAC1 = RandomUnicastMACAddress();
    var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
    
	/// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("PassAll", [
		["<SVID1>", SVID1, 3],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
        "Frame Set E": { "Frame Set E": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}

testPassed("Ready For traffic");

testPassed();