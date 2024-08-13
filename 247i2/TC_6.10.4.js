include("Config.js");

//Test case 6.10.4 - Failed Software Image Download, incorrect section CRC
/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;
var windowSize = 32;

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

/// MIB Reset
OMCI.MIB_Reset(OMCC);

/// Get the firmware filename
var firmwareFilename = (typeof(ScriptParameters) != 'undefined') ? ScriptParameters[0] : undefined;
if (firmwareFilename == undefined) firmwareFilename = getOpenFilename("Select the firmware to download");
assert(firmwareFilename != null);

/// Load the firmware file
var firmware = readFile(firmwareFilename);
if (firmware.length == 0) testFailed("Unable to read the firmware file");

/// Get the firmware size in byte
var firmwareSize = firmware.length;

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
if (firmMeid1.IsActive == 0) firmMeid = 1;
else if (firmMeid0.IsActive == 0) firmMeid = 0;
else testFailed("Unable to retrieve Inactive software image meid");
logInfo("Firmware MEID that will be download is " + firmMeid);

/// Send the start download message
var res = undefined
sendOMCI(OMCC, "Start_Software_Download", 0, 0, firmMeid, { "imageSize": firmwareSize, "nbOfCircuitPack": 1, "softImageInstance": firmMeid, "windowSize": windowSize });
res = waitForOMCI(OMCC, "Start_Software_Download_Done", 5000); /// Wait response during 5s
if (res == undefined) testFailed("Start Software Download acknowledge not received");
windowSize = res + 1;

/// Get the number of section (including padding)
var nbOfSection = Math.ceil(firmwareSize / 31);
/// Compute last section size
var lastSection = firmware.length - (nbOfSection * 31);
/// Get the number of window (including empty sections)
var nbOfWindow = Math.floor(nbOfSection / windowSize);
/// Compute last window size
var lastWindowSize = nbOfSection - (nbOfWindow * windowSize);

/// Send the first window
logInfo("Sending first window with incorrect 2nd section OMCI CRC");
/// Get the section data block
var dataSec = firmware.mid(0, 31 * windowSize);
/// Send the complete section
sendOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "insertOmciCrcError": 1, "image": dataSec.toHexString() });
/// Wait for the ack of the segment (during 10s)
var res = waitForOMCI(OMCC, "Download_Section_Done", 10000);
/// Check that the ONU refuse the window
if (res != undefined) {
    testFailed("ONU does not refuse the window with 2nd section with false OMCI CRC");
}
/// Cause the OLT Emulator to cancel the software image download by sending the End_Software_Download_cmd

/// Compute the ITU-T I.363.5 CRC
var crc = firmware.aal5crc();

res = undefined;
var i;
for (i = 0;
    (i < 24) && ((res == undefined) || (res == 0x06)); ++i) {
    /// Wait 5 s
    sleep(5000);
    /// Send End of Sowftare download
    sendOMCI(OMCC, "End_Software_Download", 0, 0, firmMeid, { "imageSize": firmwareSize, "nbOfCircuitPack": 1, "softImageInstance": firmMeid, "windowSize": windowSize, "crc32": crc });
    /// Wait for the ack of the end (Wait for the busy)
    res = waitForOMCI(OMCC, "End_Software_Download_Done", 10000);
    logInfo("End SW download ans #" + (i + 1) + "   Result :" + res);
    logInfo("--------------------");
}
/// Check the result code
if (res == undefined) testFailed("End Software Download response not received");
if (res == 0x00) testFailed("End Software Download response received without any error result code");
if (res == 0x06) testFailed("End Software Download response received with busy result code");

testPassed();