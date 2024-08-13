// 6.9.9 -- MIB upload with extended OMCI & minimal allocation size
testPassed("MIB upload with extended OMCI & minimal allocation size");
include("Config.js");

var startTime = 100;
var grantSize = 16; //16 bytes, as per TR-247
var stopTimeOrGrantSize = startTime + grantSize -1; ///G-PON

if (PLOAMMapper.protocol == "XGPON") {
    grantSize = 4; //XG-PON: 16 bytes (8 bytes XGEM header + 8 bytes payload). 16 bytes mandated by the standard
    stopTimeOrGrantSize = grantSize;
} else if (PLOAMMapper.protocol == "XGSPON") {
    var grantSize = 1; //XGS-PON 10Gbps: 16 bytes (8 bytes XGEM header + 8 bytes payload)
    stopTimeOrGrantSize = grantSize;
}


/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;

if ((typeof(AutomatisationParameters) == 'undefined') || (AutomatisationParameters.RebootBetweenEachTC != 1)) RebootOnu();

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

bwmapDelAllEntries(ONUID);

bwmapAddEntryExt(ONUID, ONUID, startTime, stopTimeOrGrantSize, 0, 0, 0);

testPassed("ONU activated");

///Setting OMCI format to extended
OMCI.Type = "Extended";


/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

resp = OMCI.GetMEIDFromDb(OMCC, 'ONU_Data', 0);
if (resp == undefined)
    testFailed("ONU_Data is not found in the ONU MIB");

testPassed();