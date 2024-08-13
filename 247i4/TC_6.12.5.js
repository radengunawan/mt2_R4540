// ONU Remote Debug
testPassed("ONU Remote Debug")

include("Config.js");

/// Initialize Variables
var command = "help";
if ((typeof(ScriptParameters) != 'undefined') && (typeof(ScriptParameters[0]) != 'undefined') && (String(ScriptParameters[0]) != 'undefined') && (String(ScriptParameters[0]) != ""))
    command = String(ScriptParameters[0]);

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

var resp = OMCI.Get(OMCC, "ONU_remote_debug", 0, ["Command_format"]);

if (resp == undefined)
    testFailed("ONU is no responding to a Get on the ONU_remote_debug entity Command_format");

if (resp["Command_format"] == 0x00)
    logInfo("command format: " + "ASCII string");
else if (resp["Command_format"] == 0x01)
    logInfo("command format: " + "Free format");
else
    testFailed("unknown command format: " + resp["Command_format"]);

testPassed("Sending " + command + " Command to ONU remote debug");
OMCI.Set(OMCC, "ONU_remote_debug", 0, { 'Command': command });

var resp = OMCI.Get(OMCC, "ONU_remote_debug", 0, ["Reply_Table"]);

if ((resp == undefined) || (resp["Reply_Table"] == undefined))
    testFailed("ONU is not responding to a Get on the ONU_remote_debug entity Reply_table");
else {
    var respString = "";
    for (var i = 0; i < resp["Reply_Table"].length; i++) ///tables are provided from last to first
        respString += resp["Reply_Table"][resp["Reply_Table"].length - 1 - i];
    logInfo("ONU reply: ")
    logInfo("################################");
    logInfo(respString);
    logInfo("################################");
}
testPassed();