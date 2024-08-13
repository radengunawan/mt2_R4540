include("Config.js");

/// TC 6.10.7 Activate uncommitted software image
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
sleep(200);

testPassed("ONU activated done");

/// MIB Reset
OMCI.MIB_Reset(OMCC);

testPassed("MIB resetted");


/// Get the software image ME that is inactive
var firmMeid0 = OMCI.GetSoftwareImageME(OMCC, 0);
var firmMeid1 = OMCI.GetSoftwareImageME(OMCC, 1);

logInfo("Software Image 0:");
logInfo("  Version: " + firmMeid0.Version);
logInfo("  IsCommitted: " + firmMeid0.IsCommitted);
logInfo("  IsActive: " + firmMeid0.IsActive);
logInfo("  IsValid: " + firmMeid0.IsValid);
logInfo("Software Image 1:");
logInfo("  Version: " + firmMeid1.Version);
logInfo("  IsCommitted: " + firmMeid1.IsCommitted);
logInfo("  IsActive: " + firmMeid1.IsActive);
logInfo("  IsValid: " + firmMeid1.IsValid);

var firmMeid;
var otherFirmMeid;
//Get operation to both software image MEs; Get image that is the valid, uncommitted and inactive one
if ((firmMeid1.IsActive == 0) && (firmMeid1.IsValid == 1) && (firmMeid1.IsCommitted == 0)) {
    firmMeid = 1;
    otherFirmMeid = 0;
} else if ((firmMeid0.IsActive == 0) && (firmMeid0.IsValid == 1) && (firmMeid0.IsCommitted == 0)) {
    firmMeid = 0;
    otherFirmMeid = 1;
} else {
    testFailed("Unable to retrieve Inactive software image meid");
}
logInfo("Firmware MEID that will be Activated is " + firmMeid);

//Active image 
OMCI.Activate_Software(OMCC, firmMeid);

testPassed("Image activated");

WaitOnuReboot();
sleep(2000);
logInfo("Going to ONU activation");

PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);
/// Create OMCC
PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(200);
testPassed("ONU re-activated");

// Verify that the new image is Activated
var resp_get = undefined;
resp_get = OMCI.GetSoftwareImageME(OMCC, firmMeid);
if (resp_get == undefined) testFailed("Get Software Image not received");
if (resp_get.IsValid != 1) testFailed("Image should be valid");
if (resp_get.IsActive != 1) testFailed("Image should be active");
if (resp_get.IsCommitted != 0) testFailed("Image should not be committed");

logInfo("Software Image " + firmMeid + ":");
logInfo("  IsCommitted: " + resp_get.IsCommitted);
logInfo("  IsActive: " + resp_get.IsActive);
logInfo("  IsValid: " + resp_get.IsValid);

testPassed("Firmware image activated");


RebootOnu();
startEmulation();
sleep(2000);


logInfo("Going to ONU activation");
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);

PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(200);

testPassed("ONU re-activated");

// Verify that the new image is no more activated
var resp_get = undefined;
resp_get = OMCI.GetSoftwareImageME(OMCC, firmMeid);
if (resp_get == undefined) testFailed("Get Software Image not received");
logInfo("Software_Image Bank" + firmMeid + ": " + (resp_get.IsValid != 0 ? "Valid" : "Invalid") + " " + (resp_get.IsActive != 0 ? "Active" : "Inactive") + " " + (resp_get.IsCommitted != 0 ? "Committed" : "Uncommitted"));
logInfo("Software_Image Bank" + firmMeid + ": Version " + resp_get.Version /*ArrayToString(resp_get.Version)*/ );
if (resp_get.IsValid != 1) testFailed("Image should be valid");
if (resp_get.IsActive != 0) testFailed("Image should be inactive");
if (resp_get.IsCommitted != 0) testFailed("Image should be not committed");


// Verify that the old image is activated
var resp_get = undefined;
resp_get = OMCI.GetSoftwareImageME(OMCC, otherFirmMeid);
if (resp_get == undefined) testFailed("Get Software Image not received");
logInfo("Software_Image Bank" + otherFirmMeid + ": " + (resp_get.IsValid != 0 ? "Valid" : "Invalid") + " " + (resp_get.IsActive != 0 ? "Active" : "Inactive") + " " + (resp_get.IsCommitted != 0 ? "Committed" : "Uncommitted"));
logInfo("Software_Image Bank" + otherFirmMeid + ": Version " + resp_get.Version /*ArrayToString(resp_get.Version)*/ );
if (resp_get.IsValid != 1) testFailed("Image should be valid");
if (resp_get.IsActive != 1) testFailed("Image should be active");
if (resp_get.IsCommitted != 1) testFailed("Image should be committed");

firmMeid0 = OMCI.GetSoftwareImageME(OMCC, 0);
firmMeid1 = OMCI.GetSoftwareImageME(OMCC, 1);
logInfo("Software Image 0:");
logInfo("  Version: " + firmMeid0.Version /*ArrayToString(firmMeid0.Version)*/ );
logInfo("  IsCommitted: " + firmMeid0.IsCommitted);
logInfo("  IsActive: " + firmMeid0.IsActive);
logInfo("  IsValid: " + firmMeid0.IsValid);
logInfo("Software Image 1:");
logInfo("  Version: " + firmMeid1.Version /*ArrayToString(firmMeid1.Version)*/ );
logInfo("  IsCommitted: " + firmMeid1.IsCommitted);
logInfo("  IsActive: " + firmMeid1.IsActive);
logInfo("  IsValid: " + firmMeid1.IsValid);


testPassed();