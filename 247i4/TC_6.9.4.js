///Test 6.9.4. U interface status reporting and alarms
testPassed("Test 6.9.4. U interface status reporting and alarms");
include("Config.js");

function unitTest(OMCC, ONUConf) {
    var verdict = false;

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
    bwmapAddEntry(ONUID, ONUConf.AllocIdNb, 50);
    /// Send PLOAM Assign Alloc ID
    PLOAMMapper.AssignAllocId(ONUID, ONUConf.AllocIdNb);
    /// Associate the T-CONT with the Alloc Id
    OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: ONUConf.AllocIdNb });

    /// Send config
    // Create GEM port ONUConf.GEM
    var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: ONUConf.GEM, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwPQ1 });
    var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
    var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
    var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

    // ANI side port
    var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
    var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [ONUConf.SVID], ForwardOpr: 16, NumberOfEntries: 1 });
    var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
    OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
        [ONUConf.SPbit, IWTP1]
    ]));

    // UNI side port
    var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
    var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { AssociationType: OMCI.GetTPAssociationType(OMCC), AssocMEPointer: OMCITP });
    OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, DownstreamMode: 0 });

    //Set the test specific tag rule 
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
            TreatInnerPriority: ONUConf.SPbit,
            TreatInnerVID: ONUConf.SVID,
            TreatInnerTPID: 6
        }
    });
    // Unlock the UNI so that it will produce alarms
    OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

    testPassed("MIB Configuration set");

    sleep(TrafficGenerator.delayBeforeTraffic);


    clearOMCIAlarms(OMCC);


    logInfo("Random value: SVID1=" + ONUConf.SVID);
    logInfo("Random value: GEM1=" + ONUConf.GEM);


    OMCI.Get_All_Alarms(OMCC);

    if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "LAN-LOS", 60000))
        testFailed("Pass/Fail 1. LAN-LOS Alarm not received");

    clearOMCIAlarms(OMCC);

    testPassed("Step 3. Cause the OLT emulator to retrieve the status of the U interface (PPTP Ethernet UNI ME)");


    var resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AutoDetectionConfiguration']);
    if (resp['AutoDetectionConfiguration'] != 0) // configuration is expected AutoNeg on the ETHERNET port
        testFailed("Pass/Fail 2: ONU is not able to send AutoDetectionConfiguration correctly (expected 0(Autoneg)/received " + resp['AutoDetectionConfiguration'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AdminState']);
    if (resp['AdminState'] != 0)
        testFailed("Pass/Fail 2: ONU is not able to send AdminState correctly (expected 0(Unlock)/received " + resp['AdminState'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['ConfigurationInd']);
    if (resp['ConfigurationInd'] != 0) //  Actual state is expected unknown
        testFailed("Pass/Fail 2: ONU is not able to send ConfigurationInd correctly (expected 0(Unknown)/received " + resp['ConfigurationInd'] + ")");

    //// Traffic Generator config

    testPassed("Step 4. Connect the traffic generator (configure at 1000Mbit/s autoneg) with the U interface of the ONU");


    if (TrafficGenerator.activateAutomatisation && TrafficGenerator.IsPortSpeedSettingSupported()) {
        /// Connect to the TrafficGenerator
        TrafficGenerator.Connect();

        /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
        var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.9.4-1", []);
        sleep(TrafficGenerator.delayBeforeSend);
        TrafficGenerator.Disconnect();

        popup("Action", "Traffic Generator port has been configured to 1G/Autoneg, Connect it to the ONU user port and then click OK");

    } else {
        popup("Action", "Configure the Traffic Generator port to 1G/Autoneg, Connect it to the ONU user port and then click OK");
    }


    testPassed("Step 5. Wait that all alarms are sent by the ONU");
    if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "", 60000))
        testFailed("Pass/Fail 3. LAN-LOS Alarm is not cleared");

    testPassed("Step 6. Cause the OLT emulator to retrieve the status of the U interface");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AutoDetectionConfiguration']);
    if (resp['AutoDetectionConfiguration'] != 0) // configuration is expected AutoNeg on the ETHERNET port
        testFailed("Pass/Fail 4: ONU is not able to send AutoDetectionConfiguration correctly  (expected 0(Autoneg)/received " + resp['AutoDetectionConfiguration'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AdminState']);
    if (resp['AdminState'] != 0)
        testFailed("Pass/Fail 4: ONU is not able to send AdminState correctly (expected 0(Unlock)/received " + resp['AdminState'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['ConfigurationInd']);
    if (resp['ConfigurationInd'] != 0x03) //  Actual state is expected 1000 Mbps Full duplex
        if (resp['ConfigurationInd'] != 0) //  Actual state is expected unknown
            testFailed("Pass/Fail 4: ONU is not able to send ConfigurationInd correctly (expected 3(Gigabit Ethernet full duplex)/received " + resp['ConfigurationInd'] + ")");

    clearOMCIAlarms(OMCC);

    testPassed("Step 7. Disconnect the traffic generator with the U interface of the ONU");

    popup("Action", "Disconnect the ONU LAN port then click OK");

    testPassed("Step 8. Wait that all alarms are sent by the ONU");
    if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "LAN-LOS", 60000))
        testFailed("Pass/Fail 5. LAN-LOS Alarm is not received");

    testPassed("Step 9. Cause the OLT emulator to retrieve the status of the U interface");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AutoDetectionConfiguration']);
    if (resp['AutoDetectionConfiguration'] != 0) // configuration is expected AutoNeg on the ETHERNET port
        testFailed("Pass/Fail 6: ONU is not able to send AutoDetectionConfiguration correctly (expected 0(Autoneg)/received " + resp['AutoDetectionConfiguration'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AdminState']);
    if (resp['AdminState'] != 0)
        testFailed("Pass/Fail 6: ONU is not able to send AdminState correctly (expected 0(Unlock)/received " + resp['AdminState'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['ConfigurationInd']);
    if (resp['ConfigurationInd'] != 0) //  Actual state is expected unknown
        testFailed("Pass/Fail 6: ONU is not able to send ConfigurationInd correctly (expected 0(Unknown)/received " + resp['ConfigurationInd'] + ")");

    testPassed("Step 10. Connect the traffic generator (configure at 100Mbit/s autoneg) with the U interface of the ONU.");

    if (TrafficGenerator.activateAutomatisation && TrafficGenerator.IsPortSpeedSettingSupported()) {
        /// Connect to the TrafficGenerator
        TrafficGenerator.Connect();

        /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
        /// Replace ONUConf.SVID by the value formatted on 3 hex digit
        var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.9.4-2", []);
        sleep(TrafficGenerator.delayBeforeSend);
        TrafficGenerator.Disconnect();

        popup("Action", "Traffic Generator port has been configured to 100M/Autoneg, Connect it to the ONU user port and then click OK");

    } else {
        popup("Action", "Configure the Traffic Generator port to 100M/Autoneg, Connect it to the ONU user port and then click OK");
    }


    testPassed("Step 11. Wait that all alarms are sent by the ONU");
    if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "", 60000))
        testFailed("Pass/Fail 7. LAN-LOS is not cleared");

    testPassed("Step 12. Cause the OLT emulator to retrieve the status of the U interface");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AutoDetectionConfiguration']);
    if (resp['AutoDetectionConfiguration'] != 0) // configuration is expected AutoNeg on the ETHERNET port
        testFailed("Pass/Fail 8: ONU is not able to send AutoDetectionConfiguration correctly (expected 0(Autoneg)/received " + resp['AutoDetectionConfiguration'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['AdminState']);
    if (resp['AdminState'] != 0)
        testFailed("Pass/Fail 8: ONU is not able to send AdminState correctly (expected 0(Unlock)/received " + resp['AdminState'] + ")");

    resp = OMCI.Get(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, ['ConfigurationInd']);
    if (resp['ConfigurationInd'] != 2) //  Actual state is expected unknown
        testFailed("Pass/Fail 8: ONU is not able to send ConfigurationInd correctly (expected 2(100BASE-T full duplex)/received " + resp['ConfigurationInd'] + ")");
}

//Test Case on U interface status reporting and alarms
/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;
var ONUConf = {}
ONUConf.SVID = RandomInteger(1, 4094); /// SVID randomly chosen in range [1..4094]
ONUConf.SPbit = RandomInteger(0, 7);
ONUConf.GEM = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM randomly chosen in range [256..4094]
ONUConf.AllocIdNb = ONUConf.GEM;


popup("Action", "The ONU LAN port shall be disconnected when powering up the ONU... Once the ONU is powered up and ready,    then click OK");

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

logInfo("################################");
logInfo("################################");
testPassed("Testing with ONU Reboot");
unitTest(OMCC, ONUConf);

popup("Action", "Please disconnect the ONU LAN port,    then click OK");
logInfo("################################");
logInfo("################################");
testPassed("Testing with ONU Reset only");
unitTest(OMCC, ONUConf);

testPassed();
