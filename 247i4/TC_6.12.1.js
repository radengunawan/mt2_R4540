//CONTRIB 6.12.1 -- Test Case on Dying Gasp

include("Config.js");

/// Initialize Variables
var ONUID = 1;
var OMCC = ONUID;

var testPowerButton = false;

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

OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

ONUG = OMCI.GetMEIDFromDb(OMCC, "ONU_G");

logInfo("Step 1: Cause an electrical disconnection at the ONU power socket");

if ((typeof(AutomatisationParameters) != 'undefined') && AutomatisationParameters.UseSerialPortPlug) {
    /// Reboot ONU
    logInfo("Powering Off ONU");
    PowerOffOnu();
} else {
    popup("ONU Power off", "Please power off the ONU by disconnecting the power socket");
}

///Check the dying gasp reception
logInfo("Step 2: Wait for the reception of, for GPON ONUs, three Dying Gasp PLOAM messages, and for other ONUs, of a Dying Gasp indication");
var resp = PLOAMMapper.waitFor("Dying_Gasp", ONUID, 3000, 3); ///3 applies to GPON, but we will receive more than 3 in XG/...

if (resp == undefined) {
    PowerOnOnu();
    testFailed("Pass/Fail 1: No Dying Gasp received at Step 2");
}

if (testPowerButton) {

    logInfo("Step 3: Connect back the ONU power socket and wait till the ONU is up and running.");
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.UseSerialPortPlug == 1)) {
        /// Reboot ONU
        logInfo("Powering On ONU");
        PowerOnOnu();
    } else {
        popup("ONU Power on", "Please power on the ONU and wait for it to boot");
    }

    PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
    sleep(200);

    /// Create OMCC
    PLOAMMapper.CreateOMCC(ONUID, OMCC);
    sleep(500);

    testPassed("ONU activated");

    OMCI.MIB_Reset(OMCC);
    OMCI.MIB_Upload(OMCC);

    testPassed("MIB Uploaded");

    logInfo("Step 4: manually power off the ONU using the power button");
    popup("ONU Power off", "Please power off the ONU using the power button");

    ///Check the dying gasp reception
    logInfo("Step 5: Wait for the reception of, for GPON ONUs, three Dying Gasp PLOAM messages, and for other ONUs, of a Dying Gasp indication");
    var resp = PLOAMMapper.waitFor("Dying_Gasp", ONUID, 3000, 3); ///3 applies to GPON, but we will receive more than 3 in XG/...

    if (resp == undefined) {
        PowerOnOnu();
        testFailed("Pass/Fail 3: No Dying Gasp received at Step 6");
    }
}
PowerOnOnu();
testPassed();