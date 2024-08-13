//6.9.5 - Test Case on on Optical parameters counters and alarms

include("Config.js");

verdict = true;

///The following Levels must be measured independantly
var expectedRxOpticalLevel = (typeof(ScriptParameters) != 'undefined') ? parseFloat(ScriptParameters[0]) : -22.0;
var expectedTxOpticalLevel = (typeof(ScriptParameters) != 'undefined') ? parseFloat(ScriptParameters[1]) : 3.0;
logInfo("Expected ONU Rx Optical Level: " + expectedRxOpticalLevel.toFixed(2));
logInfo("Expected ONU Tx Optical Level: " + expectedTxOpticalLevel.toFixed(2));
 

///Tolerance from measurement
var tolerance = 3; //dBm

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

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

// Test step 2: Get and record the Optical parameters (Rx power attribute 'Optical signal level', Tx power) defined in the ANI-G ME

logInfo("################################");
logInfo("################################");

testPassed("Step 2. Get and record the Optical parameters (Rx power attribute Optical signal level, Tx power) defined in the ANI-G ME");

var ANI_G = OMCI.GetMEIDFromDb(OMCC, "ANI_G", 0);

var resp = OMCI.Get(OMCC, "ANI_G", ANI_G, ["OpticalSignalLevel"]);
if (resp == undefined)
    testFailed("Pass/Fail 1: ONU has not sent optical parameters at step 2");

var rxOpticalLevel = Uint16To2Complement(parseInt(resp["OpticalSignalLevel"])) * 0.002; ///attribute unit is 0.002 dBm
logInfo("Optical Signal Level is " + rxOpticalLevel.toFixed(3) + "dBm");

resp = OMCI.Get(OMCC, "ANI_G", ANI_G, ["TransmitOpticalLevel"]);
if (resp == undefined)
    testFailed("Pass/Fail 1: ONU has not sent optical parameters at step 2");
var txOpticalLevel = Uint16To2Complement(parseInt(resp["TransmitOpticalLevel"])) * 0.002; ///attribute unit is 0.002 dBm
logInfo("Transmit Optical Level is " + txOpticalLevel.toFixed(3) + "dBm")

if ((rxOpticalLevel > (expectedRxOpticalLevel + tolerance)) || (rxOpticalLevel < (expectedRxOpticalLevel - tolerance))) {
    logError("Pass/Fail 2: Optical Signal Level measured at step 2 is not within " + tolerance + "dBm of the expected value");
    verdict = false;
}
if ((txOpticalLevel > (expectedTxOpticalLevel + tolerance)) || (txOpticalLevel < (expectedTxOpticalLevel - tolerance))) {
    logError("Pass/Fail 2: Transmit Optical Level measured at step 2 is not within " + tolerance + "dBm of the expected value");
    verdict = false;
}



// Test step 3: Test and record the 'test result' for the Optical parameters (Rx or 'received optical power',
//		Tx or 'Mean optical launch power', Ibias or 'Laser Bias Current', Vbias or 'power feed voltage', 
//		Temperature) defined in the ANI-G ME

logInfo("################################");
logInfo("################################");

testPassed("Step 3. Test and record the test result for the Optical parameters (Rx, Tx, Ibias, Vbias, Temperature) defined in the ANI-G ME");
resp = OMCI.Test(OMCC, "ANI_G", ANI_G, { test: 7 });

if (undefined == resp)
    testFailed("Pass/Fail 3: ONU has not sent the test results");

if (parseInt(resp['Result']['Type 1']) != 1) {
    logError("Type 1 result must be 1 (is " + resp['Result']['Type 1'] + ")");
    verdict = false;
}
var powerFeedVoltage = Uint16To2Complement(parseInt(resp['Result']["Power Feed Voltage"])) * 20; ///unit is 20 mV
logInfo("measured Power Feed Voltage is " + powerFeedVoltage + " mV");
if (parseInt(resp['Result']['Type 3']) != 3) {
    logError("Type 3 result must be 3 (is " + resp['Result']['Type 3'] + ")");
    verdict = false;
}
rxOpticalLevel = Uint16To2Complement(parseInt(resp['Result']["Received Optical Power"])) * 0.002; ///attribute unit is 0.002 dbuWatt
rxOpticalLevel -= 30; ///conversion to "dBm"
logInfo("measured Received Optical Power is " + rxOpticalLevel.toFixed(3) + "dBm");
if ((rxOpticalLevel > (expectedRxOpticalLevel + tolerance)) || (rxOpticalLevel < (expectedRxOpticalLevel - tolerance))) {
    logError("Pass/Fail 4: Received Optical Power measured at step 3 is not within " + tolerance + " dBm of the expected value");
    verdict = false;
}
if (parseInt(resp['Result']['Type 5']) != 5) {
    logError("Type 5 result must be 5 (is " + resp['Result']['Type 5'] + ")");
    verdict = false;
}
txOpticalLevel = Uint16To2Complement(parseInt(resp['Result']["Mean optical launch power"])) * 0.002; ///attribute unit is 0.002 dbuWatt
txOpticalLevel -= 30; ///conversion to "dBm"
logInfo("measured Tx Optical Power is " + txOpticalLevel.toFixed(3) + " dBm");
if ((txOpticalLevel > (expectedTxOpticalLevel + tolerance)) || (txOpticalLevel < (expectedTxOpticalLevel - tolerance))) {
    logError("Pass/Fail 2: Mean optical launch power measured at step 2 is not within " + tolerance + " dBm of the expected value");
    verdict = false;
}
if (parseInt(resp['Result']['Type 9']) != 9) {
    logError("Type 9 result must be 9 (is " + resp['Result']['Type 9'] + ")");
    verdict = false;
}
var laserBiasCurrent = parseInt(resp['Result']["Laser bias Current"]) * 2; ///attribute unit is 2 uA
logInfo("measured Laser Bias Current is " + laserBiasCurrent + " uA");
if (parseInt(resp['Result']['Type 12']) != 12) {
    logError("Type 12 result must be 12 (is " + resp['Result']['Type 12'] + ")");
    verdict = false;
}
var temperature = Uint16To2Complement(parseInt(resp['Result']["Temperature"])) / 256; ///attribute unit is 1/256 degree C resolution
logInfo("measured Temperature is " + temperature.toFixed(3) + " degree C");




// Test step 4 : Set the 'Lower optical threshold' attribute to the value Rx(dBm) obtained at step 3  + 1(dB)
// Test step 5 : Wait for the alarm 
logInfo("################################");
logInfo("################################");

var highRxThreshold_0_5dB = Math.ceil((rxOpticalLevel + 1) * 2);
testPassed("Step 4. Set the Lower optical threshold attribute to the value Rx(dBm) obtained at step 3  + 1(dB)  (granularity is 0.5 dB): " + (highRxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'LowerOpticalThreshold': (-highRxThreshold_0_5dB) & 0x000000FF }); // attribute unit is -0.5 dB, relative to 0 dBm

testPassed("Step 5. Wait for the alarm Low received optical power");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "Low received optical power", 60000)) {
    logError("Pass/Fail 6. the ONU has not sent the Low received optical power alarm at step 5");
    verdict = false;
}


// Test step 6 : Set the 'Lower optical threshold' attribute to the value Rx(dBm) obtained at step 3  - 1(dB)
// Test step 7 : Wait for the alarm is cleared

logInfo("################################");
logInfo("################################");

var lowRxThreshold_0_5dB = Math.floor((rxOpticalLevel - 1) * 2);

testPassed("Step 6. Set the 'Lower optical threshold' attribute to the value Rx(dBm) obtained at step 3 - 1(dB)   (granularity is 0.5 dB): " + (lowRxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'LowerOpticalThreshold': (-lowRxThreshold_0_5dB) & 0x000000FF }); // attribute unit is -0.5 dB, relative to 0 dBm


testPassed("Step 7. Wait till the alarm Low received optical power is cleared");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "", 60000)) {
    logError("Pass/Fail 8. the ONU has not cleared the Low received optical power alarm at step 7");
    verdict = false;
}

// Test step 8: Set the Upper optical threshold attribute to the value Rx(dBm) obtained at step 3 - 1(dBm)
// Test step 9: Wait for the alarm High received optical power

logInfo("################################");
logInfo("################################");

testPassed("Step 8. Set the Upper optical threshold attribute to the value Rx(dBm) obtained at step 3 - 1(dBm)   (granularity is 0.5 dB): " + (lowRxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'UpperOpticalThreshold': (-lowRxThreshold_0_5dB) & 0x000000FF }); // attribute unit is -0.5 dB, relative to 0 dBm

testPassed("Step 9. Wait for the alarm High received optical power");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "High received optical power", 60000)) {
    logError("Pass/Fail 10. the ONU has not sent the Low received optical power alarm at step 9");
    verdict = false;
}



// Test step 10: Modify the Lower optical threshold attributeto the value obtained at step 3  + 1(dB)
// Test step 11 : Wait for the alarm is cleared

logInfo("################################");
logInfo("################################");

testPassed("Step 10. Set the 'Upper optical threshold' attribute to the value Rx(dBm) obtained at step 3 + 1(dB)   (granularity is 0.5 dB): " + (highRxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'UpperOpticalThreshold': (-highRxThreshold_0_5dB) & 0x000000FF }); // attribute unit is -0.5 dB, relative to 0 dBm

testPassed("Step 11. Wait till the alarm High received optical power is cleared");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "", 60000)) {
    logError("Pass/Fail 8. the ONU has not cleared the High received optical power alarm at step 11");
    verdict = false;
}

var highTxThreshold_0_5dB = Math.ceil((txOpticalLevel + 1) * 2);


// Test step 12: Set the 'Lower transmit power threshold' attribute with the value Tx(dBm) obtained at step 3 + 1(dB)
// Test step 13 : Wait for the alarm 'Low transmit optical power'

logInfo("################################");
logInfo("################################");

testPassed("Step 12. Set the Lower transmit power threshold attribute with the value Tx(dBm) obtained at step 3 + 1(dBm) (granularity is 0.5 dB): " + (highTxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'LowerTransmitPowerThreshold': highTxThreshold_0_5dB & 0x000000ff }); // attribute unit is "2s complement with 0.5 dB granularity", relative to 0 dBm

testPassed("Step 13. Wait for the alarm Low transmit optical power");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "Low transmit optical power", 60000)) {
    logError("Pass/Fail 14. the ONU has not sent the Low received optical power alarm at step 13");
    verdict = false;
}


// Test step 14: Set the 'Lower transmit power threshold' attribute with the value Tx(dBm) obtained at step 3 - 1(dB)
// Test step 15 : Wait till the alarm 'Low transmit optical power' is cleared

logInfo("################################");
logInfo("################################");

var lowTxThreshold_0_5dB = Math.floor((txOpticalLevel - 1) * 2);

testPassed("Step 14. Modify the Lower transmit power threshold attribute with the value Tx(dBm) obtained at step 3 - 1(dB)   (granularity is 0.5 dB): " + (lowTxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'LowerTransmitPowerThreshold': lowTxThreshold_0_5dB & 0x000000ff }); //// attribute unit is "2s complement with 0.5 dB granularity", relative to 0 dBm

testPassed("Step 15. Wait till the alarm Low transmit optical power is cleared");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "", 60000)) {
    logError("Pass/Fail 16. the ONU has not cleared the Low transmit optical power alarm at step 15");
    verdict = false;
}


// Test step 16: Set the Upper transmit power threshold attribute with the value Tx(dBm) obtained at step 3 - 1(dBm)
// Test step 17 : Wait for the alarm High transmit optical power

logInfo("################################");
logInfo("################################");

testPassed("Step 16. Set the Upper transmit power threshold attribute with the value Tx(dBm) obtained at step 3 - 1(dBm) (granularity is 0.5 dB): " + (lowTxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'UpperTransmitPowerThreshold': lowTxThreshold_0_5dB & 0x000000ff }); // attribute unit is "2s complement with 0.5 dB granularity", relative to 0 dBm

testPassed("Step 17. Wait for the alarm High transmit optical power");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "High transmit optical power", 60000)) {
    logError("Pass/Fail 18. the ONU has not sent the High transmit optical power alarm at step 17");
    verdict = false;
}


// Test step 18: Modify the Upper transmit power threshold attribute with the value Tx(dBm) obtained at step 3 + 1(dBm
// Test step 17 : Wait till the alarm High transmit optical power is cleared

logInfo("################################");
logInfo("################################");

testPassed("Step 18. Modify the Upper transmit power threshold attribute with the value Tx(dBm) obtained at step 3 + 1(dBm) (granularity is 0.5 dB): " + (highTxThreshold_0_5dB / 2).toFixed(1));

clearOMCIAlarms(OMCC);

OMCI.Set(OMCC, "ANI_G", ANI_G, { 'UpperTransmitPowerThreshold': highTxThreshold_0_5dB & 0x000000ff }); // attribute unit is "2s complement with 0.5 dB granularity", relative to 0 dBm

testPassed("Step 19. Wait till the alarm High transmit optical power is cleared");
if (!OMCI.waitForAlarm(OMCC, 263, ANI_G, "", 60000)) {
    logError("Pass/Fail 20. the ONU has not cleared the High transmit optical power alarm at step 19");
    verdict = false;
}

if (!verdict)
    testFailed("Error in measurement or alarm handling");

testPassed();