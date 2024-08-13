include("Config.js");

// 6.9.10 -- Use of Extended OMCI in a MIB Upload with Maximum Upstream Bandwidth
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

bwmapAddEntry(ONUID, ONUID, 10 * 10000 /* ask for 10Gbps -- the emulator will provide the max available bandwidth */ , 0, 1, 0);

testPassed("ONU activated");

OMCI.Type = "Extended";


/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

resp = OMCI.GetMEIDFromDb(OMCC, 'ONU_Data', 0);
if (resp == undefined)
    testFailed("ONU_Data is not found in the ONU MIB");

testPassed();