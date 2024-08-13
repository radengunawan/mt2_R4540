include("Config.js");

//Test case 6.9.2
/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;


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

/// Set ONT Data MIB Synch to random value value
var dataSyncValue = Math.floor(Math.random() * 127 + 1);
OMCI.Set(OMCC, "ONU_Data", 0, { MIBDataSync: dataSyncValue });

// Restore MIB consistency state
OMCI.MibConsistencyCheck = mibConsistencyConfig;

/// Verify the ONT Data synch value
var respDataSynch = (OMCI.Get(OMCC, "ONU_Data", 0, ["MIBDataSync"])).MIBDataSync;
assert(respDataSynch == (dataSyncValue + 1));

testPassed();