include("Config.js");

// 6.11.3 Cardholder or port mapping package for integrated ONU
/// Initialize Variables
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

OMCI.MIB_Upload(OMCC);

// Test if Cardholder ME is reported
var cardholder_meid = OMCI.GetEntity(OMCC, "Cardholder");

// Test if Port mapping package ME is reported
var port_mapping_package_meid = OMCI.GetEntity(OMCC, "Port_Mapping_Package");


if ((cardholder_meid == null) && (port_mapping_package_meid == null)) {
    testFailed("No Cardholder or Port mapping package ME");
}
logInfo("First Cardholder ME ID: " + cardholder_meid);
logInfo("First Port Mapping package ME ID: " + port_mapping_package_meid);



testPassed();