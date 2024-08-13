////////////////////////////////////////////////////////////
/// Copyright (c) 2021, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT OLT emulator products.        ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
var global = this;

// Required to be sure that boolean are boolean and not string...
if (typeof(AutomatisationParameters) != 'undefined'){
    for (attribute in AutomatisationParameters){
        if (typeof(AutomatisationParameters[attribute]) === "string"){
            if (AutomatisationParameters[attribute] == 'true'){
                AutomatisationParameters[attribute] = true;
            }
            if (AutomatisationParameters[attribute] == 'false'){
                AutomatisationParameters[attribute] = false;
            }
        }
    }
}

function ApplyPrevalence(varNameAtDst, varNameAtSrc, defaultValue, srcNames, dstNames, silent) {
    var prevalentValue = undefined;

    if (varNameAtSrc === undefined)
        varNameAtSrc = varNameAtDst;

    var logString = varNameAtSrc + ": ";

    if (Array.isArray(srcNames)) {
        for (var i = srcNames.length - 1; i >= 0; --i) {
            if (typeof(global[srcNames[i]]) == "object") {
                if (global[srcNames[i]][varNameAtSrc] !== undefined) {
                    prevalentValue = global[srcNames[i]][varNameAtSrc];
                    logString += prevalentValue + " (" + srcNames[i] + ")";
                    break;
                }
            } else if (global[srcNames[i]] !== undefined) {
                prevalentValue = global[srcNames[i]];
                logString += prevalentValue + " (" + srcNames[i] + ")";
            }
        }
    }
    if ((prevalentValue === undefined) && (typeof(srcNames) == "object")) {
        if (srcNames[varNameAtSrc] !== undefined) {
            prevalentValue = srcNames[varNameAtSrc];
            logString += prevalentValue + "(anonymous source)";
        }
    }
    if ((prevalentValue === undefined) && (global[srcNames] != undefined) && (typeof(global[srcNames]) == "object") &&
        (global[srcNames][varNameAtSrc] !== undefined)) {
        prevalentValue = global[srcNames][varNameAtSrc];
        logString += prevalentValue + " (" + srcNames + ")";
    }

    if ((prevalentValue === undefined) && (defaultValue !== undefined)) {
        prevalentValue = defaultValue;
        logString += prevalentValue + " (default value)";
    }

    if (prevalentValue !== undefined) {
        if (Array.isArray(dstNames)) {
            logString += "-- applied to";
            for (var i = 0; i < dstNames.length; ++i) {
                if (global[dstNames[i]] !== undefined) {
                    global[dstNames[i]][varNameAtDst] = prevalentValue;
                    logString += " " + dstNames[i];
                    if (varNameAtSrc != varNameAtDst)
                        logString += "." + varNameAtDst;
                } else if (typeof(dstNames[i] == "object")) {
                    dstNames[varNameAtDst] = prevalentValue;
                    logString += " anonymous";
                }
            }
        } else {
            if (dstNames !== undefined) {
                logString += " -- applied to";
                if (global[dstNames] !== undefined) {
                    global[dstNames][varNameAtDst] = prevalentValue;
                    logString += " " + dstNames;
                    if (varNameAtSrc != varNameAtDst)
                        logString += "." + varNameAtDst;
                } else if (typeof(dstNames == "object")) {
                    dstNames[varNameAtDst] = prevalentValue;
                    logString += " anonymous";
                }
            } else if (global[varNameAtDst] !== undefined) {
                global[varNameAtDst] = prevalentValue;
            }
        }
    } else {
        logString += "no default value, using predefined values";
        if (dstNames !== undefined) {
            if (Array.isArray(dstNames)) {
                logString += " (";
                for (var i = 0; i < dstNames.length; ++i) {
                    if (global[dstNames[i]] !== undefined) {
                        logString += dstNames[i] + ": " + global[dstNames[i]][varNameAtDst] + ";";
                    }
                }
                logString += ")";
            } else if (global[dstNames] !== undefined) {
                logString += " (" + dstNames + ": " + global[dstNames][varNameAtDst] + ")";
            }
        } else {
            logString += " (" + varNameAtDst + ": " + global[varNameAtDst] + ")";
        }
    }
    if (!silent)
        logInfo(logString);
}

function ApplyGlobalPrevalence(srcNames, config, silent, continued) {
    if ((!continued) && (!silent)) {
        var logString = "Loading Test Configuration from";
        if (Array.isArray(srcNames)) {
            for (var i = srcNames.length - 1; i >= 0; --i) {
                if (global[srcNames[i]] !== undefined)
                    logString += " " + srcNames[i];
            }
        } else if (global[srcNames] !== undefined)
            logString += " " + srcNames;

        logInfo(logString);
    }
    for (var i = 0; i < config.length; ++i) {
        ApplyPrevalence(config[i].name, config[i].nameAtSrc,
            config[i].defaultValue, srcNames, config[i].dsts, silent);
    }
}

/// Wait for the ONU to reboot
function WaitOnuReboot() {
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.OnuTimeToReboot > 0)) {
        /// Wait the ONU to reboot
        logInfo("Wait " + AutomatisationParameters.OnuTimeToReboot + " s for the ONU to reboot");
        sleep(AutomatisationParameters.OnuTimeToReboot * 1000);
    } else {
        popup("Action", "Wait for the ONU to reboot, then click OK");
    }
}

function PowerOffOnu(ONUIndex) {
    if (!isInteger(ONUIndex))
        ONUIndex = "";
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.UseSerialPortPlug)) {
        /// PowerOff ONU
        var plugIndex = AutomatisationParameters.ComOnuPlugNb;
        if (isInteger(ONUIndex) && Array.isArray(plugIndex)) {
            plugIndex = plugIndex[ONUIndex];
        }
        var onuPowerPlugAddress = AutomatisationParameters.IpAddr;
        if ((MT2GUI == "eOLT-GUI") || (0 == AutomatisationParameters.UseEthConnection)) {
            onuPowerPlugAddress = AutomatisationParameters.ComPort;
        }
        logInfo("Power off ONU " + ONUIndex + " on power plug (" + onuPowerPlugAddress + ") at slot " + plugIndex);
        if (onuPowerPlugAddress === AutomatisationParameters.ComPort) {
            SerialPowerPlug.PowerOff(onuPowerPlugAddress, AutomatisationParameters.ComSpeed, plugIndex);
        }
        else {
            /// Reboot via Eth Connection
            IpPowerPlug.PowerOff(AutomatisationParameters.UseEthConnection, onuPowerPlugAddress, plugIndex);
        }
        /// Wait for the ONU to switch off
        logInfo("Wait " + AutomatisationParameters.OnuTimeToSwitchOff + " s for the ONU to be OFF.");
        sleep(AutomatisationParameters.OnuTimeToSwitchOff * 1000);
    } else {
        popup("ONU Power Off", "Please power off ONU " + ONUIndex + ", and wait for ONU to shut down before clicking OK.");
    }
}

function PowerOnOnu(ONUIndex) {
    if (!isInteger(ONUIndex))
        ONUIndex = "";
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.UseSerialPortPlug)) {
        /// Power on ONU
        var plugIndex = AutomatisationParameters.ComOnuPlugNb;
        if (isInteger(ONUIndex) && Array.isArray(plugIndex)) {
            plugIndex = plugIndex[ONUIndex];
        }
        var onuPowerPlugAddress = AutomatisationParameters.IpAddr;
        if ((MT2GUI == "eOLT-GUI") || (0 == AutomatisationParameters.UseEthConnection)) {
            onuPowerPlugAddress = AutomatisationParameters.ComPort;
        }
        logInfo("Power on ONU "+ ONUIndex + " on power plug (" + onuPowerPlugAddress + ") at slot " + plugIndex);
        if (onuPowerPlugAddress === AutomatisationParameters.ComPort) {
            /// Reboot via Serial Port
            SerialPowerPlug.PowerOn(onuPowerPlugAddress, AutomatisationParameters.ComSpeed, plugIndex);
        }
        else {
            /// Reboot via Eth Connection
            IpPowerPlug.PowerOn(AutomatisationParameters.UseEthConnection, onuPowerPlugAddress, plugIndex);
        }
        /// Wait for the ONU to reboot
        WaitOnuReboot();
    } else {
        popup("ONU Power On", "Please init the ONU " + ONUIndex + " if equipment requires, and wait for ONU to boot up before clicking OK.");
    }
}

/// ConnectToPlatform -- blocking
function ConnectToPlatform(timeout_sec) {
    if (MT2GUI != "eOLT-GUI") {
        connect();
        var iteration = 0;
        while ((!isConnected()) && (iteration < timeout_sec)) {
            sleep(1000);
            iteration = iteration + 1;
        }
        return isConnected();
    }
    return false;
}

/// Reset platform and wait for reconnection
function ResetPlatform() {
    if (MT2GUI != "eOLT-GUI") {
        logInfo("resetting platform");
        var connectionStatus = isConnected();
        resetHard();
        while (connectionStatus) {
            connectionStatus = isConnected();
        }
        sleep(25); ///Wait for the disconnection to take action
        if (ConnectToPlatform(30)) {
            logInfo("connected to platform");
        } else
            logError("reconnection to platform failed");
    }
}

/// Reboot the ONU using automatisation parameters or manual asking
function RebootOnu(ONUIndex) {
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.UseSerialPortPlug)) {
        /// Reboot ONU
        logInfo("Reboot ONU");
        PowerOffOnu(ONUIndex);
        PowerOnOnu(ONUIndex);
    } else {
        popup("ONU Power cycle", "Please reboot the ONU if equipment requires, and wait for ONU to boot up before clicking OK.");
    }
}

/// Disconnect the fiber using automatisation parameters or manual asking
function DisconnectAndReconnectFiber() {
    if ((typeof(AutomatisationParameters) != 'undefined') && AutomatisationParameters.AutomaticFiberDisconnect) {
        logInfo("Stopping Downstream laser to simulate Fiber disconnection");
        if (MT2GUI == "eOLT-GUI") {
            stopEmulation();
        } else {
            stopLaser();
        }
        sleep(20000);
        logInfo("Starting Downstream laser to simulate Fiber connection");
        if (MT2GUI == "eOLT-GUI") {
            startEmulation();
        } else {
            startLaser();
        }
        /// Wait for ONU PLL to lock on downstream signal
        sleep(5000);
    } else {
        popup("Fiber disconnection", "Please disconnect, then reconnect the fiber, then click OK.");
    }
}

function DisconnectFiber() {
    if ((typeof(AutomatisationParameters) != 'undefined') && AutomatisationParameters.AutomaticFiberDisconnect) {
        logInfo("Stopping Downstream laser to simulate Fiber disconnection");
        stopLaser();
        sleep(10000);
    } else {
        popup("Fiber disconnection", "Please disconnect then click OK.");
    }
}

function ReconnectFiber() {
    if ((typeof(AutomatisationParameters) != 'undefined') && AutomatisationParameters.AutomaticFiberDisconnect) {
        logInfo("Starting Downstream laser to simulate Fiber connection");
        startLaser();
        /// Wait for ONU PLL to lock on downstream signal
        sleep(5000);
    } else {
        popup("Fiber reconnection", "Please reconnect then click OK.");
    }
}

/// Connect the Ethernet cable
function ConnectONUEthernet() {
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.AutomaticEthernetConnectionUsingXena == 1)) {}
    else {
        popup("Action", "Connect the Ethernet cable at ONU side on the first Ethernet port");
    }
}

function ReconnectONUEthernet() {
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.AutomaticEthernetConnectionUsingXena == 1)) {}
    else {
        popup("Action", "Click Ok, then Connect the Ethernet cable at ONU side on the first Ethernet port");
    }
}

/// Disconnect the Ethernet cable
function DisconnectONUEthernet() {
    if ((typeof(AutomatisationParameters) != 'undefined') && (AutomatisationParameters.AutomaticEthernetConnectionUsingXena == 1)) {}
    else {
        popup("Action", "Click OK, then disconnect Ethernet cable at ONU side");
    }
}

function LoadValue(stringId, defaultValue) {
    var finalValue = defaultValue;
    if (global[stringId] !== undefined)
        finalValue = global[stringId];

    logInfo("Loading " + stringId + ": " + JSON.stringify(finalValue));

    return finalValue;
}

function Init() {
    if ((global['_init'] != undefined) && (typeof(global['_init']) == 'function'))
        global['_init']();
}

function Evaluate(filePath, configuration) {
    try {
        evaluate(filePath, configuration);
    } catch (e) {
        if (e.message.indexOf("PASSED") != -1)
            testPassed(e.message.substring(e.message.indexOf("PASSED")));
        else
            throw e;
    }
}

function TestPathToTestName(path) {

    var pathSegments = path.split("/");
    var name = pathSegments[pathSegments.length - 1];
    pathSegments = name.split("\\");
    name = pathSegments[pathSegments.length - 1];
    return name;
}

/// Launch automatically all test cases defined in the Auto structure
function AutomaticTests(Auto) {
    /// Set script parameters
    ScriptParameters = new Array();
    AutomatisationParameters = clone(Auto);
    var rV = undefined;
    /// Execute each test case
    for (var TC in Auto.TC_ToExecute) {
        /// Add the test case to the list
        addTestCaseToList(Auto.TC_ToExecute[TC].Filename);
        /// Add blank line to logger
        logInfo("");
        logInfo("");
        /// Reboot ONU if asked
        if (Auto.RebootBetweenEachTC)
            RebootOnu();

        logInfo("Running script: " + Auto.TC_ToExecute[TC].Filename);
        /// Set script parameters
        ScriptParameters = new Array();
        AutomatisationParameters = clone(Auto);
        for (var param in Auto.TC_ToExecute[TC].ScriptParameters) {
            ScriptParameters[param] = Auto.TC_ToExecute[TC].ScriptParameters[param];
            logInfo("ScriptParameters[" + param + "]=" + ScriptParameters[param]);
        }
        var now = new Date();
        var fileRootName = TestPathToTestName(Auto.TC_ToExecute[TC].Filename) + "-" + now.toString();

        var logFile = undefined;
        var captureFile = undefined;
        if ((typeof openLogFile !== typeof undefined) && Auto.splitLogs) {
            logFile = fileRootName + ".htm";
            openLogFile(logFile);
        }
        if ((typeof startMessageCapture !== typeof undefined) && Auto.splitCaptures) {
            captureFile = fileRootName;
            startMessageCapture(captureFile);
        }
        /// Launch the test case
        try {
            /// Reset eOLT-GPON
            setCurrentScriptFilename(Auto.TC_ToExecute[TC].Filename);
            Evaluate(Auto.TC_ToExecute[TC].Filename);
        } catch (e) {
            if (e.message.indexOf("Aborted") != -1) {
                AutomatisationParameters = undefined;
                ScriptParameters = undefined;
                /// User abort -> send the abort
                testFailed("Aborted");
            } else {
                /// Test failed -> go to next test case
                logError("FAILED(" + e.message + ")");
                if (rV == undefined) {
                    rV = clone(Auto);
                    rV.TC_ToExecute = [];
                }
                rV.TC_ToExecute.push(Auto.TC_ToExecute[TC]);
            }
        }
        if (logFile) {
            closeLogFile(logFile);
        }
        if (captureFile) {
            stopMessageCapture(captureFile);
        }
    }
    logInfo("");
    logInfo("");
    logInfo("*** End of scripts ***");
    AutomatisationParameters = undefined;
    ScriptParameters = undefined;
    testPassed("Batch Test Finished");
    if (rV != undefined)
        logError("FAILED: " + rV.TC_ToExecute.length + " tests failed");
    else
        testPassed("PASSED");

    return rV;
}

addHelpInfo("ApplyPrevalence", "ApplyPrevalence(varNameAtDst, varNameAtSrc, defaultValue, srcNames, dstNames, silent): Set a variable given by name based on prevalence among srcs, ordered from least prevalent to most prevalent (the 1st value must be the default). srcs may be a value, an array of objects or an object. If a defined value is found, or if a defaultValue is provided, it is applied to dsts (which may be an object or an array of object)");
addHelpInfo("ApplyGlobalPrevalence", "ApplyGlobalPrevalence(srcNames, config, silent, continued): applya prevalence matrix. srcNames is the same as in ApplyPrevalence. config is an array of object defined as {name: see nameAtDst in ApplyPrevalence, nameAtSrc: see ApplyPrevalence, defaultValue: see ApplyPrevalence, dsts: see ApplyPrevalence}");
addHelpInfo("Evaluate", "Evaluates a script. throws an error if fails", ["filePath", "configuration"], ["script path", "configuration object"]);
addHelpInfo("Init", "Looks in the global object for a function called '_init'. If it exists, calls it");
addHelpInfo("LoadValue", "Tries to load load a variable from the global object, if not use the default value", ["stringId", "defaultValue"], ["variable identifier", "default value"], "the variable final value");
addHelpInfo("ResetPlatform", "ResetPlatform(): reset platform and waits for connection");
