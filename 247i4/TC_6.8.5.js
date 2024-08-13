// CONTRIB-6.8.5
// Test Case to check the OMCC version

include("Config.js");

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

testPassed("ONU activated");

var resp = OMCI.Get(OMCC, "ONU2_G", 0, ["OMCCversion"]);

if (resp == undefined)
    testFailed("ONU is no responding to a Get on the ONU2-G entity");

// Check if the OMCC version matches one to fthe following values:
// 0x80 to 0x86
// 0x96
// 0xA0 to 0xA4
// 0xB0 to 0xB4
if (resp["OMCCversion"] == 0x80)
    logInfo("OMCCVersion: 0x80 -- " + "ITU-T G.984.4 (06/04)");
else if (resp["OMCCversion"] == 0x81)
    logInfo("OMCCVersion: 0x81 -- " + "ITU-T G.984.4 2004 Amd.1 (06/05)");
else if (resp["OMCCversion"] == 0x82)
    logInfo("OMCCVersion: 0x82 -- " + "ITU-T G.984.4 2004 Amd.2 (03/06)");
else if (resp["OMCCversion"] == 0x83)
    logInfo("OMCCVersion: 0x83 -- " + "ITU-T G.984.4 2004 Amd.3 (12/06)");
else if (resp["OMCCversion"] == 0x84)
    logInfo("OMCCVersion: 0x84 -- " + "ITU-T G.984.4 2008 (02/08)");
else if (resp["OMCCversion"] == 0x85)
    logInfo("OMCCVersion: 0x85 -- " + "ITU-T G.984.4 2008 Amd.1 (06/09)");
else if (resp["OMCCversion"] == 0x86)
    logInfo("OMCCVersion: 0x86 -- " + "ITU-T G.984.4 2008 Amd.2 (2009). Baseline message set only");
else if (resp["OMCCversion"] == 0x96)
    logInfo("OMCCVersion: 0x96 -- " + "ITU-T G.984.4 2008 Amd.2 (2009). Extended message set option, in addition to the baseline message set");
else if (resp["OMCCversion"] == 0xA0)
    logInfo("OMCCVersion: 0xA0 -- " + "ITU-T G.988 (2010). Baseline message set only");
else if (resp["OMCCversion"] == 0xA1)
    logInfo("OMCCVersion: 0xA1 -- " + "ITU-T G.988 Amd.1 (2011). Baseline message set only");
else if (resp["OMCCversion"] == 0xA2)
    logInfo("OMCCVersion: 0xA2 -- " + "ITU-T G.988 Amd.2 (2012). Baseline message set only");
else if (resp["OMCCversion"] == 0xA3)
    logInfo("OMCCVersion: 0xA3 -- " + "ITU-T G.988 (2012). Baseline message set only");
else if (resp["OMCCversion"] == 0xA4)
    logInfo("OMCCVersion: 0xA4 -- " + "ITU-T G.988 Amd.1 (2014). Baseline message set only");
else if (resp["OMCCversion"] == 0xB0)
    logInfo("OMCCVersion: 0xB0 -- " + "ITU-T G.988 (2010). Baseline and extended message set");
else if (resp["OMCCversion"] == 0xB1)
    logInfo("OMCCVersion: 0xB1 -- " + "ITU-T G.988 Amd.1 (2011). Baseline and extended message set");
else if (resp["OMCCversion"] == 0xB2)
    logInfo("OMCCVersion: 0xB2 -- " + "ITU-T G.988 Amd.2 (2012). Baseline and extended message set");
else if (resp["OMCCversion"] == 0xB3)
    logInfo("OMCCVersion: 0xB3 -- " + "ITU-T G.988 (2012). Baseline and extended message set");
else if (resp["OMCCversion"] == 0xB4)
    logInfo("OMCCVersion: 0xB4 -- " + "ITU-T G.988 (2014). Baseline and extended message set");
else {

    logError("wrong OMCCVersion: " + resp["OMCCversion"]);
    testFailed("wrong OMCI version");
}

if (resp["OMCCversion"] < 0xA0) {
    logWarning("ONU is refering to G.984. Also this is acceptable, it is recommended to use G.988 references");
}

testPassed();