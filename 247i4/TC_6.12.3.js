///Unicast GEM port encryption in the downstream direction
testPassed("Unicast GEM port encryption in the downstream direction");
include("Config.js");

var lossTolerance = 0; //frames
if (PLOAMMapper.PONProtocol == "GPON")
    lossTolerance = 15; ///Some losses are acceptable in GPON

logInfo("Total frame Loss tolerance during activation/deactivation: " + lossTolerance);


function encryptionSelfCheck() {
    if ((GEMResult['encrypted frames'] == undefined) || (GEMResult['encrypted frames'] == 0)) {
        logError("no encryption");
        return false;
    }

    if ((GEMResult['encrypted frames'] != GEMResult['decrypted frames'])) {
        logError("self-decryption failed");
        return false;
    }

    if ((GEMCorrectResult['encrypted frames'] != GEMCorrectResult['decrypted frames'])) {
        logError("self-decryption failed");
        return false;
    }
    return true; //Encryption ok
}

var CVID1 = RandomInteger(1, 4094); /// CVID1 randomly chosen in range [1..4094]
var SVID1 = RandomIntegerExcept(1, 4094, [CVID1]); /// SVID1 randomly chosen in range [1..4094]
var CPbit1 = RandomInteger(0, 7);
var SPbit1 = RandomIntegerExcept(0, 7, [CPbit1]);

var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
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
bwmapAddEntry(ONUID, AllocId, 50);


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
        "FilterInnerPriority": CPbit1,
        "FilterInnerVID": CVID1,
        "FilterInnerTPID": 4,
        "FilterEtherType": 0,
        "TreatTagsToRemove": 1,
        "TreatOuterPriority": 15,
        "TreatOuterVID": 0,
        "TreatOuterTPID": 0,
        "TreatInnerPriority": SPbit1,
        "TreatInnerVID": SVID1,
        "TreatInnerTPID": 6
    }
});

if (PLOAMMapper.PONProtocol != "GPON")
    OMCI.Set(OMCC, "GEM_Port_Network_CTP", CTP1, { EncryptionKeyRing: 3 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB setup done");


/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, 0xff, GEM1);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);

logInfo("Random value: CVID1=" + CVID1);
logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value used for traffic: CPbit1=" + CPbit1);
logInfo("Random value used for traffic: SPbit1=" + SPbit1);

testPassed("Starting traffics");

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

//// Traffic Generator config
if (TrafficGenerator.activateAutomatisation) {

    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace SVID1 by the value formatted on 3 hex digit
    var result = TrafficGenerator.SendTemplateConfigAndDoTest("6.12.3", [
        ["<SVID1>", SVID1, 3],
        ["<CVID1>", CVID1, 3],
        ["<CPbit1>", CPbit1 << 1, 1],
        ["<SPbit1>", SPbit1 << 1, 1],
        ["<MAC1>", MAC1, 0xC],
        ["<MAC2>", MAC2, 0xC],
    ]);

    ///witness stream
    /// Check verdict for all streams
    var verdict = TrafficGenerator.ApplyVerdict(result, {
        "Frame Set A": { "Frame Set A": TrafficGenerator.nbOfPacketToSend, "TID 1:1": TrafficGenerator.nbOfPacketToSend }
    });

    if (verdict == false) {
        TrafficGenerator.Disconnect();
        testFailed("ONU is not forwarding the stream properly");
    }
}

TrafficGenerator.ClearReceiveStatsOnPort(1);

sleep(TrafficGenerator.delayBeforeTraffic);

//    note: if something is changed in the frame below (content, length) then the header has to be updated  (CRC) 
var payload = [0x45, 0x00, 0x04, 0xea, 0x00, 0x00, 0x00, 0x00, 0x80, 0xFF, 0x1E, 0x13, 0x0B, 0x00, 0x00, 0x01, 0x0C, 0x00, 0x00, 0x02];
for (var i = 20; i < 1258; i++)
    payload[i] = i & 0xff;

var frame = ByteArray(IEEE_802_1Q.Build_STag_Frame(IEEE_802_1Q.MAC_To_String(MAC2), IEEE_802_1Q.MAC_To_String(MAC1), SPbit1, SVID1, 0x0800, payload));


var GEMTx = new GEMTxInterface(GEM1);
var GEMRx = new GEMStatInterface(GEM1, 1);
var GEMRxCorrect = new GEMStatInterface(GEM1, 1, "ether[12:2] == 0x88a8");
GEMRx.start();
GEMRxCorrect.start();

var txSession = GEMTx.sendPackets(frame, 0x7fffffff, 1000 * 1000 * 40); ///can not increase datarate further

sleep(5000);

testPassed("Step 6. Cause the OLT Emulator to request generation, exchange and activation of a new AES key by the ONU");
testPassed("Step 7. Cause the OLT Emulator to activate encryption on the GEM port.");
///Step 6 & 7 are performed in ActivateEncryption
PLOAMMapper.ActivateEncryption(ONUID, GEM1);

sleep(10000);

testPassed("Step 8. Cause the OLT Emulator to deactivate the encryption on the GEM port.");
PLOAMMapper.DeactivateEncryption(ONUID, GEM1);

sleep(5000);

GEMTx.stopSendingPackets(txSession);

sleep(TrafficGenerator.delayAfterSend);

logInfo("################################");
logInfo("################################");
var txPackets = GEMTx.getTxCounter(txSession);
logInfo("sent " + txPackets + " on GEM " + GEM1);

logInfo("################################");
var GEMResult = GEMRx.read();
logInfo("packets seen on GEM port: " + GEMResult['frames']);
///encrypted packets: packet detected as encrypted
logInfo("encrypted packets seen on GEM port: " + GEMResult['encrypted frames']);
///decrypted packets: the key is known
logInfo("decrypted packets seen on GEM port: " + GEMResult['decrypted frames']);
logInfo("################################");
///On GEMCorrectResult, we have a filter: it will only count frames which are not encrypted or decrypted properly
var GEMCorrectResult = GEMRxCorrect.read(); ///used for tool verification
logInfo("correct packets seen on GEM port: " + GEMCorrectResult['frames']);
logInfo("correct decrypted packets seen on GEM port: " + GEMCorrectResult['decrypted frames']);

GEMRx.stop();
GEMRxCorrect.stop();

if (TrafficGenerator.activateAutomatisation) {
    var verdict = true;

    logInfo("################################");
    var RcvdCorrectDsUnicast = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 0);
    var RcvdAtU = TrafficGenerator.GetTotalReceiveStatsOnPort(1);

    logInfo("Rx at U correct: " + RcvdCorrectDsUnicast);
    logInfo("Rx at U: " + RcvdAtU);


    TrafficGenerator.Disconnect();

    if (RcvdCorrectDsUnicast < (txPackets - lossTolerance))
        testFailed("encrypted stream not received properly");

    if (!encryptionSelfCheck())
        testFailed("encrypted self-check failed");

    testPassedWithTraffic();
} else {
    if (!popup("Action", "has all downstream frames been received? (within " + lossTolerance + " frames tolerance)", "YesNo"))
        testFailed("encrypted stream not received properly");

    if (!encryptionSelfCheck())
        testFailed("encrypted self-check failed");
}

testPassed();