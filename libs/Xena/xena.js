////////////////////////////////////////////////////////////
/// Copyright (c) 2021, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
include("Number.js");
include("String.js");

Xena = {
    /// Xena IP Address
    ipAddress: "192.168.1.13",
    /// Xena IP Port
    ipPort: 22611,
    /// Xena response timeout (1000ms)
    timeout: 1000,
    /// Xena password
    password: "xena",
    /// Reservation owner
    owner: "eOLTGPON",
    /// Delay before before traffic testing (ms)
    delayBeforeTraffic: 10000,
    /// Delay before sending each traffic in automatic traffic generation (in ms)
    delayBeforeSend: 200,
    /// Delay after sending traffic -- to allow enough time for buffer to be empties, statistical computation,...
    delayAfterSend: 600,
    /// Nb of packet to send in automatic traffic generation
    nbOfPacketToSend: 100,
    ///file path -- if defined, must be "\" terminated, and all '\' characters must be escaped properly
    filePath: "",
    /// timeout on automated send (ms)
    sendTimeOut: (10 * 1000),
    /// Current socket
    socket: undefined,
    /// Ports used for trafic 1st port eOLT, 2nd port ONU 1, 3rd port ONU 2
    ports: [
        /*{'module': 2, 'port': 0, 'unsupported': ['P_AUTONEGSELECTION', 'P_SPEEDSELECTION']},*/
        { 'module': 0, 'port': 0 },
        { 'module': 0, 'port': 1 },
        { 'module': 0, 'port': 2 },
    ],
    IPCfg: undefined //If L3 support is needed, define IPCfg attribute. If not, set to undefined
        /*{
        ports: [{
                base: "192.168.1.0"
            }, {
                base: "128.0.0.0"
            }, {
                base: "193.168.0"
            }
        ],
        protocol: 0x11 ///UDP
    }*/,

    sendLine: function (line, expected, requiredExpected, trialRepeat) {
        this.checkConnection();
        this.socket.write(line + '\r\n');
        if (expected != undefined) {
            var xenaRV = this.socket.waitForData(expected, this.timeout);
            if (!xenaRV) {
                if (requiredExpected) {
                    var remainingTrials = trialRepeat;
                    if (!isInteger(remainingTrials))
                        remainingTrials = 1;
                    while (remainingTrials > 0) {
                        ///Answer is required -- reconnect, try again and fails if second trial fails
                        this.Connect();
                        xenaRV = this.sendLine(line, expected, false);
                        if (xenaRV)
                            break;
                        remainingTrials--;
                    }
                    if (!xenaRV) {
                        TrafficGenerator.testFailed("Xena failed on line " + line);
                    }
                }
            }
            return xenaRV;
        }
        return;
    },

    sendConfigLine: function (line, notRequired, trialRepeat) {
        this.sendLine(line, '<OK>', !notRequired, trialRepeat);
    },

    isSupportedOnPort: function (port, line) {
        var portIndex = Number(port);
        if (this.ports[portIndex].unsupported != undefined) {
            var upperCaseLine = line.toUpperCase();
            for (var i in this.ports[portIndex].unsupported) {
                var regExp = new RegExp(this.ports[portIndex].unsupported[i]);
                if (upperCaseLine.search(regExp) >= 0) {
                    TrafficGenerator.logWarning("unsupported command =" + line + "= matching:  " + this.ports[portIndex].unsupported[i] + " on port " + port);
                    return false;
                }
            }
        }
        return true;
    },

    sendPortConfigLine: function (portIndex, configLine, notRequired, trialRepeat) {
        if (this.isSupportedOnPort(portIndex, configLine)) {
            var portConfigLine = this.ports[portIndex].module + '/' + this.ports[portIndex].port + " " + configLine;
            this.sendConfigLine(portConfigLine, notRequired, trialRepeat);
        }
    },

    /** Connect to the Xena device using current ipAddress, ipPort, login and name
     */
    Connect: function () {
        /// Close current connection
        if (this.socket && this.socket.isConnected()) {
            this.Disconnect();
        }
        /// Open a new connection
        this.socket = new Socket();
        if (this.socket.connectToHost(this.ipAddress, this.ipPort, this.timeout) == false)
            TrafficGenerator.testFailed("Unable to connect to Xena device (" + this.ipAddress + ":" + this.ipPort + ")");
        /// Flush the stream
        this.socket.write('\r\n');

        TrafficGenerator.logInfo("Loging into Xena chassis at " + this.ipAddress + ":" + this.ipPort + " as " + this.owner + "/" + this.password);
        /// Send the login
        this.sendConfigLine('c_logon "' + this.password + '"');

        /// Send the owner
        this.sendConfigLine('c_owner "' + this.owner + '"');

        /// Ask to release all port/module/device
        for (var i = 0; i < this.ports.length; i++) {
            if (this.ports[i] != undefined) {
                this.sendPortConfigLine(i, 'p_reservation release', true, 0);
            } else {
                TrafficGenerator.logWarning("port " + i + " is not configured");
            }
        }
        ///Note: to force the release of the port by another user, ' p_reservation relinquish' can be used
        ///the command '[slot]/[port] p_reservation?' could be used
        ///to check the port status (RELEASED, RESERVED_BY_YOU, RESERVED_BY_OTHER

        TrafficGenerator.logInfo("booking chassis");

        TrafficGenerator.logInfo("booking ports : " + JSON.stringify(this.ports));
        /// Ask the reservation of ports
        for (var i = 0; i < this.ports.length; i++) {
            if (this.ports[i] != undefined)
                this.sendPortConfigLine(i, 'p_reservation reserve', false, 0);
        }
    },

    /** Disconnect from the Xena device
     */
    Disconnect: function () {
        if (this.socket && this.socket.isConnected()) {
            for (var i = 0; i < this.ports.length; i++) {
                if (this.ports[i] != undefined)
                    this.sendPortConfigLine(i, 'p_reservation release', true)
            }

            /// Signal logging off the Xena
            this.socket.write('c_logoff\r\n');
            this.socket.disconnect();
        }
        this.socket = undefined;
    },

    checkPortBeforeAccess: function (port) {
        this.checkConnection();
        if (this.ports[Number(port)] === undefined) {
            TrafficGenerator.logWarning("Accessing unconfigured port " + port);
            return false;
        }
        return true;
    },

    GetPortSpeedMbps: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var portSpeedString = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' p_speed?', '\n', true);
        var portSpeed = parseInt(portSpeedString.afterWord("P_SPEED").wordAt(1).trim());

        return portSpeed;
    },

    /** Set port speed on the specified port (Mbps)
     */
    SetPortSpeed: function (port, portSpeed) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var currentPortSpeed = this.GetPortSpeedMbps(port);

        if (currentPortSpeed != portSpeed) {
            var portSpeedCode = "AUTO"
                try {
                    switch (portSpeed) {
                    case 10:
                        portSpeedCode = "F10M";
                        break;
                    case 100:
                        portSpeedCode = "F100M";
                        break;
                    case 1000:
                        portSpeedCode = "F1G";
                        break;
                    case 10000:
                        portSpeedCode = "F10G";
                        break;
                    default:
                        throw ("Unsupported port speed " + portSpeed);
                    }
                    this.sendPortConfigLine(Number(port), "P_SPEEDSELECTION F100M");
                } catch (e) {
                    logWarning(e);
                    popup("Action", "Please set port " + port + " speed to " + portSpeed + "Mbps, then click OK");
                }
        }
        return true;
    },

    /** Start the traffic on the specified port
     */
    StartTrafficOnPort: function (port, nbOfFrame) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'p_traffic on');
    },

    /** Stop the traffic on the specified port
     */
    StopTrafficOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'p_traffic off');
    },

    /** Enable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    EnableStreamOnPort: function (streamIdx, port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_enable [' + streamIdx + '] on');
    },

    /** Disable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    DisableStreamOnPort: function (streamIdx, port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_enable [' + streamIdx + '] off');
    },

    /** Clear transmit statistics
     */
    ClearTransmitStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'pt_clear');
    },

    /** Retrieve total transmit statistics
     */
    GetTotalTransmitStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stats = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' pt_total?', '\n', true);

        if (!stats)
            TrafficGenerator.testFailed("Unable to get transmit stats on the Xena port " + this.ports[Number(port)].port);
        /// Get the number of packet from the stats
        return Number(stats.afterWord("PT_TOTAL").wordAt(4));
    },

    /** Retrieve transmit statistics on specific stream
     */
    GetTransmitStatsOnPortAndStream: function (port, stream) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stats = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' pt_stream [' + stream + ']?', '\n', true);

        if (!stats)
            TrafficGenerator.testFailed("Unable to get transmit stats on the Xena port " + this.ports[Number(port)].port);
        /// Get the number of packet from the stats
        return Number(stats.afterWord("PT_STREAM").wordAt(5));
    },

    /** Clear receive statistics
     */
    ClearReceiveStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'pr_clear');
    },

    /** Retrieve total receive statistics
     */
    GetTotalReceiveStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stats = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' pr_total?', '\n', true);

        if (!stats)
            TrafficGenerator.testFailed("Unable to get receive stats on the Xena port " + this.ports[Number(port)].port);
        /// Get the number of packet from the stats
        return Number(stats.afterWord("PR_TOTAL").wordAt(4));
    },

    /** Retrieve  receive on specific filter
     */
    GetReceivedStatsOnPortAndFilter: function (port, filter) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stats = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' pr_filter [' + filter + '] ?', '\n', true);

        if (!stats)
            TrafficGenerator.testFailed("Unable to get receive stats on the Xena port " + this.ports[Number(port)].port);
        /// Get the number of packet from the stats
        return Number(stats.afterWord("PR_FILTER").wordAt(5));
    },

    /** Retrieve  receive on specific TID
     */
    GetReceivedStatsOnPortAndTID: function (port, tid) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stats = this.sendLine(this.ports[Number(port)].module + '/' + this.ports[Number(port)].port + ' pr_tpldtraffic [' + tid + ']?', '\n', true);

        if (!stats)
            TrafficGenerator.testFailed("Unable to get receive stats on the Xena port " + this.ports[Number(port)]);
        /// Get the number of packet from the stats
        return Number(stats.afterWord("PR_TPLDTRAFFIC").wordAt(5));
    },

    /** Set Bit rate for the specified stream
     */
    SetBitRateForStream: function (port, stream, rate) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_ratel2bps [' + stream + '] ' + rate);
    },

    /** Set Bit rate for the specified stream
     */
    SetPacketPerSecForStream: function (port, stream, rate) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_ratepps [' + stream + '] ' + rate);
    },

    /** Set the repeat for the modifier of the stream
     */
    SetRepeatModifierForStream: function (port, stream, mod, pos, mask, method, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_modifier [' + stream + ',' + mod + '] ' + pos + ' 0x' + mask + ' ' + method + ' ' + nb);
    },

    IsRepeatModifierSupported: function () {
        return true;
    },

    IsPortSpeedSettingSupported: function () {
        return true;
    },

    /** Set the packet limit for the stream
     */
    SetPacketLimitForStream: function (port, stream, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.sendPortConfigLine(Number(port), 'ps_packetlimit [' + stream + '] ' + nb);
    },

    /** Send a frame on the port
     */
    SendFrameOnPort: function (port, frame, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var frameStr = "";
        for (var i in frame)
            frameStr += frame[i].hex(2, '0');
        var times = 1;
        if (nb != undefined)
            times = nb;
        for (var i = 0; i < times; ++i) {
            this.sendPortConfigLine(Number(port), 'p_xmitone 0x' + frameStr);
            sleep(20); // need sleep to allow the OS to gain control and send the frame one by one
        }
    },

    /** Send a pcap file on the port
     */
    SendPcapFileOnPort: function (port, pcapFilename) {
        var pcap = readFile(pcapFilename);
        if (pcap.length == 0)
            TrafficGenerator.testFailed('Unable to read PCAP file "' + pcapFilename + '"');
        /// Read PCAP packet header
        var idx = 33;
        while (idx < pcap.length) {
            var incl_len = (pcap[idx] << 24) | (pcap[idx + 1] << 16) | (pcap[idx + 2] << 8) | (pcap[idx + 3]);
            var frame = new Array();
            for (var i = 0;
                (i < incl_len) && (i < (pcap.length - idx - 7)); ++i) {
                frame[i] = pcap[i + idx + 7];
            }
            this.SendFrameOnPort(port, frame);
            idx += 16 + incl_len;
        }
    },



    /** Send a xtc xena config
     */
    SendConfig: function (cfg) {
        this.checkConnection();
        /// Send the config line by line
        var lines = cfg.split("\n");
        var portNb = undefined;
        for (var i in lines) {
            /// Modify the config to set the module/port correctly
            var re = new RegExp(";Port:    [0-9]/[0-9]", "g");
            var line = lines[i];
            if (re.test(line)) {
                var portIndex = Number(line[12]);
                if (this.ports[portIndex] === undefined) {
                    TrafficGenerator.logWarning("Trying to configure undefined port: #" + portIndex);
                    portNb = undefined;
                    continue;
                }
                portNb = this.ports[portIndex].port;
                var chassis = Number(line[10]);
                if (this.ports[portIndex].module != undefined)
                    chassis = this.ports[portIndex].module;
                /// this is not a config command but a port prefix for the next commands: do not wait for OK
                line = line.replace(re, chassis + "/" + portNb);
                this.sendLine(line);
            } else {
                var apply = true;
                if (portNb === undefined)
                    apply = false;
                else if ((line[0] == ';') || (line[0] == '\r') || (line[0] == '\n') || (line == ""))
                    apply = false; ///ignore comments and empty lines...
                else {
                    apply = this.isSupportedOnPort(portIndex, line);
                }
                if (apply)
                    this.sendConfigLine(line);
            }
        }
    },

    /** Send a template xtc xena config (replace all template with associated value according to the replace table)
     */
    SendTemplateConfig: function (templateFile, templateTable) {
        /// Read the input file
        var Config = TrafficGenerator.LoadXTCFile(this.filePath + templateFile, templateTable, this.IPCfg);
        if (Config == null) {
            TrafficGenerator.logError("Unable to read the configuation file " + templateFile);
            return;
        }
        /// Send the config
        this.SendConfig(Config);
        return this.ReadStructureFromXenaFile(Config);
    },

    /** Send a template xtc xena config (replace all template with associated value according to the replace table) and start generation automatically
     */
    SendTemplateConfigAndDoTest: function (templateFile, templateTable, gemTable) {
        /// Create the Xena config file from the Xena template config file
        var struct = this.SendTemplateConfig(templateFile, templateTable);
        if (struct === undefined)
            return;
        var result = {};
        /// Disable all port/stream
        for (var port in struct) {
            this.StopTrafficOnPort(port);
            for (var stream in struct[port].Stream) {
                this.DisableStreamOnPort(stream, port);
            }
        }
        /// Wait for the ONU
        sleep(this.delayBeforeTraffic);
        /// Foreach port
        for (var port in struct) {
            TrafficGenerator.logInfo("");
            TrafficGenerator.logInfo("********");
            TrafficGenerator.logInfo("Processing Port:" + struct[port].Name);

            /// Foreach stream
            for (var stream in struct[port].Stream) {
                /// Enable the stream
                this.EnableStreamOnPort(stream, port);
                /// Clear all stats
                for (var portIdx in this.ports) {
                    this.ClearTransmitStatsOnPort(portIdx);
                    this.ClearReceiveStatsOnPort(portIdx);
                }
                TrafficGenerator.logInfo("****");
				var streamName = struct[port].Stream[stream].Name;
                TrafficGenerator.logInfo("Starting stream: " + streamName);
                /// Limit the number of packet to send
                this.SetPacketLimitForStream(port, stream, this.nbOfPacketToSend);
                /// Set translation table if asked
                if ((gemTable != undefined) && (TrafficGenerator.GEMTranslationMode != 'ignore')) {
                    delAllTranslationRules();
                    TrafficGenerator.ApplyGEMTranslationRules(port, streamName, gemTable);
                }
                sleep(this.delayBeforeSend);
                /// Send the stream
                this.StartTrafficOnPort(port);
                var nbOfPacketSent = 0;
                var nbOfIteration = this.sendTimeOut / 100;
                while ((nbOfPacketSent < this.nbOfPacketToSend) && (nbOfIteration > 0)) {
                    nbOfPacketSent = this.GetTransmitStatsOnPortAndStream(port, stream);
                    nbOfIteration--;
                    sleep(100);
                }
                /// Stop traffic
                this.StopTrafficOnPort(port);
                this.DisableStreamOnPort(stream, port);
                sleep(this.delayAfterSend);
                /// Add info to user
                TrafficGenerator.logInfo("\tSent on " + streamName + ": " + this.GetTransmitStatsOnPortAndStream(port, stream) + " Packet(s)");
                result[streamName] = {};
                /// Show the stats for each filter
                for (var stat_port in struct) {
                    for (var filter in struct[stat_port].Filter) {
                        var nbOfRcvd = this.GetReceivedStatsOnPortAndFilter(stat_port, filter);
                        result[streamName][struct[stat_port].Filter[filter].Name] = nbOfRcvd;
                        TrafficGenerator.logInfo("  Received on Port " + struct[stat_port].Name + ":" + struct[stat_port].Filter[filter].Name + ": " + nbOfRcvd + " Packet(s)");

                    }
                }
                /// Show the stats for each TID of the other Port
                for (var stat_stream in struct[port].Stream) {
                    /// For each TID
                    var stat_tid = struct[port].Stream[stat_stream].TID;
                    if (stat_tid != -1) {
                        /// For each port
                        for (var port_tid in struct) {
                            var nbOfRcvd = this.GetReceivedStatsOnPortAndTID(port_tid, stat_tid);
                            result[streamName]["TID " + stat_tid + ":" + port_tid] = nbOfRcvd;
                            TrafficGenerator.logInfo("  Received on Port " + struct[port_tid].Name + ":TID" + stat_tid + ": " + nbOfRcvd + " Packet(s)");
                        }
                    }
                }
            }
        }
        return result;
    },

    /** Apply the verdict according to the result and the rules
     */
    ApplyVerdict: function (result, rules) {
        if (result === undefined)
            return false;

        var verdict = true;
        /// For each stream
        for (var stream in result) {
            TrafficGenerator.logInfo("****");
            TrafficGenerator.logInfo("Verifying verdict for " + stream);
            /// Get the rule for this stream
            var rule = rules[stream];
            if (rule == undefined)
                TrafficGenerator.logError("No rule for stream " + stream);
            else {
                /// For each check rule
                for (var r in rule) {
                    if (result[stream][r] == undefined) {
                        TrafficGenerator.logError("No statistics for rule " + stream + ":" + r);
                        verdict = false;
                    } else {
                        if ((result[stream][r] > (rule[r] + TrafficGenerator.toleranceInFrame)) || (result[stream][r] < (rule[r] - TrafficGenerator.toleranceInFrame))) {
                            verdict = false;
                            TrafficGenerator.logError("Filter " + r + " on Stream " + stream + " is expected to received " + rule[r] + " packet(s) and received " + result[stream][r] + " packet(s)");
                        } else {
                            if (result[stream][r] == rule[r]) {
                                TrafficGenerator.logInfo("Filter " + r + " has correctly received " + result[stream][r] + " packet(s)");
                            } else {
                                TrafficGenerator.logWarning("Filter " + r + " has received " + result[stream][r] + " packet(s), within the " + TrafficGenerator.toleranceInFrame + " frames tolerance of the target " + rule[r] + " frames");
                            }
                        }
                    }
                }
            }
        }
        return verdict;
    },

    /** Save the config file into filename
     */
    SaveConfigFile: function (filename, configFile) {
        saveFile(filename, configFile);
    },

    /** Generate an output config file from a template file and a replace table
     */
    GenerateCfgFileFromTemplate: function (infilename, outfilename, templateTable) {
        /// Read input file
        var Config = readFile(infilename).toLatin1String();
        if (Config == null) {
            TrafficGenerator.logError("Unable to read the configuation file " + infilename);
            return;
        }
        /// Foreach templateTable entry
        for (var i in templateTable) {
            var entry = templateTable[i];
            var replacement = TrafficGenerator.GetStringFromTemplateEntry(entry);
            TrafficGenerator.logInfo('Replacing ' + entry[0].replace('<', '').replace('>', '') + ' by ' + replacement);
            /// Replace all occurrence of entry with value
            var r = new RegExp(entry[0], "g")
                Config = Config.replace(r, replacement);
        }
        /// Write output file
        saveFile(outfilename, Config);
        return true;
    },

    /** Get number of packets from stats response
     */
    GetNbOfPacketFromStatsResp: function (resp) {
        /*var r = resp.trim();
        var word = new Array();
        /// Split the response into word
        word = r.split(' ');   */
        /// Return the 6th element of the response which contains the number of packet
        return resp.wordAt(5);
    },

    XenaIndexToNumber: function (text) {
        var matches = text.match("[0-9]+");
        return (matches != undefined && matches.length > 0) ? Number(matches[0]) : 0;
    },

    /** Read from Xena File and return an array of port
     */
    ReadStructureFromXenaFile: function (text) {
        var PortConfig = new Array();
        var portNb = undefined;
        var port = undefined;
        var portRe = new RegExp("(^[0-9]/[0-9]|;Port:    [0-9]/[0-9])");
        var nameRe = new RegExp('"', "g");
        /// Split the text file into line
        var lines = text.split("\n");
        for (var i in lines) {
            /// Is this a port definition
            if (portRe.test(lines[i])) {
                /// Add current port to port list
                portNb = (lines[i][0] == ';') ? Number(lines[i][12]) : Number(lines[i][2]);
                port = this.ports[portNb];
                if (port === undefined) {
                    TrafficGenerator.logWarning("Trying to get results from undefined port: #" + portNb);
                    continue;
                }
                PortConfig[portNb] = {};
                PortConfig[portNb].Name = "";
                PortConfig[portNb].Stream = new Array();
                PortConfig[portNb].Filter = new Array();
                /// Port config line
            } else {
                if (port == undefined)
                    continue;
                /// Read the command
                if (lines[i].indexOf("P_") != -1) {
                    /// Port command
                    if (lines[i].firstWord().toUpperCase() == "P_COMMENT") {
                        PortConfig[portNb].Name = lines[i].wordAt(1).replace(nameRe, '');
                    }

                } else if (lines[i].indexOf("PS_") != -1) {
                    /// Port Stream command
                    if (lines[i].firstWord().toUpperCase() == "PS_COMMENT") {
                        PortConfig[portNb].Stream[this.XenaIndexToNumber(lines[i].wordAt(1))] = {
                            Name: lines[i].wordAt(2).replace(nameRe, '')
                        };
                    } else if (lines[i].firstWord().toUpperCase() == "PS_TPLDID") {
                        PortConfig[portNb].Stream[this.XenaIndexToNumber(lines[i].wordAt(1))]["TID"] = Number(lines[i].wordAt(2));
                    }
                } else if (lines[i].indexOf("PF_") != -1) {
                    /// Port Filter command
                    if (lines[i].firstWord().toUpperCase() == "PF_COMMENT") {
                        PortConfig[portNb].Filter[this.XenaIndexToNumber(lines[i].wordAt(1))] = {
                            Name: lines[i].wordAt(2).replace(nameRe, '')
                        };
                    }
                }
            }
        }
        return PortConfig;
    },

    checkConnection: function () {
        if ((!this.socket) || (!this.socket.isConnected())) {
            this.Connect();
        }
        if (!this.socket || !this.socket.isConnected())
            TrafficGenerator.testFailed("checkConnection: Error the Xena is not connected");
    }

};
