include("Config.js");

//Test case 6.4.2 Downstream Broadcast Handling Multiple U-Interfaces
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SVID2 = RandomIntegerExcept(1, 4094, [SVID1]); /// SVID2 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM3 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var TPID = 0x8100;

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
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0, 1);
var DnUni2PQ1 = OMCI.GetDwPQ(OMCC, 0, 2);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);
var OMCITP2 = OMCI.GetTerminationPoint(OMCC, 1);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 20);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId1 });


/// Send config
//create bidirectoinal GEM port GEM1 First U
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DnUni1PQ1 });
//create bidirectoinal GEM port GEM2 Second U
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DnUni2PQ1 });

// create a Broadcast GEM port GEM 3
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM3, "Direction": 2, "PQPointerDown": 65535 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });

//Create 2 bridges, one per U
var BSP1 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var BSP2 = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

//Create a p-bit mapper for the bidirectional port
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
var PMAP2 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//IWTPs for each GEM port, IWTP3 is the Broadcast IWTP
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP1, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP2, "GALProfilePointer": GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP3, "InterworkingOpt": 6, "GALProfilePointer": 65535 });

//ANI side ports for U1
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP1, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP1 });
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP1, "PortNum": 2, "TPtype": 5, "TPPointer": IWTP3 });

// !! Modification from OISG sequence : TP type changed to 5 for BPCD2 and BPCD4


//ANI side ports for U2
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP2, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP2 });
var BPCD4 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP2, "PortNum": 2, "TPtype": 5, "TPPointer": IWTP3 });

//Filter for Broadcast port U1
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": BPCD2, "VLANFilterList": [SVID1], "ForwardOpr": 23, "NumberOfEntries": 1 });

//Filter for Broadcast port U2
var TF2 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": BPCD4, "VLANFilterList": [SVID1], "ForwardOpr": 23, "NumberOfEntries": 1 });

//All frames get passed upstream U1
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { "P0Ptr": IWTP1, "P1Ptr": IWTP1, "P2Ptr": IWTP1, "P3Ptr": IWTP1, "P4Ptr": IWTP1, "P5Ptr": IWTP1, "P6Ptr": IWTP1, "P7Ptr": IWTP1 });

//All frames get passed upstream U2
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP2, { "P0Ptr": IWTP2, "P1Ptr": IWTP2, "P2Ptr": IWTP2, "P3Ptr": IWTP2, "P4Ptr": IWTP2, "P5Ptr": IWTP2, "P6Ptr": IWTP2, "P7Ptr": IWTP2 });

//UNI side U1
var BPCD5 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP1, "PortNum": 3, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": TPID, "OutputTPID": 0x88a8, "DownstreamMode": 0 });
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
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 0,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

//UNI side U2
var BPCD6 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP2, "PortNum": 3, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP2 });
var EVTOCD2 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP2 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD2, { "InputTPID": TPID, "OutputTPID": 0x88a8, "DownstreamMode": 0 });
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
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": 0,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNIs so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP2, { AdminState: 0 });

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: SVID2=" + SVID2);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);
addTranslationEthToGpon(0xffff, 0xff, GEM3);
logInfo("All downstream traffics are forwarded to GEM multicast " + GEM3);

if (TrafficGenerator.activateAutomatisation) {

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);
        var MAC1 = RandomUnicastMACAddress();
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
    } else {
        logInfo("No MAC Adresses randomisation");
        var MAC1 = 0x102233445501;
    }
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.4.2", [
        ["<SVID1>", SVID1, 3],
        ["<SVID2>", SVID2, 3],
        ["<MAC1>", MAC1, 0xC]
    ]);
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A - 1": TrafficGenerator.nbOfPacketToSend, "Frame Set A - 2": TrafficGenerator.nbOfPacketToSend, "TID 1:1": TrafficGenerator.nbOfPacketToSend, "TID 1:2": TrafficGenerator.nbOfPacketToSend },
        "Frame Set B": { "Frame Set A - 1": 0, "Frame Set A - 2": 0, "TID 2:1": 0, "TID 2:2": 0 }
    });


    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}

testPassed();