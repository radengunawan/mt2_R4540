include("Config.js");

//Test case 6.9.1
/// Initialize Variables
var VID1 = RandomInteger(1, 4094); /// VID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;



ConnectONUEthernet();

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


var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);


// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });
testPassed("MIB setup done");

/// Clear pre-existing alarms from the system
/// could use clearOMCIAlarms, but use polling loop for backward compatibility
var alarm = waitForOMCIAlarm(OMCC, 0);

while (alarm != undefined) {
    alarm = waitForOMCIAlarm(OMCC, 0);
}

DisconnectONUEthernet();

testPassed("Wait for LAN LOS detection before going to Get All Alarms");

if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "LAN-LOS", 60000))
    testFailed("LAN-LOS Alarm not received");
/// Ask for all alarms
OMCI.Get_All_Alarms(OMCC); ///clear alarm at the ONU and reset seqno to 1

var expectedSeqNb = 1;
///clear all alarms from the Get All (+ possible race condition cases)
alarm = waitForOMCIAlarm(OMCC, 0);
while (alarm != undefined) {
    if (alarm.seqNB == expectedSeqNb)
        expectedSeqNb++;

    alarm = waitForOMCIAlarm(OMCC, 0);
}

// Reconnect Ethernet cable at ONU side (or activate Traffic generator port)
ReconnectONUEthernet();

// Wait for an alarm during 1 minute
testPassed("Wait for Alarm clearance");
if (!OMCI.waitForAlarm(OMCC, OMCI.GetTPME(OMCC), OMCITP, "", 60000, expectedSeqNb))
    testFailed("Alarm cleared alarm not received");

logInfo("Alarm cleared");

testPassed();