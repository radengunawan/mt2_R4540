include("Config.js");

//test case 6.2.2 User Isolation on ONU Devices with Multiple U-interfaces
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocIdY = GEM1;
var AllocIdN = GEM2;
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
sleep(500);

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
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);
var OMCITP2 = OMCI.GetTerminationPoint(OMCC, 1);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdY);
PLOAMMapper.AssignAllocId(ONUID, AllocIdN);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdY });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocIdN });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdY, 10);
bwmapAddEntry(ONUID, AllocIdN, 10);

/// Send config
// create GEM ports
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var BSP2 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//Associated with ANI side ports
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 1, TPtype: 3, TPPointer: PMAP2 });

var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD2, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });


//IWTPs for GEM Ports
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP2, GALProfilePointer: GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
    [SPbits1, IWTP1]
]));
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, OMCI.BuildPMapper([
    [SPbits2, IWTP2]
]));

//Associated with UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP1, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP2, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP2 });

var EVTOC1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC1, {
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
        TreatInnerPriority: SPbits1,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});

var EVTOC2 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP2 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC2, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC2, {
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
        TreatInnerPriority: SPbits2,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });
// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP2, { AdminState: 0 });

testPassed("MIB Configuration set");


logInfo("Random values: SVID1=" + SVID1 + " ; SPbits1 value=" + SPbits1 + " ; SPbits2 value=" + SPbits2 + " ; GEM1=" + GEM1 + " ;  GEM2=" + GEM2);


/// All frame received from the GEM1 & GEM2 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

if (TrafficGenerator.activateAutomatisation) {

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    } else {
        logInfo("No MAC Adresses randomisation");
        var MAC1 = 0x202233445501;
        var MAC2 = 0x202233445502;
    }
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.2.2", [
        ["<SVID1>", SVID1, 3],
        ["<SPbits1>", SPbits1 << 1, 1],
        ["<SPbits2>", SPbits2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ], {
        "Frame Set A": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set B": [0xffff, 0xff, 0xffff, GEM2]
    });
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "Frame Set B": 0, "TID 1:0": TrafficGenerator.nbOfPacketToSend, "TID 1:2": 0 },
        "Frame Set B": { "Frame Set A": 0, "Frame Set B": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend, "TID 2:1": 0 }
    });
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}

testPassed();