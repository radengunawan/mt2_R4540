//6.12.4 -- upstream data encryption
testPassed("GEM port Encryption in the Upstream Direction");
include("Config.js");
include("IEEE_802_1Q.js");

if (PLOAMMapper.ReadProtocolFromDevice() == "GPON") {
	testFailed("This test does not apply to GPON ONUs");
}

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var SPbit1 = RandomInteger(0, 7);


var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort();
var AllocId = GEM1;

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

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { "AllocId": AllocId });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId, 200);


/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": GEM1, "TCONTPointer": TCONT1, "TMPointerUp": UpPQ1, "PQPointerDown": DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 1, "TPtype": 3, "TPPointer": PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, "VLANFilterList": [SVID1], "ForwardOpr": 16, "NumberOfEntries": 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP1, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
//All frames get passed upstream
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, OMCI.BuildPMapper([
    [SPbit1, IWTP1]
]));
// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": 2, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { "InputTPID": 0x8100, "OutputTPID": 0x88a8, "DownstreamMode": 0 });


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
        "TreatInnerPriority": SPbit1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");

addTranslationGponToEth(GEM1);

var GEMRx = new GEMStatInterface(GEM1, 0);
///Filter on GEMRxCorrect allow to verify that decryption is working properly
var GEMRxCorrect = new GEMStatInterface(GEM1, 0, "ether[12:2] == 0x88a8");
GEMRx.start();
GEMRxCorrect.start();

testPassed("Step 5. Launch traffic in upstream direction");
if (TrafficGenerator.activateAutomatisation) {
    /// Declare variable used in TrafficGenerator file
    if (UtilsParameters.ParametersRandomisation) {
        logInfo("MAC Adresses Randomisation: " + UtilsParameters.ParametersRandomisation);

        var MAC1 = RandomUnicastMACAddress();
        var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
        logInfo("Random value: MAC1=" + MAC1.hex(12, 0));
        logInfo("Random value: MAC2=" + MAC2.hex(12, 0));
    } else {
        var MAC1 = 0x102233445501;
        var MAC2 = 0x202233445502;
    }


    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    TrafficGenerator.SendTemplateConfig("6.12.4", [
        ["<SVID1>", SVID1, 3],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC]
    ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);

    /// Enable all streams
    TrafficGenerator.EnableStreamOnPort(0, 1);

    sleep(TrafficGenerator.delayBeforeSend);

    logInfo("Starting all streams");
    TrafficGenerator.StartTrafficOnPort(1);
} else {
    popup("Please start upstream traffic");
}

sleep(1000);

/// Configure encryption: key exchange and validation
testPassed("Step 6. Cause the OLT Emulator to request generation, exchange and activation of a new AES key by the ONU");
PLOAMMapper.ActivateEncryption(ONUID, GEM1);

sleep(2000);

testPassed("Step 7. Cause the OLT Emulator to set the Encryption Status of the GEM port 1 to Encrypted");
OMCI.Set(OMCC, "GEM_Port_Network_CTP", CTP1, { EncryptionKeyRing: 1 });

sleep(4000);

testPassed("Step 8. Cause the OLT Emulator to set the Encryption Status of the GEM port 1 to non-encrypted");
OMCI.Set(OMCC, "GEM_Port_Network_CTP", CTP1, { EncryptionKeyRing: 0 });

sleep(2000);


if (TrafficGenerator.activateAutomatisation) {
    TrafficGenerator.StopTrafficOnPort(1);

    sleep(TrafficGenerator.delayAfterSend);

    logInfo("################################");
    logInfo("################################");

    var txPackets = TrafficGenerator.GetTransmitStatsOnPortAndStream(1, 0);
    logInfo("sent " + txPackets + " packets upstream");
    var rxFlowA = TrafficGenerator.GetReceivedStatsOnPortAndTID(0, 1);
    logInfo("received " + rxFlowA + " packets for flow A at S/R interface");
    var rxCorrectFlowA = TrafficGenerator.GetReceivedStatsOnPortAndFilter(0, 0);
    ///Note that rxCorrectFlowA should be txPackets - encrypted_frames, as descryption is done
    ///in the MT2-Browser, not the PON platform. This log is for information only
    logInfo("received " + rxCorrectFlowA + " correct packets for flow A at S/R interface");

    logInfo("################################");
    var GEMResult = GEMRx.read();
    logInfo("packets seen on GEM port: " + GEMResult['frames']);
    ///encrypted packets: packet detected as encrypted
    logInfo("encrypted packets seen on GEM port: " + GEMResult['encrypted frames']);
    ///decrypted packets: the key is known
    logInfo("decrypted packets seen on GEM port: " + GEMResult['decrypted frames']);
    ///Note that encrypted_frames and decrypted_frames must be the same
    logInfo("################################");
    ///On GEMCorrectResult, we have a filter: it will only count frames which are not encrypted or decrypted properly
    var GEMCorrectResult = GEMRxCorrect.read();
    logInfo("correct packets seen on GEM port: " + GEMCorrectResult['frames']);
    logInfo("correct decrypted packets seen on GEM port: " + GEMCorrectResult['decrypted frames']);

    TrafficGenerator.Disconnect();
    GEMRx.stop();
    GEMRxCorrect.stop();

    if (GEMResult['frames'] < txPackets)
        testFailed("frame loss detected");
    if (GEMResult['encrypted frames'] == 0)
        testFailed("no encryption");
    if (GEMResult['encrypted frames'] != GEMResult['decrypted frames'])
        testFailed("not all frames are decrypted");
    if (GEMCorrectResult['frames'] != GEMResult['frames'])
        testFailed("not all frames are received correctly");

    testPassedWithTraffic();
} else {
    var GEMResult = GEMRx.read();
    logInfo("packets seen on GEM port: " + GEMResult['frames']);
    logInfo("encrypted packets seen on GEM port: " + GEMResult['encrypted frames']);
    logInfo("decrypted packets seen on GEM port: " + GEMResult['decrypted frames']);
    var GEMCorrectResult = GEMRxCorrect.read();
    logInfo("correct packets seen on GEM port: " + GEMCorrectResult['frames']);
    logInfo("correct encrypted packets seen on GEM port: " + GEMCorrectResult['encrypted frames']);
    logInfo("correct decrypted packets seen on GEM port: " + GEMCorrectResult['decrypted frames']);

    if (GEMResult['encrypted frames'] == 0)
        testFailed("no encryption");
    if (GEMResult['encrypted frames'] != GEMResult['decrypted frames'])
        testFailed("not all frames are decrypted");
    if (GEMCorrectResult['frames'] != GEMResult['frames'])
        testFailed("not all frames are received correctly");
}
GEMRx.stop();
GEMRxCorrect.stop();



testPassed();