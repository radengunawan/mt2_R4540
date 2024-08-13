include("Config.js");

//6.1.28 -- Test Case on 67 Entries on extended VLAN tagging operation table and 8 VLAN

/// Initialize Variables
var CVIDs = [];
for (var i = 0; i < 8; i++) {
    CVIDs.push(RandomIntegerExcept(1, 4094, CVIDs)); /// CVID randomly chosen in range [1..4094]
}
var SVIDs = [];
for (var i = 0; i < 8; i++) {
    SVIDs.push(RandomIntegerExcept(1, 4094, CVIDs.concat(SVIDs))); /// CVID randomly chosen in range [1..4094]
}

var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM4 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var AllocId3 = GEM3;
var AllocId4 = GEM4;
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

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
bwmapAddEntry(ONUID, AllocId3, 10);
bwmapAddEntry(ONUID, AllocId4, 10);

/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });
OMCI.Set(OMCC, "T_CONT", TCONT3, { AllocId: AllocId3 });
OMCI.Set(OMCC, "T_CONT", TCONT4, { AllocId: AllocId4 });

//create GEM port GEM1 through GEM2
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM3, TCONTPointer: TCONT3, TMPointerUp: UpPQ3, PQPointerDown: DnUni1PQ3 });
var CTP4 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM4, TCONTPointer: TCONT4, TMPointerUp: UpPQ4, PQPointerDown: DnUni1PQ4 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//1 ANI side ports, 1 per VID
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: SVIDs, ForwardOpr: 16, NumberOfEntries: 8 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP3, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
var IWTP4 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP4, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });

//Since VID-mapping, make both p-bits point to same IWTP. All other pbit values get discarded due to null pointers in pbit mapper 
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, { P0Ptr: IWTP1, P1Ptr: IWTP2, P2Ptr: IWTP3, P3Ptr: IWTP4, P4Ptr: IWTP1, P5Ptr: IWTP2, P6Ptr: IWTP3, P7Ptr: IWTP4 });

//UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

for (var v = 0; v < 8; v++) {
    for (var p = 0; p < 8; p++) {
        OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD, {
            RcvFrameVLANTagOperTbl: {
                FilterOuterPriority: 15,
                FilterOuterVID: 4096,
                FilterOuterTPID: 0,
                FilterInnerPriority: ((p + v) % 8),
                FilterInnerVID: CVIDs[v],
                FilterInnerTPID: 4,
                FilterEtherType: 0,
                TreatTagsToRemove: 1,
                TreatOuterPriority: 15,
                TreatOuterVID: 0,
                TreatOuterTPID: 0,
                TreatInnerPriority: p,
                TreatInnerVID: SVIDs[v],
                TreatInnerTPID: 6
            }
        });
    }
}

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

for (var i = 0; i < 8; i++) {
    logInfo("Random values CVID" + (i + 1) + "=" + CVIDs[i]);
    logInfo("Random values SVID1" + (i + 1) + "=" + SVIDs[i]);
}
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);
logInfo("Random value: GEM4=" + GEM4);

if (TrafficGenerator.activateAutomatisation) {
    testPassed("Starting traffics");
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;

    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    }

    for (var v = 0; v < 8; v++) {
        logInfo("Running traffic for CVID" + (v + 1));

        delAllTranslationRules();

        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 0, 0xffff, 0, GEM1);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 4, 0xffff, 0, GEM1);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 1, 0xffff, 0, GEM2);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 5, 0xffff, 0, GEM2);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 2, 0xffff, 0, GEM3);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 6, 0xffff, 0, GEM3);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 3, 0xffff, 0, GEM4);
        addTranslationGponToEthExt(1, 0xffff, 0xff, 0xffff, SVIDs[v], 7, 0xffff, 0, GEM4);

        addTranslationEthToGpon(0xffff, 0, GEM1);
        addTranslationEthToGpon(0xffff, 4, GEM1);
        addTranslationEthToGpon(0xffff, 1, GEM2);
        addTranslationEthToGpon(0xffff, 5, GEM2);
        addTranslationEthToGpon(0xffff, 2, GEM3);
        addTranslationEthToGpon(0xffff, 6, GEM3);
        addTranslationEthToGpon(0xffff, 3, GEM4);
        addTranslationEthToGpon(0xffff, 7, GEM4);

        ///traffic is split in 2 for filter size reasons
        var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.28-1", [
            ["<CVID>", CVIDs[v], 3],
            ["<SVID>", SVIDs[v], 3],
            ["<CPbit0>", (v % 8) << 1, 1],
            ["<CPbit1>", ((v + 1) % 8) << 1, 1],
            ["<CPbit2>", ((v + 2) % 8) << 1, 1],
            ["<CPbit3>", ((v + 3) % 8) << 1, 1],
            ["<MAC1>", MAC1, 0xC],
            ["<MAC2>", MAC2, 0xC]
        ]);
        var localVerdict = TrafficGenerator.ApplyVerdict(result, {
            "Frame Set A Us": { "Frame Set A Us": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set B Us": { "Frame Set B Us": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set C Us": { "Frame Set C Us": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set D Us": { "Frame Set D Us": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set A Ds": { "Frame Set A Ds": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set B Ds": { "Frame Set B Ds": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set C Ds": { "Frame Set C Ds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set D Ds": { "Frame Set D Ds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
        });

        if (!localVerdict)
            verdict = false;

        TrafficGenerator.Disconnect();
        sleep(TrafficGenerator.delayBeforeTraffic);
        TrafficGenerator.Connect();

        result = TrafficGenerator.SendTemplateConfigAndDoTest("6.1.28-2", [
            ["<CVID>", CVIDs[v], 3],
            ["<SVID>", SVIDs[v], 3],
            ["<CPbit4>", ((v + 4) % 8) << 1, 1],
            ["<CPbit5>", ((v + 5) % 8) << 1, 1],
            ["<CPbit6>", ((v + 6) % 8) << 1, 1],
            ["<CPbit7>", ((v + 7) % 8) << 1, 1],
            ["<MAC1>", MAC1, 0xC],
            ["<MAC2>", MAC2, 0xC]
        ]);
        localVerdict = TrafficGenerator.ApplyVerdict(result, {
            "Frame Set E Us": { "Frame Set E Us": TrafficGenerator.nbOfPacketToSend, "TID 1:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set F Us": { "Frame Set F Us": TrafficGenerator.nbOfPacketToSend, "TID 2:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set G Us": { "Frame Set G Us": TrafficGenerator.nbOfPacketToSend, "TID 3:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set H Us": { "Frame Set H Us": TrafficGenerator.nbOfPacketToSend, "TID 4:0": TrafficGenerator.nbOfPacketToSend },
            "Frame Set E Ds": { "Frame Set E Ds": TrafficGenerator.nbOfPacketToSend, "TID 5:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set F Ds": { "Frame Set F Ds": TrafficGenerator.nbOfPacketToSend, "TID 6:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set G Ds": { "Frame Set G Ds": TrafficGenerator.nbOfPacketToSend, "TID 7:1": TrafficGenerator.nbOfPacketToSend },
            "Frame Set H Ds": { "Frame Set H Ds": TrafficGenerator.nbOfPacketToSend, "TID 8:1": TrafficGenerator.nbOfPacketToSend }
        });

        TrafficGenerator.Disconnect();
        sleep(TrafficGenerator.delayBeforeTraffic);
        TrafficGenerator.Connect();

        if (!localVerdict)
            verdict = false;
    }
    TrafficGenerator.Disconnect();
    if (verdict == false) testFailed("Error on received stream");
    else testPassedWithTraffic();
}
testPassed();