include("Config.js");

//Test case 6.2.12 Strict priority downstream scheduling among 4 queues on ONU

/// Initialize Variables
var portSpeedMbps = 100;

var CVID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM3 randomly chosen in range [256..4094]
var GEM4 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM4 randomly chosen in range [256..4094]


var AllocId1 = GEM1;
var AllocId2 = GEM2;
var AllocId3 = GEM3;
var AllocId4 = GEM4;

if (UtilsParameters.ParametersRandomisation) {
    logInfo("Pbits & MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);
    var CPbits4 = RandomInteger(4, 7);
    var CPbits2 = RandomInteger(2, CPbits4 - 1);
    var CPbits3 = RandomInteger(1, CPbits2 - 1);
    var CPbits1 = RandomInteger(0, CPbits3 - 1);

    var MAC1 = RandomUnicastMACAddress();
    var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
    var MAC3 = RandomUnicastMACAddressExcept([MAC1, MAC2]);
    var MAC4 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3]);
    var MAC5 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4]);
    var MAC6 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5]);
    var MAC7 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC6]);
    var MAC8 = RandomUnicastMACAddressExcept([MAC1, MAC2, MAC3, MAC4, MAC5, MAC6, MAC7]);
} else {
    logInfo("No Pbits & MAC Adresses randomisation");
    var CPbits4 = 6;
    var CPbits3 = 4;
    var CPbits2 = 5;
    var CPbits1 = 3;
    var MAC1 = 0x202233445501;
    var MAC2 = 0x102233445502;
    var MAC3 = 0x202233445503;
    var MAC4 = 0x102233445504;
    var MAC5 = 0x202233445505;
    var MAC6 = 0x102233445506;
    var MAC7 = 0x202233445507;
    var MAC8 = 0x102233445508;
}

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

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var TCONT2 = OMCI.GetTCONT(OMCC, 1);
var TCONT3 = OMCI.GetTCONT(OMCC, 2);
var TCONT4 = OMCI.GetTCONT(OMCC, 3);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var UpPQ2 = OMCI.GetUpPQ(OMCC, TCONT2);
var UpPQ3 = OMCI.GetUpPQ(OMCC, TCONT3);
var UpPQ4 = OMCI.GetUpPQ(OMCC, TCONT4);
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var DnUni1PQ3 = OMCI.GetDwPQ(OMCC, 2);
var DnUni1PQ4 = OMCI.GetDwPQ(OMCC, 3);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
PLOAMMapper.AssignAllocId(ONUID, AllocId3);
PLOAMMapper.AssignAllocId(ONUID, AllocId4);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });
OMCI.Set(OMCC, "T_CONT", TCONT3, { AllocId: AllocId3 });
OMCI.Set(OMCC, "T_CONT", TCONT4, { AllocId: AllocId4 });
sleep(500);
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
bwmapAddEntry(ONUID, AllocId3, 10);
bwmapAddEntry(ONUID, AllocId4, 10);


//create GEM port GEM1 through GEM8
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM3, TCONTPointer: TCONT3, TMPointerUp: UpPQ3, PQPointerDown: DnUni1PQ3 });
var CTP4 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM4, TCONTPointer: TCONT4, TMPointerUp: UpPQ4, PQPointerDown: DnUni1PQ4 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//ANI side port 
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [CVID1], ForwardOpr: 16, NumberOfEntries: 1 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP3, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP4 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP4, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });

//CoS based on 4 p-bit values. All other pbit values get discarded due to null pointers in pbit mapper
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
            [CPbits1, IWTP1],
            [CPbits2, IWTP2],
            [CPbits3, IWTP3],
            [CPbits4, IWTP4]
]));

//UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);
logInfo("Random value: GEM4=" + GEM4);

if (UtilsParameters.ParametersRandomisation) {
    logInfo("CVID1=" + CVID1);
    logInfo("CPbits1=" + CPbits1 + " ; CPbits2=" + CPbits2 + " ; CPbits3=" + CPbits3 + " ; CPbits4=" + CPbits4);
    logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
    logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    logInfo("Random value: MAC3=" + MAC3.hex(12, 0));
    logInfo("Random value: MAC4=" + MAC4.hex(12, 0));
    logInfo("Random value: MAC5=" + MAC5.hex(12, 0));
    logInfo("Random value: MAC6=" + MAC6.hex(12, 0));
    logInfo("Random value: MAC7=" + MAC7.hex(12, 0));
    logInfo("Random value: MAC8=" + MAC8.hex(12, 0));
}

/// All frame recevied from Ethernet with CPbits1 has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, CPbits1, GEM1);
/// All frame recevied from Ethernet with CPbits2 has to be sent on GEM2 GEM Port
addTranslationEthToGpon(0xffff, CPbits2, GEM2);
/// All frame recevied from Ethernet with CPbits3 has to be sent on GEM3 GEM Port
addTranslationEthToGpon(0xffff, CPbits3, GEM3);
/// All frame recevied from Ethernet with CPbits4 has to be sent on GEM4 GEM Port
addTranslationEthToGpon(0xffff, CPbits4, GEM4);

if (TrafficGenerator.activateAutomatisation) {
    var LoseTolerance = Tol_6_2_12;
    var RemainTolerance = Tol_6_2_12_no;

    if (!TrafficGenerator.IsRepeatModifierSupported()) {
        LoseTolerance = 0.02;
        logWarning("TrafficGenerator:: as transitory phase protection is not supported, override loss tolerance to " + LoseTolerance + "%");
        RemainTolerance = 0.02;
        logWarning("TrafficGenerator:: as transitory phase protection is not supported, override leak tolerance to " + RemainTolerance + "%");
    }

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var packetModifier = 0xFFFF0000;
    var maxPackets2Exponent = 15; ///MAX 15
    var maxPacketsMask = (0x0000FFFF << maxPackets2Exponent) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?LAST packet in the traffic analysis period?
    var packetOffset2Exponent = 11; /// SETTABLE / MAX< maxPackets2Exponent: Exponent of the number of the ?FIRST packet in the traffic analysis?
    var packetOffsetMask = ((0x0000FFFF << packetOffset2Exponent) & (~maxPacketsMask)) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the ?FIRST packet in the traffic analysis?, taking into account the mask of the ?LAST packet in the traffic analysis?.

    var struct = TrafficGenerator.SendTemplateConfig("6.2.12", [
                ["<MOD>", packetModifier],
                ["<PACKETMAXMASK>", maxPacketsMask, 4],
                ["<PACKETOFFSETMASK>", packetOffsetMask, 4],
                ["<CVID1>", CVID1, 3],
                ["<CPbits1>", CPbits1 << 1, 1],
                ["<CPbits2>", CPbits2 << 1, 1],
                ["<CPbits3>", CPbits3 << 1, 1],
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

	sleep(TrafficGenerator.delayBeforeTraffic);
			
	TrafficGenerator.SetPortSpeed(1, portSpeedMbps);
			
    var bitRateBasePPS = 1000;
    var bitRateIncrementPPS = 1000;

    var flowStates = [{
            name: "A",
            flowIndex: 0,
            filterIndex: 0,
            TID: 1,
            priority: 4,
            bitRatePPS: bitRateBasePPS,
            bitRateIncrementPPS: bitRateIncrementPPS
        }, {
            name: "B",
            flowIndex: 1,
            filterIndex: 1,
            TID: 2,
            priority: 3,
            bitRatePPS: bitRateBasePPS,
            bitRateIncrementPPS: 0
        }, {
            name: "C",
            flowIndex: 2,
            filterIndex: 2,
            TID: 3,
            priority: 2,
            bitRatePPS: bitRateBasePPS,
            bitRateIncrementPPS: 0
        }, {
            name: "D",
            flowIndex: 3,
            filterIndex: 3,
            TID: 4,
            priority: 1,
            bitRatePPS: bitRateBasePPS,
            bitRateIncrementPPS: 0
        }
    ];

    var verdict = TrafficGenerator.TestDownstreamPriorities(flowStates, {
            loseTolerance: LoseTolerance, //1%
            remainTolerance: RemainTolerance, //2%
            transitionPhaseLength: 4000,
            testPhaseLength: 20000,
            packetOffset2Exponent: packetOffset2Exponent, //test phase packet offset 2-exponent: define the length of the transition phase
            maxPackets2Exponent: maxPackets2Exponent, //max packet 2-exponent: define the length of the test
            portSpeedMbps: portSpeedMbps, //mbps
            firstStep: 6, //from test description
            lastStep: 9, //from test description,
            useRepeatModifier: true,
            modifierPos: 60
        });

    /// Check verdict for all streams 
    TrafficGenerator.Disconnect();
    if (verdict) {
        testPassedWithTraffic();
    } else {
        testFailed("Failed on streams");
    }
}

testPassed();
