include("Config.js");

var AutoParameters = {
  /// /// GENERIC PARAMETERS ///
  /// Set to 1 to automatically disconnect fiber if necessary by switching off eOLT laser
  AutomaticFiberDisconnect:  1,
  /// Set to 1 if ONU reboot is necessary between each test cases
  RebootBetweenEachTC:       0,
  /// If true, will produce 1 log file per script (only available with MT2Browser)
  splitLogs:                 false,
  /// if true, will produce 1 message capture file per script (only available with MT2Browser)
  splitCaptures:             false,
  
  /// Power plug configuration
  /// Use the remote control power plug to force ONU to reboot
  UseSerialPortPlug:         1,
  /// Time for the ONU to switch off after power off (seconds)
  OnuTimeToSwitchOff:        10,  /// ONU SPECIFIC
  /// Time for the ONU to reboot (seconds)
  OnuTimeToReboot:           80,  /// ONU SPECIFIC
  /// Serial Port to use to command the ONU plug
  ComPort:                   "COM1",
  /// Serial Port speed to use to command the ONU plug
  ComSpeed:                  9600,
  /// Index of the plug for the ONU
  ComOnuPlugNb:              4,
  /// Set to 1: ePowerSwitch HTTP protocol , 2: eaton ssh protocol, 3: eaton telnet protocol for the power plug
  UseEthConnection: 0,
  /// IpAddr of the Power plug
  IpAddr: "192.168.1.200",
  /// Use traffic generator
  activateAutomatisation: 1,

  /// /// TC to execute
  /// List of test case to execute
  TC_ToExecute: [
                {Filename: ".\\scripts\\247i2\\TC_6.1.1.js", ScriptParameters: []},
                ]

};

var maxIteration = 1000;

/// Launch automatic tests
var failedTests = AutoParameters.TC_ToExecute.slice(0);
failedTests.TC_ToExecute = [];
var iteration = 0;
while (iteration < maxIteration)
{
	iteration++;
	var iterationFailedTests = AutomaticTests(AutoParameters);
	if (iterationFailedTests != undefined)
	  failedTests.TC_ToExecute = failedTests.TC_ToExecute.concat(iterationFailedTests.TC_ToExecute);
}

if (failedTests.TC_ToExecute.length > 0) {
		testFailed(failedTests.TC_ToExecute.length + " failed tests (" + ((failedTests.TC_ToExecute.length *100)/(AutoParameters.TC_ToExecute.length*maxIteration)) +  "%)");
		//AutomaticTests(failedTests); /// Test the failed tests once more
}
else if (AutoParameters.activateAutomatisation) testPassedWithTraffic();

testPassed();