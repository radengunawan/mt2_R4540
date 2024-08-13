include("Config.js");

// TC 6.8.3 Old ONU Bring-up method for ONU
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

testPassed("ONU activated");


/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

// Backup MIB consistency state
var mibConsistencyConfig = OMCI.MibConsistencyCheck;
// Deactivate MIB consistency if any
OMCI.MibConsistencyCheck = 0;

mib_data_sync_set = Math.floor(Math.random() * 127 + 1);
OMCI.Set(OMCC, "ONU_Data", 0, { MIBDataSync: mib_data_sync_set });



testPassed("MIB Modified");
var mib_data_sync_inside_OLT = mib_data_sync_set + 1;

DisconnectAndReconnectFiber();

bwmapDelAllEntries(ONUID);

//// STEP 3
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);

//// STEP 4
PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(500);


//// STEP 5
var mib_data_sync = OMCI.Get(OMCC, "ONU_Data", 0, ["MIBDataSync"]).MIBDataSync;

if ((mib_data_sync == mib_data_sync_inside_OLT) && (mib_data_sync != 0)) {
    // Scenario 1
    logInfo("Scenario 1");
} else if (mib_data_sync == 0) {
    // Scenario 2
    OMCI.MIB_Reset(OMCC);
    OMCI.MIB_Upload(OMCC);
    mib_data_sync_set = Math.floor(Math.random() * 127 + 1);
    OMCI.Set(OMCC, "ONU_Data", 0, { MIBDataSync: mib_data_sync_set });
    logInfo("Scenario 2");
} else {
    // Scenario 3
    OMCI.MIB_Upload(OMCC);
    mib_data_sync_set = Math.floor(Math.random() * 127 + 1);
    OMCI.Set(OMCC, "ONU_Data", 0, { MIBDataSync: mib_data_sync_set });
    logInfo("Scenario 3");
}




//// STEP 6

var mib_data_sync_from_get = OMCI.Get(OMCC, "ONU_Data", 0, ["MIBDataSync"]).MIBDataSync;

// Restore MIB consistency state
OMCI.MibConsistencyCheck = mibConsistencyConfig;

// Compare the 2 MIB data sync values
if (mib_data_sync_from_get != (mib_data_sync_set + 1)) {
    logError("MIB data sync mismatch");
    testFailed();
}


testPassed();