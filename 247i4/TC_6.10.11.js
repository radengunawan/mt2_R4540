//6.10.11 -- Use of extended OMCI in a Software Download with a 33 bytes OMCI payload size
testPassed("Use of extended OMCI in a Software Download with a 33 bytes OMCI payload size")

include("Config.js");


/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;
var windowSize = 32;
var OMCIPayloadSize = 33;

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
sendExtendedOMCI(OMCC, "Start_Software_Download", 0, 0, firmMeid, { "imageSize": firmwareSize, "nbOfCircuitPack": 1, "softImageInstance": firmMeid, "windowSize": windowSize });
res = waitForOMCI(OMCC, "Start_Software_Download_Done", 5000); /// Wait response during 5s
if (res == undefined) testFailed("Start Software Download acknowledge not received");
windowSize = res + 1;
logInfo("Negotiated window size is: " + windowSize);

/// Get the number of section (including padding)
var nbOfSection = Math.ceil(firmwareSize / OMCIPayloadSize);
/// Compute last section size
var lastSection = firmware.length - (nbOfSection * OMCIPayloadSize);
/// Get the number of window (including empty sections)
var nbOfWindow = Math.floor(nbOfSection / windowSize);
/// Compute last window size
var lastWindowSize = nbOfSection - (nbOfWindow * windowSize);

/// Send the sofwtare using the window selected by ONU
for (var i = 0; i < nbOfWindow; ++i) {
    /// Add information every 32 sections
    if ((i % 32) == 0) testPassed("Sending window " + Number(i + 1) + "/" + nbOfWindow);
    /// Get the section data block
    var dataSec = firmware.mid(i * windowSize * OMCIPayloadSize, OMCIPayloadSize * windowSize);
    /// Send the complete section (try 3 times before aborting)
    var res_download_section = undefined;
    for (var n = 0;
        ((n < 3) && (res_download_section == undefined)); ++n) {
        // repeat up to 3 times if negative ack or no ack
        sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": OMCIPayloadSize });
        /// Wait for the ack of the segment (during 10s)
        res_download_section = waitForOMCI(OMCC, "Download_Section_Done", 10000);
    }
    /// Test if the 3 times has been refused
    if (res_download_section == undefined) testFailed("No window acknowledge received for window " + (i + 1));

}
/// Send last shortened window
if (lastWindowSize) {
    /// Send last window
    logInfo("Sending last window");
    /// Get the chunk of data
    var dataSec = firmware.mid(nbOfWindow * windowSize * OMCIPayloadSize, firmwareSize);
    var numCompleteSections = Math.floor(dataSec.length / OMCIPayloadSize);
    logInfo("	" + numCompleteSections + " sections of " + OMCIPayloadSize + " bytes");
    logInfo("	" + "1 section of " + (dataSec.length % OMCIPayloadSize) + " bytes");
    /// Send the complete section (try 3 times before aborting)
    var res_download_section = undefined;
    for (var n = 0;
        ((n < 3) && (res_download_section == undefined)); ++n) {
        // repeat up to 3 times if negative ack or no ack
        sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": OMCIPayloadSize });
        /// Wait for the ack of the segment (during 10s)
        res_download_section = waitForOMCI(OMCC, "Download_Section_Done", 10000);
    }
    /// Test if the 3 times has been refused
    if (res_download_section == undefined) testFailed("No window acknowledge received for the last shortened window");
}

/// Compute the ITU-T I.363.5 CRC
var crc = firmware.aal5crc();
var res = undefined;
var i = 0;
for (i = 0;
    (i < 24) && ((res == undefined) || (res == 0x06)); ++i) {
    /// Wait 5 s
    sleep(5000);
    /// Send End of Sowftare download
    sendExtendedOMCI(OMCC, "End_Software_Download", 0, 0, firmMeid, { "imageSize": firmwareSize, "nbOfCircuitPack": 1, "softImageInstance": firmMeid, "windowSize": windowSize, "crc32": crc });
    /// Wait for the ack of the end (Wait for the busy)
    res = waitForOMCI(OMCC, "End_Software_Download_Done", 10000);
    logInfo("End SW download ans #" + (i + 1) + "   Result :" + res);
    logInfo("--------------------");
}

if ((res == undefined) || (res != 0x00)) testFailed("End Software Download acknowledge not received");
logInfo("Time to receive End software download ack: " + (i * 5) + " seconds.");

var resp_get = undefined;
resp_get = OMCI.GetSoftwareImageME(OMCC, firmMeid);
if (resp_get == undefined) testFailed("Get Software Image not received");
logInfo("Software_Image Bank" + firmMeid + ": " + (resp_get.IsValid != 0 ? "Valid" : "Invalid") + " " + (resp_get.IsActive != 0 ? "Active" : "Inactive") + " " + (resp_get.IsCommitted != 0 ? "Committed" : "Uncommitted"));
logInfo("Software_Image Bank" + firmMeid + ": Version " + resp_get.Version /*ArrayToString(resp_get.Version)*/ );

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



if (resp_get.IsValid != 1) testFailed("Image should be valid");
if (resp_get.IsActive != 0) testFailed("Image should be inactive");
if (resp_get.IsCommitted != 0) testFailed("Image should not be committed");

testPassed();