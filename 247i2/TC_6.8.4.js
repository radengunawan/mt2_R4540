include("Config.js");

//Test case 6.8.4 - New ONU Bring-up method for new ONU with encrypted OMCC

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
sleep(200);

testPassed("ONU activated");

/// Start encryption on OMCC
PLOAMMapper.ActivateEncryption(ONUID, OMCC);



// MIB Reset
OMCI.MIB_Reset(OMCC);

//MIB upload
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

// Backup MIB consistency state
var mibConsistencyConfig = OMCI.MibConsistencyCheck;
// Deactivate MIB consistency if any
OMCI.MibConsistencyCheck = 0;

mib_data_sync_set = Math.floor(Math.random() * 127 + 1);
OMCI.Set(OMCC, "ONU_Data", 0, { MIBDataSync: mib_data_sync_set });

var mib_data_sync_from_get = OMCI.Get(OMCC, "ONU_Data", 0, ["MIBDataSync"]).MIBDataSync;

// Restore MIB consistency state
OMCI.MibConsistencyCheck = mibConsistencyConfig;

// Compare the 2 MIB data sync values
if (mib_data_sync_from_get != (mib_data_sync_set + 1)) {
    logError("MIB data sync mismatch");
    testFailed();
}

sleep(2000);
testPassed();