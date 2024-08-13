include("Config.js");

//Test case for the use of extended OMCI in a Software Download using the minimal and variable section size
/// Initialize Variables
var alignTransitionOnWindows = LoadValue("alignTransitionOnWindows", false);

if (alignTransitionOnWindows)
    testPassed("Testing Software download variable size with aligned transitions");
else
    testPassed("Testing Software download variable size without aligned transitions");

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
var res = undefined;
sendExtendedOMCI(OMCC, "Start_Software_Download", 0, 0, firmMeid, { "imageSize": firmwareSize, "nbOfCircuitPack": 1, "softImageInstance": firmMeid, "windowSize": windowSize });
res = waitForOMCI(OMCC, "Start_Software_Download_Done", 5000); /// Wait response during 5s
if (res == undefined) testFailed("Start Software Download acknowledge not received");
windowSize = res + 1;

logInfo("window size: " + windowSize + " sections");

var bulkSectionSize = RandomInteger(35, 1964);
logInfo("bulk section size: " + bulkSectionSize);
var Q = Math.floor(firmware.length / bulkSectionSize);
var R = firmware.length - (Q * bulkSectionSize);

var firstPartSize = Math.floor((R + bulkSectionSize) / 2);
var firstPartSectionsInLastWindow = firstPartSize % windowSize;
if (alignTransitionOnWindows) {
    //force windows alignment
    firstPartSize = Math.ceil(firstPartSize / windowSize) * windowSize;
    firstPartSectionsInLastWindow = 0;
} else {
    ///adjust firstPartSize to avoid windows alignment
    if (0 == firstPartSectionsInLastWindow) {
        firstPartSectionsInLastWindow = RandomInteger(1, windowSize - 1);
        ///make sure the 1st part does not fall on a perfect boundary
        firstPartSize += firstPartSectionsInLastWindow;
    }
}
logInfo("1st part size: " + firstPartSize + " bytes (" + Math.floor(firstPartSize / windowSize) + " full windows (" + windowSize + " sections) + " + firstPartSectionsInLastWindow + " sections)");


var midPartSizeSectionsCount = Q - 1;
var midPartSectionsInFirstWindow = (windowSize - firstPartSectionsInLastWindow) % windowSize;
var midPartSectionsInLastWindow = (midPartSizeSectionsCount - midPartSectionsInFirstWindow) % windowSize;
if (alignTransitionOnWindows) {
    //force windows alignment
    midPartSizeSectionsCount = Math.floor(midPartSizeSectionsCount / windowSize) * windowSize;
    midPartSectionsInLastWindow = 0;
} else {
    ///adjust midPartSize to avoid windows alignment
    if (0 == midPartSectionsInLastWindow) {
        midPartSectionsInLastWindow = RandomInteger(1, windowSize - 1);
        midPartSizeSectionsCount -= (windowSize - midPartSectionsInLastWindow);
    }
}
var midPartSize = midPartSizeSectionsCount * bulkSectionSize;
var midPartFullWindows = (midPartSizeSectionsCount - midPartSectionsInFirstWindow - midPartSectionsInLastWindow) / windowSize; ///this must yield an integer result by construction

logInfo("mid part size: " + midPartSize + " bytes (" + midPartSectionsInFirstWindow + " sections + " + midPartFullWindows + " full windows  + " + midPartSectionsInLastWindow + " sections)");


var lastPartSize = firmware.length - (firstPartSize + midPartSize);
var lastPartSectionsInFirstWindow = (windowSize - midPartSectionsInLastWindow) % windowSize;
var lastPartFullWindows = Math.floor(((lastPartSize - lastPartSectionsInFirstWindow) / windowSize));
var lastPartSectionsInLastWindow = lastPartSize - (lastPartSectionsInFirstWindow + (lastPartFullWindows * windowSize));
logInfo("last part part size: " + lastPartSize + " bytes (" + lastPartSectionsInFirstWindow + " sections + " + lastPartFullWindows + " full windows  + " + lastPartSectionsInLastWindow + " sections)");

var sent = 0;
var iteration = 0;
while (sent < firmware.length) {
    if ((iteration % 32) == 0) testPassed("Sending window " + Number(iteration + 1) + " (bytes sent: " + sent + "/" + firmware.length + ")");
    if (sent < firstPartSize) {
        if (sent + windowSize <= firstPartSize) {
            var dataSec = firmware.mid(sent, windowSize);
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": 1 });
            sent += windowSize;
            if (sent >= firstPartSize)
                logInfo("transitioning betweent part 1 and part 2");
        } else {
            logInfo("transitioning betweent part 1 and part 2");
            ///divide the window in 2 parts -- ack is only needed on the 2nd part
            var dataSec = firmware.mid(sent, (firstPartSize - sent));
            logInfo("sending " + dataSec.length + " sections of 1 byte -- no ack");
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": 1, 'disableAck': 1 });
            var nextSeqNo = dataSec.length;
            sent += dataSec.length;
            logInfo("sending " + (windowSize - dataSec.length) + " sections of " + bulkSectionSize + " byte--ack requested");
            var dataSec = firmware.mid(sent, (windowSize - dataSec.length) * bulkSectionSize);
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": bulkSectionSize, "firstSectionSeqNo": nextSeqNo });
            sent += dataSec.length;
        }
    } else if (sent < (firstPartSize + midPartSize)) {
        if ((sent + (windowSize * bulkSectionSize)) <= (firstPartSize + midPartSize)) {
            var dataSec = firmware.mid(sent, windowSize * bulkSectionSize);
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": bulkSectionSize });
            sent += windowSize * bulkSectionSize;
            if (sent >= firstPartSize + midPartSize)
                logInfo("transitioning betweent part 2 and part 3");
        } else {
            logInfo("transitioning betweent part 2 and part 3");
            ///divide the window in 2 part -- ack is only needed on the 2nd part
            var remainingMidPart = firstPartSize + midPartSize - sent;
            var remainingBulkSections = Math.floor(remainingMidPart / bulkSectionSize);
            if (remainingBulkSections > 0) {
                logInfo("sending " + remainingBulkSections + " sections of " + bulkSectionSize + " byte-- no ack requested");
                var dataSec = firmware.mid(sent, remainingBulkSections * bulkSectionSize);
                sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": bulkSectionSize, 'disableAck': 1 });
                sent += dataSec.length;
            }
            dataSec = firmware.mid(sent, windowSize - remainingBulkSections);
            logInfo("sending " + dataSec.length + " sections of 1 byte -- ack requested");
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": 1, "firstSectionSeqNo": remainingBulkSections });
            sent += dataSec.length;
        }
    } else {
        if (sent + windowSize < firmware.length) {
            var dataSec = firmware.mid(sent, windowSize);
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": 1 });
            sent += windowSize;
        } else {
            var dataSec = firmware.mid(sent, firmware.length - sent);
            sendExtendedOMCI(OMCC, "Download_Section", 0, 0, firmMeid, { "image": dataSec, "maxSectionSize": 1 });
            sent += windowSize;
        }
    }
    res_download_section = waitForOMCI(OMCC, "Download_Section_Done", 5000);
    if (res_download_section == undefined) testFailed("No window acknowledge received for window ");
    iteration++;
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