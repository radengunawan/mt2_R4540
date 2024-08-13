include("Config.js");

var ONUID = 1;
var OMCC = ONUID;

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

var OLT_G = OMCI.GetEntity(OMCC, "OLT_G");
if (OLT_G == undefined) {
	testFailed("OLT-G not supported by ONU, can not test time of day derivation");
}

var sfc = getCurrentSFCLow();

logInfo("current SFC: " + sfc);
sfc += 10*8000;
logInfo("Getting 1588 TS for " + sfc + " (+10 sec)"); 

var TS = get1588TStampForSFC(sfc);

OMCI.Set(OMCC, "OLT_G", OLT_G, {TimeOfDayInformation: {GEMSeqNo: sfc, TstampN: {sec: TS.sec, nsec: TS.nsec}}});

testPassed();