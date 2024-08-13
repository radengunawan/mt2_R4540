include("Config.js");

//test case 6.2.1 Single U interface with multiple downstream GEM ports
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

/// Create BWMap entry for the ONU' 1st AllocID
bwmapAddEntry(ONUID, AllocIdY, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdY);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdY });

/// Create BWMap entry for the ONU' 2nd AllocID
bwmapAddEntry(ONUID, AllocIdN, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdN);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocIdN });

/// Send config
// create GEM ports
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM2, "TCONTPointer": TCONT2, "TMPointerUp": UpPQ2, "PQPointerDown": DnUni1PQ2 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// Associated with ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });

//IWTPs for GEM Ports
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP2, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });

OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbits1, IWTP1],
    [SPbits2, IWTP2]
]));


//Associated with UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP1 });
var EVTOC = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOC, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { "AdminState": 0 });

testPassed("MIB setup done");


// Stream 1 = VLAN VID 1
addTranslationEthToGpon(0xffff, SPbits1, GEM1);


// Stream 2 = VLAN VID 2
addTranslationEthToGpon(0xffff, SPbits2, GEM2);

logInfo("Downstream traffic: SVID1=" + SVID1 + ", SPbits1=" + SPbits1 + " SPbits2=" + SPbits2);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

if (TrafficGenerator.activateAutomatisation) {
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;
    var MAC3 = 0x102233445503;
    var MAC4 = 0x202233445504;

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.2.1", [
        ["<SVID1>", SVID1, 3],
        ["<SPbits1>", SPbits1 << 1, 1],
        ["<SPbits2>", SPbits2 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
        ["<MAC3>", MAC3, 0xC],
        ["<MAC4>", MAC4, 0xC]
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