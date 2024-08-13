include("Config.js");

//Test case 6.2.4 Mapping traffic into GEM Ports based on P-bit values in the upstream direction (single user port)
/// Initialize Variables
var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var CVID2 = RandomIntegerExcept(1, 4094, [CVID1]); /// CVID2 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var CPbits1 = RandomInteger(0, 7);
var CPbits2 = RandomIntegerExcept(0, 7, [CPbits1]);

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
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);


/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });

/// Send config
// create GEM ports
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
//create bridge
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
//create mapper
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//Associated with ANI side ports
//ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
var TF1 = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [CVID1, CVID2], ForwardOpr: 16, NumberOfEntries: 2 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });

//CoS based on 2 p-bit values. All other pbit values get discarded due to null pointers in pbit mapper
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [CPbits1, IWTP1],
    [CPbits2, IWTP2]
]));

//UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

logInfo("Random values CVID1=" + CVID1 + " ; CVID2=" + CVID2);
logInfo("Random values CPbits1=" + CPbits1 + " ; CPbits2=" + CPbits2);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

addTranslationGponToEth(GEM1);
addTranslationGponToEth(GEM2);

if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x202233445501;
    var MAC2 = 0x102233445502;

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.2.4", [
        ["<CVID1>", CVID1, 3],
        ["<CVID2>", CVID2, 3],
        ["<CPbits1>", CPbits1 << 1, 1],
        ["<CPbits2>", CPbits2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ], {
        "Frame Set A": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set B": [0xffff, 0xff, 0xffff, GEM2],
        "Frame Set C": [0xffff, 0xff, 0xffff, GEM1],
        "Frame Set D": [0xffff, 0xff, 0xffff, GEM2]
    });
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