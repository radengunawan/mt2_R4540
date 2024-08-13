include("Config.js");

// TC 6.7.1 Local setting of a registration ID at the ONU (ONU retains the Registration ID indefinitely)
/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;

popup("Action", "Please Configure a Registration ID in the ONU, then click OK.");

/// Reset the emulator
reset();
/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);
PLOAMMapper.GetPassword(ONUID);
sleep(500);

if (popup("Action", "Please Check the registration ID declared and click Yes if the values match", "YesNo") == 0) testFailed("Bad registration ID");
RebootOnu();

/// Reset the emulator
reset();
startEmulation();

/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);
PLOAMMapper.GetPassword(ONUID);
sleep(500);

if (popup("Action", "Please Check the registration ID declared and click Yes if the values match", "YesNo") == 0) testFailed("Bad registration ID");


testPassed();