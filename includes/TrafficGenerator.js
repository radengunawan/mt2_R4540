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

TrafficGenerator = {
    /// Default traffic generator driver
    driver: "STC",
    /// Activate the traffic generation automatisation if set to 1
    activateAutomatisation: 1,
    /// Nb of packet to send in automatisation
    nbOfPacketToSend: 100,
    /// Delay before sending the traffic
    delayBeforeTraffic: 10000,
    /// Delay before sending each traffic in automatic traffic generation (in ms)
    delayBeforeSend: 300,
    /// Delay after sending traffic -- to allow enough time for buffer to be empties, statistical computation,...
    delayAfterSend: 600,
    ///file path -- if defined, must be "\" terminated, and all '\' characters must be escaped properly
    filePath: "",
    ///tolerance used in verifying the verdict after sendTemplateConfigAndDoTest
    toleranceInFrame: 0,
    ///logging level:
    /// 0: normal logging level
    ///-1: info level are omitted
    ///-2: info & warning are omitted
    ///-3: info, warning & error are omitted
    ///-6: info, warning, error & test failure are omitted
    baseLogLevel: 0,
    ///default packet size
    packetSize: 1280,
    ///GEMTranslationMode: how to use GEM translation table.
    ///'ignore': ignore GEM translation rules
    ///'legacy' uses the old API: {streamName: [VID, Pbit, port]}
    ///'GEMOnly' {streamName: [{port, translationRule}]o, where translationRule is the same as the translationrul Object
    ///for addTranslationEthToGponExt2/addTranslationGponToEthExt2, but only uses GEM assignment rule
    ///'full' {streamName: [{port, translationRule}], where translationRule is the same as the translationrul Object
    ///for addTranslationEthToGponExt2/addTranslationGponToEthExt2
    GEMTranslationMode: 'legacy',
    /** Connect to the device,
     */
    Connect: function () {
        switch (this.driver) {
        case "STC":
            return STC.Connect();
        case "Xena":
            return Xena.Connect();
        case "PCAP":
            return PCAP.Connect();
        case "MT2EthTG":
            return MT2EthTG.Connect();
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Disconnect from the device
     */
    Disconnect: function () {
        switch (this.driver) {
        case "STC":
            return STC.Disconnect();
        case "Xena":
            return Xena.Disconnect();
        case "PCAP":
            return PCAP.Disconnect();
        case "MT2EthTG":
            return MT2EthTG.Disconnect();
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Start traffic on the specified port
     */
    StartTrafficOnPort: function (port, nbOfFrame) {
        switch (this.driver) {
        case "STC":
            return STC.StartTrafficOnPort(port, nbOfFrame);
        case "Xena":
            return Xena.StartTrafficOnPort(port, nbOfFrame);
        case "PCAP":
            return PCAP.StartTrafficOnPort(port, nbOfFrame);
        case "MT2EthTG":
            return MT2EthTG.StartTrafficOnPort(port, nbOfFrame);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Stop the traffic on the specified port
     */
    StopTrafficOnPort: function (port) {
        switch (this.driver) {
        case "STC":
            return STC.StopTrafficOnPort(port);
        case "Xena":
            return Xena.StopTrafficOnPort(port);
        case "PCAP":
            return PCAP.StopTrafficOnPort(port);
        case "MT2EthTG":
            return MT2EthTG.StopTrafficOnPort(port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Enable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    EnableStreamOnPort: function (streamIdx, port) {
        switch (this.driver) {
        case "STC":
            return STC.EnableStreamOnPort(streamIdx, port);
        case "Xena":
            return Xena.EnableStreamOnPort(streamIdx, port);
        case "PCAP":
            return PCAP.EnableStreamOnPort(streamIdx, port);
        case "MT2EthTG":
            return MT2EthTG.EnableStreamOnPort(streamIdx, port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Disable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    DisableStreamOnPort: function (streamIdx, port) {
        switch (this.driver) {
        case "STC":
            return STC.DisableStreamOnPort(streamIdx, port);
        case "Xena":
            return Xena.DisableStreamOnPort(streamIdx, port);
        case "PCAP":
            return PCAP.DisableStreamOnPort(streamIdx, port);
        case "MT2EthTG":
            return MT2EthTG.DisableStreamOnPort(streamIdx, port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Clear transmit statistics
     */
    ClearTransmitStatsOnPort: function (port) {
        switch (this.driver) {
        case "STC":
            return STC.ClearTransmitStatsOnPort(port);
        case "Xena":
            return Xena.ClearTransmitStatsOnPort(port);
        case "PCAP":
            return PCAP.ClearTransmitStatsOnPort(port);
        case "MT2EthTG":
            return MT2EthTG.ClearTransmitStatsOnPort(port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Retrieve total transmit statistics
     */
    GetTotalTransmitStatsOnPort: function (port) {
        switch (this.driver) {
        case "STC":
            return STC.GetTotalTransmitStatsOnPort(port);
        case "Xena":
            return Xena.GetTotalTransmitStatsOnPort(port);
        case "PCAP":
            return PCAP.GetTotalTransmitStatsOnPort(port);
        case "MT2EthTG":
            return MT2EthTG.GetTotalTransmitStatsOnPort(port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Retrieve transmit statistics on specific stream
     */
    GetTransmitStatsOnPortAndStream: function (port, stream) {
        switch (this.driver) {
        case "STC":
            return STC.GetTransmitStatsOnPortAndStream(port, stream);
        case "Xena":
            return Xena.GetTransmitStatsOnPortAndStream(port, stream);
        case "PCAP":
            return PCAP.GetTransmitStatsOnPortAndStream(port, stream);
        case "MT2EthTG":
            return MT2EthTG.GetTransmitStatsOnPortAndStream(port, stream);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Clear receive statistics
     */
    ClearReceiveStatsOnPort: function (port) {
        switch (this.driver) {
        case "STC":
            return STC.ClearReceiveStatsOnPort(port);
        case "Xena":
            return Xena.ClearReceiveStatsOnPort(port);
        case "PCAP":
            return PCAP.ClearReceiveStatsOnPort(port);
        case "MT2EthTG":
            return MT2EthTG.ClearReceiveStatsOnPort(port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Retrieve total receive statistics
     */
    GetTotalReceiveStatsOnPort: function (port) {
        switch (this.driver) {
        case "STC":
            return STC.GetTotalReceiveStatsOnPort(port);
        case "Xena":
            return Xena.GetTotalReceiveStatsOnPort(port);
        case "PCAP":
            return PCAP.GetTotalReceiveStatsOnPort(port);
        case "MT2EthTG":
            return MT2EthTG.GetTotalReceiveStatsOnPort(port);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Retrieve  receive on specific filter
     */
    GetReceivedStatsOnPortAndFilter: function (port, filter) {
        switch (this.driver) {
        case "STC":
            return STC.GetReceivedStatsOnPortAndFilter(port, filter);
        case "Xena":
            return Xena.GetReceivedStatsOnPortAndFilter(port, filter);
        case "PCAP":
            return PCAP.GetReceivedStatsOnPortAndFilter(port, filter);
        case "MT2EthTG":
            return MT2EthTG.GetReceivedStatsOnPortAndFilter(port, filter);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Retrieve  receive on specific TID
     */
    GetReceivedStatsOnPortAndTID: function (port, tid) {
        switch (this.driver) {
        case "STC":
            return STC.GetReceivedStatsOnPortAndTID(port, tid);
        case "Xena":
            return Xena.GetReceivedStatsOnPortAndTID(port, tid);
        case "PCAP":
            return PCAP.GetReceivedStatsOnPortAndTID(port, tid);
        case "MT2EthTG":
            return MT2EthTG.GetReceivedStatsOnPortAndTID(port, tid);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Set Bit rate for the specified stream
     */
    SetBitRateForStream: function (port, stream, rate) {
        switch (this.driver) {
        case "STC":
            return STC.SetBitRateForStream(port, stream, rate);
        case "Xena":
            return Xena.SetBitRateForStream(port, stream, rate);
        case "PCAP":
            return PCAP.SetBitRateForStream(port, stream, rate);
        case "MT2EthTG":
            return MT2EthTG.SetBitRateForStream(port, stream, rate);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Set Bit rate for the specified stream
     */
    SetPacketPerSecForStream: function (port, stream, rate) {
        switch (this.driver) {
        case "STC":
            return STC.SetPacketPerSecForStream(port, stream, rate);
        case "Xena":
            return Xena.SetPacketPerSecForStream(port, stream, rate);
        case "PCAP":
            return PCAP.SetPacketPerSecForStream(port, stream, rate);
        case "MT2EthTG":
            return MT2EthTG.SetPacketPerSecForStream(port, stream, rate);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    IsRepeatModifierSupported: function () {
        switch (this.driver) {
        case "STC":
            return STC.IsRepeatModifierSupported();
        case "Xena":
            return Xena.IsRepeatModifierSupported();
        case "PCAP":
            return PCAP.IsRepeatModifierSupported();
        case "MT2EthTG":
            return MT2EthTG.IsRepeatModifierSupported();
        }
        this.logError("No traffic generator driver defined");
        return false;
    },

    IsPortSpeedSettingSupported: function () {
        switch (this.driver) {
        case "STC":
            return STC.IsPortSpeedSettingSupported();
        case "Xena":
            return Xena.IsPortSpeedSettingSupported();
        case "PCAP":
            return PCAP.IsPortSpeedSettingSupported();
        case "MT2EthTG":
            return MT2EthTG.IsPortSpeedSettingSupported();
        }
        this.logError("No traffic generator driver defined");
        return false;
    },

    SetPortSpeed: function (port, speed) {
        switch (this.driver) {
        case "STC":
            return STC.SetPortSpeed(port, speed);
        case "Xena":
            return Xena.SetPortSpeed(port, speed);
        case "PCAP":
            return PCAP.SetPortSpeed(port, speed);
        case "MT2EthTG":
            return MT2EthTG.SetPortSpeed(port, speed);
        }
        this.logError("No traffic generator driver defined");
        return false;
    },

    /** Set the repeat for the modifier of the stream
     */
    SetRepeatModifierForStream: function (port, stream, mod, pos, mask, method, nb) {
        switch (this.driver) {
        case "STC":
            return STC.SetRepeatModifierForStream(port, stream, mod, pos, mask, method, nb);
        case "Xena":
            return Xena.SetRepeatModifierForStream(port, stream, mod, pos, mask, method, nb);
        case "PCAP":
            return PCAP.SetRepeatModifierForStream(port, stream, pos, mod, mask, method, nb);
        case "MT2EthTG":
            return MT2EthTG.SetRepeatModifierForStream(port, stream, pos, mod, mask, method, nb);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Set the packet limit for the stream
     */
    SetPacketLimitForStream: function (port, stream, nb) {
        switch (this.driver) {
        case "STC":
            return STC.SetPacketLimitForStream(port, stream, nb);
        case "Xena":
            return Xena.SetPacketLimitForStream(port, stream, nb);
        case "PCAP":
            return PCAP.SetPacketLimitForStream(port, stream, nb);
        case "MT2EthTG":
            return MT2EthTG.SetPacketLimitForStream(port, stream, nb);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Send a frame on the port
     */
    SendFrameOnPort: function (port, frame, nb) {
        switch (this.driver) {
        case "STC":
            return STC.SendFrameOnPort(port, frame, nb);
        case "Xena":
            return Xena.SendFrameOnPort(port, frame, nb);
        case "PCAP":
            return PCAP.SendFrameOnPort(port, frame, nb);
        case "MT2EthTG":
            return MT2EthTG.SendFrameOnPort(port, frame, nb);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    htonl: function (n) {
        var input = parseInt(n);
        rV = (input & 0x000000FF) << 24;
        rV += (input & 0x0000FF00) << 8;
        rV += (input & 0x00FF0000) >> 8;
        rV += (input & 0xFF000000) >> 24;
        return rV;
    },

    /** Send a PCAP file on the port
     */
    SendPcapFileOnPort: function (port, pcapFilename) {
        var pcap = readFile(pcapFilename);
        if (pcap.length == 0)
            this.testFailed('Unable to read PCAP file "' + pcapFilename + '"');
        /// Read PCAP packet header
        var swapped = false;
        var magicNumber = pcap[0].hex(2, 0) + pcap[1].hex(2, 0) + pcap[2].hex(2, 0) + pcap[3].hex(2, 0);
        if (magicNumber.toLowerCase() == "d4c3b2a1") {
            swapped = true;
        }
        var idx = 4 + 2 + 2 + 4 + 4 + 4 + 4; //passed global header
        var numPackets = 0;
        var totalBytes = 0;
        while ((idx + 16) < pcap.length) {
            idx += 8; //points to incl_len
            var incl_len = 0;
            if (swapped) {
                var incl_len = parseInt(pcap[idx + 3].hex(2, 0) + pcap[idx + 2].hex(2, 0) + pcap[idx + 1].hex(2, 0) + pcap[idx].hex(2, 0), 16);
            } else {
                var incl_len = parseInt(pcap[idx].hex(2, 0) + pcap[idx + 1].hex(2, 0) + pcap[idx + 2].hex(2, 0) + pcap[idx + 3].hex(2, 0), 16);
            }
            var frame = new Array();
            idx += 8; //points to the data
            for (var i = 0;
                (i < incl_len) && (idx + i < pcap.length); ++i) {
                frame[i] = pcap[i + idx];
            }
            ///If the frame is too short, fill it up.
            for (var j = i; j < 64; j++) {
                frame.push(0);
            }
            this.SendFrameOnPort(port, frame, 1);
            totalBytes += frame.length;
            numPackets++;
            idx += i;
        }
        this.logInfo("sent " + numPackets + " packets (" + totalBytes + " bytes) on port " + port);
    },

    /** Load a configuration file
     */
    LoadConfigFile: function (filename) {
        switch (this.driver) {
        case "STC":
            return STC.LoadConfigFile(filename);
        case "Xena":
            return Xena.LoadConfigFile(filename);
        case "PCAP":
            return PCAP.LoadConfigFile(filename);
        case "MT2EthTG":
            return MT2EthTG.LoadConfigFile(filename);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Send a Xena configuration file
     */
    SendConfig: function (cfg) {
        switch (this.driver) {
        case "STC":
            return STC.SendConfig(cfg);
        case "Xena":
            return Xena.SendConfig(cfg);
        case "PCAP":
            return PCAP.SendConfig(cfg);
        case "MT2EthTG":
            return MT2EthTG.SendConfig(cfg);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Send a template configuration (replace all template with associated value according to the replace table)
     */
    SendTemplateConfig: function (templateFile, templateTable) {
        switch (this.driver) {
        case "STC":
            return STC.SendTemplateConfig(templateFile, templateTable);
        case "Xena":
            return Xena.SendTemplateConfig(templateFile, templateTable);
        case "PCAP":
            return PCAP.SendTemplateConfig(templateFile, templateTable);
        case "MT2EthTG":
            return MT2EthTG.SendTemplateConfig(templateFile, templateTable);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Send a template configuration (replace all template with associated value according to the replace table) and start generation automatically
     */
    SendTemplateConfigAndDoTest: function (templateFile, templateTable, gemTable) {
        switch (this.driver) {
        case "STC":
            return STC.SendTemplateConfigAndDoTest(templateFile, templateTable, gemTable);
        case "Xena":
            return Xena.SendTemplateConfigAndDoTest(templateFile, templateTable, gemTable);
        case "PCAP":
            return PCAP.SendTemplateConfigAndDoTest(templateFile, templateTable, gemTable);
        case "MT2EthTG":
            return MT2EthTG.SendTemplateConfigAndDoTest(templateFile, templateTable, gemTable);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    /** Apply the verdict according to the result and the rules
     */
    ApplyVerdict: function (result, rules) {
        switch (this.driver) {
        case "STC":
            return STC.ApplyVerdict(result, rules);
        case "Xena":
            return Xena.ApplyVerdict(result, rules);
        case "PCAP":
            return PCAP.ApplyVerdict(result, rules);
        case "MT2EthTG":
            return MT2EthTG.ApplyVerdict(result, rules);
        }
        this.logError("No traffic generator driver defined");
        return undefined;
    },

    GetStringFromTemplateEntry: function (entry) {
        var replacement = "";
        if (entry[3] == 10)
            replacement = Number(entry[1]); //base 10
        if (Array.isArray(entry[1])) {
            replacement = ArrayToHex(entry[1]);
        } else if ((typeof(entry[1]) == "object") && (entry[1].valueAsArray != undefined)) {
            replacement = ArrayToHex(entry[1].valueAsArray);
        } else {
            if (entry[3] == 10)
                replacement = Number(entry[1]); //base 10
            else
                replacement = entry[1].hex(entry[2], 0);
        }
        return replacement;
    },

    log: function (level, str) {
        if (level == 0)
            logInfo(str);
        else if (level == 1)
            logWarning(str);
        else if (level == 2)
            logError(str);
        else if (level > 2)
            testFailed(str);
    },

    logInfo: function (str) {
        this.log(this.baseLogLevel, str);
    },

    logWarning: function (str) {
        this.log(this.baseLogLevel + 1, str);
    },

    logError: function (str) {
        this.log(this.baseLogLevel + 2, str);
    },

    testFailed: function (str) {
        ///+6 allows to eliminate all logs from TrafficGenerator, and keep the failure, by setting baseLogLevel to -3
        this.log(this.baseLogLevel + 6, str);
    },

    fetchEtherTypeFromXTCConfigLines: function (lines, startIdx) {
        for (; startIdx < lines.length; startIdx++) {
            var line = lines[startIdx];
            var params = line.split(/(\s+)/); /// split by space
            if (params[0] == "PS_PACKETHEADER") {
                return parseInt(params[4].substring(params[4].length - 4, params[4].length), 16);
            }
        }
    },

    fetchFrameLengthFromXTCConfigLines: function (lines, startIdx) {
        for (; startIdx < lines.length; startIdx++) {
            var line = lines[startIdx];
            var params = line.split(/(\s+)/); /// split by space
            if (params[0] == "PS_PACKETLENGTH")
                return parseInt(params[6]); ///only care for fixed for now
        }
    },

    isXTCFilterForPayload: function (lines, startIdx) {
        for (; startIdx < lines.length; startIdx++) {
            var line = lines[startIdx];
            var params = line.split(/(\s+)/); /// split by space
            if (params[0] == "PM_MATCH") {
                var RegNonZero = new RegExp("[^0]");
                if (params[6].substring(2, params[6].length).search(RegNonZero) >= 0) { ///If there is anything non-zero to expect, consider it is not payload, as payload is set to 0 in tests
                    return false;
                }
                return true;
            }
        }
        return true;
    },

    addIPLayerToXTC: function (Config, IPCfg) {
        var reNewLine = new RegExp("\r\n|\n\r|\n|\r", "g");
        var lines = Config.split(reNewLine);

        var portNb = -1;
        var nameRe = new RegExp('"', "g");

        var testCase = {};
        var MACToIPArray = [];
        for (var port in IPCfg.ports) {
            MACToIPArray[port] = [];
        }

        for (var i in lines) {
            var line = lines[i];
            /// Modify the config to set the module/port correctly
            var re = new RegExp(";Port:    [0-9]/[0-9]", "g");

            if (re.test(line)) {
                portNb = Number(line[12]);
                testCase[portNb] = {};
            } else {
                if (line[0] == ';')
                    continue; ///ignore comments...
                var params = line.split(/(\s+)/); /// split by space
                var index = 0;

                if (params.length < 3)
                    continue;
                if (params[2][0] == '[') ///index
                {
                    index = parseInt(params[2].substring(1, params[2].length - 1));
                    if (params[0].substring(0, 2) == 'PS') {
                        if (testCase[portNb].streams == undefined) {
                            testCase[portNb].streams = [];
                        }
                        if (testCase[portNb].streams[index] == undefined) {
                            testCase[portNb].streams[index] = {};
                        }
                    }
                    if (params[0].substring(0, 2) == 'PM') {
                        if (testCase[portNb].PMs == undefined) {
                            testCase[portNb].PMs = [];
                        }
                        if (testCase[portNb].PMs[index] == undefined) {
                            testCase[portNb].PMs[index] = {};
                        }
                    }
                    if (params[0].substring(0, 2) == 'PF') {
                        continue;
                    }
                }
                switch (params[0]) {
                case "PS_COMMENT":
                    ///used for logging
                    testCase[portNb].streams[index].name = line.wordAt(2).replace(nameRe, '');
                    break;

                case "PS_HEADERPROTOCOL": {
                        var lastHeaderId = params[params.length - 1];

                        if ((lastHeaderId == "ETHERNET") || (lastHeaderId == "VLAN")) {
                            ///add IP information if ethertype is IP
                            if (testCase[portNb].streams[index].etherType == undefined) {
                                testCase[portNb].streams[index].etherType = this.fetchEtherTypeFromXTCConfigLines(lines, parseInt(i) + 1);
                            }
                            if (testCase[portNb].streams[index].etherType == 0x0800) {
                                lines[i] += " IP";

                                logInfo("Adding IP header to stream " + testCase[portNb].streams[index].name);
                            }
                        }
                    }
                    break;

                case "PS_PACKETHEADER": {
                        testCase[portNb].streams[index].etherType = parseInt(params[4].substring(params[4].length - 4, params[4].length), 16);
                        if (testCase[portNb].streams[index].etherType == 0x0800) {
                            ///Compute IP destination
                            var MACDST = params[4].substring(2, 2 + 12);
                            var oppositePort = (portNb == 0) ? 1 : 0;
                            var IPDST = IPv4Address(IPv4Address(IPCfg.ports[oppositePort].base).ToInt() + Object.keys(MACToIPArray[oppositePort]).length);
                            if (MACToIPArray[oppositePort][MACDST] != undefined) {
                                ///reuse existing mapping
                                IPDST = MACToIPArray[oppositePort][MACDST];
                            }
                            MACToIPArray[oppositePort][MACDST] = IPDST;

                            ///Compute IP src
                            var MACSRC = params[4].substring(2 + 12, 2 + 12 + 12);
                            var IPSRC = IPv4Address(IPv4Address(IPCfg.ports[portNb].base).ToInt() + Object.keys(MACToIPArray[portNb]).length);
                            if (MACToIPArray[portNb][MACSRC] != undefined) {
                                ///reuse existing mapping
                                IPSRC = MACToIPArray[portNb][MACSRC];
                            }
                            MACToIPArray[portNb][MACSRC] = IPSRC;

                            if (testCase[portNb].streams[index].frameLength == undefined) {
                                testCase[portNb].streams[index].frameLength = this.fetchFrameLengthFromXTCConfigLines(lines, parseInt(i) + 1);
                            }
                            var IPLength = testCase[portNb].streams[index].frameLength - ((params[4].length / 2) + 4 /* FCS */);

                            var IPHeader = new ByteArray(IP.Build_PacketHeader(IPDST, IPSRC, IPCfg.protocol, IPLength - 20));

                            ///Add IP header
                            params[4] = params[4] + IPHeader.toHexString();

                            lines[i] = params.join("");
                        }
                    }
                    break;

                case "PM_MATCH":
                    ///Needs to modify the matching criteria is it overlaps with IP
                    {
                        testCase[portNb].PMs[index].isPayload = true;
                        var startOfIP = params[6].indexOf('0800'); ///relies on the dubious hypothesis that 0800 appears only as ethertype in filter
                        if (startOfIP >= 0) {
                            testCase[portNb].PMs[index].isPayload = false;
                            var payloadAfterIP = params[6].substring(startOfIP + 4, params[6].length);
                            var RegNonZero = new RegExp("[^0]");
                            if (payloadAfterIP.search(RegNonZero) < 0) {
                                params[4] = params[4].substring(0, startOfIP + 4);
                                for (var column = startOfIP + 4; column < 18; column++) {
                                    params[4] += '0'
                                }
                                lines[i] = params.join("");
                                logWarning("Removing IP header from matching criteria " + index + " on port " + portNb);
                            }
                        } else if ((params[6].indexOf('88A8') >= 0) || (params[6].indexOf('8100') >= 0)) {
                            testCase[portNb].PMs[index].isPayload = false;
                        }
                    }
                    break;

                case "PM_POSITION": {
                        var position = parseInt(params[4]);
                        if ((position >= 14) && (position < 38)) { ///heuristic -- would need a close analysis of filters to do better
                            logInfo("position for index " + index);
                            if (testCase[portNb].PMs[index].isPayload == undefined) {
                                logInfo("Looking for payload");
                                testCase[portNb].PMs[index].isPayload = this.isXTCFilterForPayload(lines, parseInt(i) + 1);
                            }
                            if (testCase[portNb].PMs[index].isPayload) {
                                logWarning("shifting position for matching criteria " + index + " on port " + portNb);
                                position += 20; ///skip IP header
                                params[4] = position;
                                lines[i] = params.join("");
                            }
                        }
                    }
                    break;

                case "PS_PACKETLENGTH":
                    testCase[portNb].streams[index].frameLength = parseInt(params[6]); ///only care for fixed for now
                    break;

                default:
                    break;
                }
            }
        }

        var finalConfig = "";
        for (var i in lines) {
            var line = lines[i];
            finalConfig += line + "\n";
        }

        return finalConfig;
    },

    /** Load a XTC configuration file
     */
    LoadXTCFile: function (filename, templateTable, IPCfg) {
        var Config = readFile(filename + ".xtc").toLatin1String();
        if (Config == null || Config.length == 0) {
            TrafficGenerator.logError("Unable to read the configuration file " + filename);
            return;
        }
        TrafficGenerator.logInfo("Generating final Config File from Template");
        /// Foreach templateTable entry
        for (var i in templateTable) {
            var entry = templateTable[i];
            var replacement = TrafficGenerator.GetStringFromTemplateEntry(entry);
            TrafficGenerator.logInfo('Replacing ' + entry[0].replace('<', '').replace('>', '') + ' by ' + replacement);
            /// Replace all occurrence of entry with value
            var r = new RegExp(entry[0], "g");
            Config = Config.replace(r, replacement);
        }
        if (IPCfg !== undefined)
            Config = this.addIPLayerToXTC(Config, IPCfg);

        return Config;
    },

    applyGEMTranslationRulesUpstream: function (streamName, GEMTable) {
        var foundRule = false;
        if (GEMTable[streamName] != undefined) {
            if (this.GEMTranslationMode == 'legacy') {
                TrafficGenerator.logInfo("Translation rule for PON to Ethernet is: GEMPort " + GEMTable[streamName][3] + " -> Ethernet");
                addTranslationGponToEth(GEMTable[streamName][3]);
            } else {
                for (var rule in GEMTable[streamName]) {
                    var finalRule = {
                        port: GEMTable[streamName][rule].port,
                        translationRule: {}
                    };
                    if (this.GEMTranslationMode == 'full') {
                        finalRule = GEMTable[streamName][rule];
                        if (finalRule.translationRule === undefined)
                            finalRule.translationRule = {};
                    }
                    TrafficGenerator.logInfo("Translation rule for PON to Ethernet is: " + JSON.stringify(finalRule));
                    addTranslationGponToEthExt2(finalRule.translationRule, finalRule.port);
                }
            }
            foundRule = true;
        } else
            logWarning("No PON to Ethernet Rule found for stream " + sreamName);

        return foundRule;
    },

    applyGEMTranslationRulesDownstream: function (streamName, GEMTable) {
        var foundRule = false;
        if (GEMTable[streamName] != undefined) {
            if (this.GEMTranslationMode == 'legacy') {
                TrafficGenerator.logInfo("Translation rule for Ethernet to PON is: VID " + GEMTable[streamName][0] + (GEMTable[streamName][1] == 0xff ? "" : (" PBits " + GEMTable[streamName][1])) + " -> GEMPort " + GEMTable[streamName][2]);
                addTranslationEthToGpon(GEMTable[streamName][0], GEMTable[streamName][1], GEMTable[streamName][2]);
            } else {
                for (var rule in GEMTable[streamName]) {
                    var finalRule = {
                        port: GEMTable[streamName][rule].port,
                        translationRule: {}
                    };
                    if (this.GEMTranslationMode == 'full') {
                        finalRule = GEMTable[streamName][rule];
                        if (finalRule.translationRule === undefined)
                            finalRule.translationRule = {};
                    }
                    TrafficGenerator.logInfo("Translation rule for Ethernet to PON is: " + JSON.stringify(finalRule));
                    addTranslationEthToGponExt2(finalRule.translationRule, finalRule.port);
                }
            }
            foundRule = true;
        } else
            logWarning("No Ethernet to PON Rule found for stream " + sreamName);

        return foundRule;
    },

    ApplyGEMTranslationRules: function (portIndex, streamName, GEMTable) {
        if (this.GEMTranslationMode == 'ignore')
            return false;

        if (portIndex == 0)
            return this.applyGEMTranslationRulesDownstream(streamName, GEMTable);
        else
            return this.applyGEMTranslationRulesUpstream(streamName, GEMTable);
    },

    ///function test whether downstream flows are forwarded or not -rxCriteria is an array of boolean (true: must be received)
    ///flows and filters must be in the same order -- flows start at 1, filters at 0
    TestDownstreamFlows: function (rxCriteria) {
        var verdict = true;

        sleep(this.delayBeforeSend);

        TrafficGenerator.StopTrafficOnPort(0);
        sleep(100);
        TrafficGenerator.ClearReceiveStatsOnPort(1);
        TrafficGenerator.ClearTransmitStatsOnPort(0);
        ///flows start at 1
        for (var i = 1; i <= rxCriteria.length; i++) {
            TrafficGenerator.EnableStreamOnPort(i, 0);
        }

        this.logInfo("starting all downstream flows");
        TrafficGenerator.StartTrafficOnPort(0);

        sleep(2000);

        TrafficGenerator.StopTrafficOnPort(0);

        sleep(TrafficGenerator.delayAfterSend);

        var totalTx = TrafficGenerator.GetTotalTransmitStatsOnPort(0);
        this.logInfo("sent " + totalTx + " frames on port 0");

        var totalRx = TrafficGenerator.GetTotalReceiveStatsOnPort(1);
        this.logInfo("received " + totalRx + " frames on port 1");

        ///filters start at 0 -- note that this is arbitrary (legacy)
        for (var i = 0; i < rxCriteria.length; i++) {
            var rcvd = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, i);
            var sent = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, (i + 1));
            this.logInfo("received " + rcvd + " packets at U interface for flow " + (i + 1) + " (sent: " + sent + ")");

            if (rxCriteria[i]) {
                if (rcvd != sent)
                    logWarning("Rx & Tx counter do not match");
                if (rcvd == 0) {
                    this.logError("Flow " + (i + 1) + " not received at the U interface");
                    verdict = false;
                }
            }
            if ((!rxCriteria[i]) && (rcvd != 0)) {
                this.logError("Flow " + (i + 1) + " received at the U interface");
                verdict = false;
            }
        }
        return verdict;
    },

    ///function to test a single flow from an array of flows
    // txPort: the port used to send the flow
    // rxPort: the port to received the flow
    // flowIndex: flow index. Flow index start at 1
    // nbOfFrames: number of frames to send
    // flows: flow array
    // filterIndex: filter to check Rx statistics. Start at 0
    // discard: optional. Whether the flow is supposed to be discarded. Default is false
    // noRxChecks: optional if set to true, Rx is not checked. Default is false (no check)
    ///flows and filters must be in the same order -- flows start at 1, filters at 0
    TestSingleFlow: function (txPort, rxPort, flowIndex, nbOfFrames, flows, filterIndex, discard, noRxChecks) {
        var verdict = true;

        sleep(this.delayBeforeSend);

        TrafficGenerator.StopTrafficOnPort(txPort);
        sleep(100);
        TrafficGenerator.ClearReceiveStatsOnPort(rxPort);

        this.logInfo("sending " + nbOfFrames + " frames for " + flows[flowIndex - 1].name);
        if (UtilsParameters.IGMPRandomisation) {
            TrafficGenerator.SendFrameOnPort(txPort, flows[flowIndex - 1].frame, nbOfFrames);
        } else {
            ///flows start at 1
            for (var i = 1; i <= flows.length; i++) {
                if (i == flowIndex)
                    TrafficGenerator.EnableStreamOnPort(i, txPort);
                else
                    TrafficGenerator.DisableStreamOnPort(i, txPort);
            }
            TrafficGenerator.StartTrafficOnPort(txPort, nbOfFrames);
        }
        sleep(2000);
        TrafficGenerator.StopTrafficOnPort(txPort);

        sleep(TrafficGenerator.delayAfterSend);

        var totalRx = TrafficGenerator.GetTotalReceiveStatsOnPort(rxPort);
        this.logInfo("received " + totalRx + " frames on port " + rxPort);

        if (!noRxChecks) {
            if (filterIndex != undefined) {
                var RcvdFrames = TrafficGenerator.GetReceivedStatsOnPortAndFilter(rxPort, filterIndex);
                if (discard) {
                    if (RcvdFrames == 0) {
                        this.logInfo(flows[flowIndex - 1].name + " properly discarded by ONU");
                    } else {
                        verdict = false;
                        this.logError(RcvdFrames + " frames from " + flows[flowIndex - 1].name + " received at S/R interface when they should be discarded");
                    }
                } else {
                    if (RcvdFrames == 0) {
                        verdict = false;
                        this.logError("No " + flows[flowIndex - 1].name + " received on port" + rxPort);
                    } else {
                        this.logInfo(RcvdFrames + " frames from " + flows[flowIndex - 1].name + " received on port" + rxPort);
                    }
                }
            }
        }
        return verdict;
    },

    ///function to test a single upstream flow from an array of flows
    // flowIndex: flow index. Flow index start at 1
    // nbOfFrames: number of frames to send
    // flows: flow array
    // filterIndex: filter to check Rx statistics. Start at 0
    // discard: optional. Whether the flow is supposed to be discarded. Default is false
    // noRxChecks: optional if set to true, Rx is not checked. Default is false (no check)
    ///flows and filters must be in the same order -- flows start at 1, filters at 0
    TestSingleUpstreamFlow: function (flowIndex, nbOfFrames, flows, filterIndex, discard, noRxChecks) {
        return this.TestSingleFlow(1, 0, flowIndex, nbOfFrames, flows, filterIndex, discard, noRxChecks);
    },

    ///function to test a single downstream flow from an array of flows
    // flowIndex: flow index. Flow index start at 1
    // nbOfFrames: number of frames to send
    // flows: flow array
    // filterIndex: filter to check Rx statistics. Start at 0
    // discard: optional. Whether the flow is supposed to be discarded. Default is false
    // noRxChecks: optional if set to true, Rx is not checked. Default is false (no check)
    ///flows and filters must be in the same order -- flows start at 1, filters at 0

    TestSingleDownstreamFlow: function (flowIndex, nbOfFrames, flows, filterIndex, discard, noRxChecks) {
        return this.TestSingleFlow(0, 1, flowIndex, nbOfFrames, flows, filterIndex, discard, noRxChecks);
    },

    TestDownstreamPriorities: function (flowStates, config) {
        var useRepeatModifier = config.useRepeatModifier && this.IsRepeatModifierSupported();
        var loseTolerance = config.loseTolerance;
        var loseTolerance_100 = loseTolerance * 100;
        var remainTolerance = config.remainTolerance;
        var remainTolerance_100 = remainTolerance * 100;
        var transitionPhaseLength = config.transitionPhaseLength;
        var testPhaseLength = config.testPhaseLength;
        if (useRepeatModifier) {
            logInfo("Using Repeat Modifier");
            var startPacketOffset = (1 << config.packetOffset2Exponent)
            if (useRepeatModifier)
                startPacketOffset &= 0x0000FFFF;
            var transitionPhaseLength = Math.ceil((startPacketOffset / flowStates[0].bitRatePPS) * 1000);

            var maxPackets = (1 << config.maxPackets2Exponent);
            if (useRepeatModifier)
                maxPackets &= 0x0000FFFF;
            if (useRepeatModifier)
                logInfo("FIRST packet in the traffic analysis #" + startPacketOffset);

            var testPhaseLength = Math.ceil((maxPackets / flowStates[0].bitRatePPS) * 1000);

            var nbOfPacketToSendInTheAnalysisPeriod = maxPackets - startPacketOffset; /// COMPUTATION of the number of packet in the traffic analysis
            if (useRepeatModifier)
                logInfo("# packets in the traffic analysis period: " + nbOfPacketToSendInTheAnalysisPeriod);

            ///Used only for modifier
            var maxPacketsMask = (0x0000FFFF << config.maxPackets2Exponent) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the LAST packet in the traffic analysis period
            var packetOffsetMask = ((0x0000FFFF << config.packetOffset2Exponent) & (~maxPacketsMask)) & 0x0000FFFF; /// COMPUTATION of the mask corresponding of the FIRST packet in the traffic analysis, taking into account the mask of the LAST packet in the traffic analysis.


            testPhaseLength += transitionPhaseLength; ///end transition
        }
        logInfo("Transition phase length: " + transitionPhaseLength + " msec");
        logInfo("Testing phase length: " + testPhaseLength + " msec");
        logInfo("Packet Loss Tolerance: " + loseTolerance_100.toFixed(2));
        logInfo("Packet Transmit Tolerance: " + remainTolerance_100.toFixed(2))

        var portSpeed = config.portSpeedMbps;
        var firstStep = config.firstStep;
        var lastStep = config.lastStep;

        /// Enable all streams
        for (var i = 0; i < flowStates.length; i++) {
            TrafficGenerator.EnableStreamOnPort(flowStates[i].flowIndex, 0);
        }

        var Repeat = 1;
        var finish = false;
        var verdict = true;
        var step = firstStep;
        while (!finish) {
            verdict = true;
            logInfo("##########################");
            logInfo("##########################");
            testPassed("Running step " + step);

            /// Clear all stats
            TrafficGenerator.ClearTransmitStatsOnPort(0);
            TrafficGenerator.ClearTransmitStatsOnPort(1);
            TrafficGenerator.ClearReceiveStatsOnPort(0);
            TrafficGenerator.ClearReceiveStatsOnPort(1);
            /// Set pps for each stream
            var totalBitRate = 0;
            for (var i = 0; i < flowStates.length; i++) {
                logInfo("Flow " + flowStates[i].name + " bitRate: " + flowStates[i].bitRatePPS + " PPS");
                TrafficGenerator.SetPacketPerSecForStream(0, flowStates[i].flowIndex, flowStates[i].bitRatePPS);
                totalBitRate += flowStates[i].bitRatePPS;
                if (flowStates[i].priority < 0)
                    logInfo("    status: must be dicarded (Pass/Fail)");
                else if (flowStates[i].priority == 0)
                    logInfo("    status: must be discarded (trigger next step)");
                else if (flowStates[i].priority == 1)
                    logInfo("    status: must be partially forwarded at transition");
                else
                    logInfo("    status: must be forwarded");
                if (useRepeatModifier) {
                    if (flowStates[i].bitRateIncrementPPS > 0) {
                        ///This assume that all > 0 bitRateIncrementPPS are equal
                        logInfo("Repeat Modifier for Flow " + flowStates[i].name + ": " + Repeat);
                        TrafficGenerator.SetRepeatModifierForStream(0, flowStates[i].flowIndex, 0, config.modifierPos, 'FFFF0000', 'DEC', Repeat);
                    }
                }
            }

            totalBitRate = (totalBitRate * this.packetSize * 8) / (1000 * 1000);
            logInfo("Cumulated Input BitRate: " + totalBitRate.toFixed(2) + "Mbps");
            var moveToNextStep = (totalBitRate >= portSpeed); ///Note:for ONU with large buffer, increasing this limit may be faster than increasing the overall test length
            var atLeastOneTriggerFlowIsDiscarded = false;

            sleep(TrafficGenerator.delayBeforeTraffic);

            /// Start sending the stream
            TrafficGenerator.StartTrafficOnPort(0);

            ///Transition checks
            if (totalBitRate >= portSpeed) {
                if (useRepeatModifier) {
                    sleep(transitionPhaseLength); ///filtering & modified logic takes care of the transition measurements
                } else {
                    var transitionSleepTime = transitionPhaseLength / 4;
                    sleep(transitionSleepTime * 3);
                    ///Performs a measurement in the middle of the transition time for flows which must be discarded
                    for (var i = 0; i < flowStates.length; i++) {
                        if (flowStates[i].priority <= 0) {
                            flowStates[i].Rx = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, flowStates[i].TID);
                        }
                    }
                    sleep(transitionSleepTime);
                    atLeastOneTriggerFlowIsDiscarded = false;
                    for (var i = 0; i < flowStates.length; i++) {
                        if (flowStates[i].priority <= 0) {
                            var txCount = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, i);
                            var rxCount = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, (i + 1));
                            var rxIncrement = (rxCount - flowStates[i].Rx);
                            logInfo("Checking flow " + flowStates[i].name + " marked as discard after transition phase, Rx increment=" + (rxCount - flowStates[i].Rx) + " (" + ((rxIncrement / txCount) * 100).toFixed(2) + "%)");
                            if ((rxIncrement / txCount) > remainTolerance) {
                                if (flowStates[i].priority == 0) {
                                    moveToNextStep = false;
                                    logInfo("At step, " + step + " flow " + flowStates[i].name + " must be discarded and traffic is still going through after " + transitionPhaseLength + " msecs transition phase: keep increasing bitrate");
                                } else {
                                    finish = true;
                                    verdict = false;
                                    logError("At step, " + step + " flow " + flowStates[i].name + " must be discarded and traffic is still going through after " + transitionPhaseLength + " msecs transition phase ");
                                }
                            } else {
                                if (flowStates[i].priority == 0)
                                    atLeastOneTriggerFlowIsDiscarded = true;
                            }
                        }
                    }
                }
            }

            /// Wait for traffic
            sleep(testPhaseLength);

            ///Performs measurements during the analysis period to avoid fall-down phase
            for (var i = 0; i < flowStates.length; i++) {
                if (useRepeatModifier) {
                    var txInAnalysisPeriod = nbOfPacketToSendInTheAnalysisPeriod *
                        (flowStates[i].bitRatePPS /
                            (flowStates[i].bitRatePPS - ((Repeat - 1) * flowStates[i].bitRateIncrementPPS)));
                    flowStates[i].RxInAnalisisPeriod = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, flowStates[i].filterIndex);
                    flowStates[i].ratioInAnalisisPeriod = 100. * (flowStates[i].RxInAnalisisPeriod / txInAnalysisPeriod);
                    logInfo("In Analysis period, Flow " + flowStates[i].name + ": Tx= " + txInAnalysisPeriod + " packets / Rx= " + flowStates[i].RxInAnalisisPeriod + " packets / ratio= " + flowStates[i].ratioInAnalisisPeriod.toFixed(2));
                    if (flowStates[i].priority <= 0) {
                        if (flowStates[i].ratioInAnalisisPeriod > remainTolerance_100) {
                            if (flowStates[i].priority == 0) {
                                moveToNextStep = false;
                                logInfo("At step, " + step + " flow " + flowStates[i].name + " must be discarded and traffic is still going through after " + transitionPhaseLength + " msecs transition phase: keep increasing bitrate");
                            } else {
                                finish = true;
                                verdict = false;
                                logError("At step, " + step + " flow " + flowStates[i].name + " must be discarded and traffic is still going through after " + transitionPhaseLength + " msecs transition phase ");
                            }
                        } else {
                            if (flowStates[i].priority == 0)
                                atLeastOneTriggerFlowIsDiscarded = true;
                        }
                    }
                } else {
                    if ((flowStates[i].priority <= 0) && (moveToNextStep || ((flowStates[i].priority < 0)))) {
                        var txCount = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, i);
                        var rxCount = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, (i + 1));
                        var rxIncrement = (rxCount - flowStates[i].Rx);
                        logInfo("Checking flow " + flowStates[i].name + " marked as discard, Rx increment after testing phase=" + (rxCount - flowStates[i].Rx) + " (" + ((rxIncrement / txCount) * 100).toFixed(2) + "%)");
                        if ((rxIncrement / txCount) > remainTolerance) {
                            finish = true;
                            verdict = false;
                            logError("At step, " + step + " flow " + flowStates[i].name + " must be discarded and traffic is still going through after " + transitionPhaseLength + " msecs transition phase ");
                        }
                    }
                }
            }

            TrafficGenerator.StopTrafficOnPort(0);

            sleep(TrafficGenerator.delayAfterSend);

            /// Final Statistics

            var atLeastOneFlowHasLosses = false;
            for (var i = 0; i < flowStates.length; i++) {
                flowStates[i].Tx = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, flowStates[i].flowIndex);
                flowStates[i].Rx = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, flowStates[i].TID);
                flowStates[i].ratioTot = 100. * (flowStates[i].Rx / flowStates[i].Tx);
                logInfo("    Flow " + flowStates[i].name + ": Tx= " + flowStates[i].Tx + " packets / Rx= " + flowStates[i].Rx + " packets / ratio= " + flowStates[i].ratioTot.toFixed(2));
                if (flowStates[i].ratioTot < (100 - loseTolerance_100))
                    atLeastOneFlowHasLosses = true;
            }
            if ((!useRepeatModifier) && (!atLeastOneFlowHasLosses)) {
                moveToNextStep = false; ///when Repeat modifier is not used, only moveToNextStep if losses are detected on at least one flow
            }
            if (atLeastOneTriggerFlowIsDiscarded && (!moveToNextStep)) {
                finish = true;
                verdict = false;
                logError("At step, " + step + " not all the trigger flows are dicarded");
            }

            for (var i = 0; i < flowStates.length; i++) {
                if ((flowStates[i].priority > 1) || (totalBitRate < portSpeed)) {
                    if (flowStates[i].ratioTot < (100 - loseTolerance_100)) {
                        finish = true;
                        verdict = false;
                        logError("At step, " + step + " flow " + flowStates[i].name + " must be forwarded without loss, and we only received " + flowStates[i].ratioTot.toFixed(2) + "%");
                    }
                } else if ((flowStates[i].priority == 1) && (totalBitRate >= portSpeed)) {
                    var ratio = flowStates[i].ratioTot;
                    if (useRepeatModifier) {
                        ratio = flowStates[i].ratioInAnalisisPeriod;
                    }
                    if (ratio >= (100 - loseTolerance_100)) {
                        if (moveToNextStep) {
                            finish = true;
                            verdict = false;
                            logError("At step, " + step + " flow " + flowStates[i].name + " is expected to have losses and we received " + ratio.toFixed(2) + "%");
                        } else {
                            logInfo("At step, " + step + " flow " + flowStates[i].name + " is expected to have losses and we received " + ratio.toFixed(2) + "%");
                        }
                    } else if (ratio < remainTolerance_100) {
                        finish = true;
                        verdict = false;
                        logError("At step, " + step + " flow " + flowStates[i].name + " is expected to be partially forwarded and we received  " + ratio.toFixed(2) + "%");
                    }
                }
            }

            if (moveToNextStep) {
                step++;
                if (step > lastStep) {
                    logInfo("Verification completed");
                    finish = true;
                } else {
                    logInfo("Move to step " + step);
                    for (var i = 0; i < flowStates.length; i++)
                        flowStates[i].priority--;
                }
            }
            for (var i = 0; i < flowStates.length; i++) {
                flowStates[i].bitRatePPS += flowStates[i].bitRateIncrementPPS;
            }
            Repeat += 1;
        }

        return verdict;
    }

};

addHelpInfo("TrafficGenerator", "Traffic Generator object: exposes methods needed for traffic automation and shield drivers. drivers must implement the public methods and be hooked here");

addHelpInfo("TrafficGenerator.Connect", "Connect to the configured traffic generator");
addHelpInfo("TrafficGenerator.Disconnect", "Disconnect from the configured traffic generator");
addHelpInfo("TrafficGenerator.StartTrafficOnPort", "start traffic on port, for all enabled streams", ["port", "[optional]nbOfFrames"], ["port Index", "number of frames. If none provided will keep sending"]);
addHelpInfo("TrafficGenerator.StopTrafficOnPort", "stop traffic on port", ["port"], ["port Index"]);
addHelpInfo("TrafficGenerator.EnableStreamOnPort", "enable stream on port", ["streamIdx", "port"], ["stream index as defined in traffic file", "port Index"]);
addHelpInfo("TrafficGenerator.DisableStreamOnPort", "disable stream on port", ["streamIdx", "port"], ["stream index as defined in traffic file", "port Index"]);
addHelpInfo("TrafficGenerator.ClearTransmitStatsOnPort", "Clear transmit stats on port", ["port"], ["port Index"]);
addHelpInfo("TrafficGenerator.GetTotalTransmitStatsOnPort", "Reads all transmit stats from port", ["port"], ["port Index"]);
addHelpInfo("TrafficGenerator.GetTransmitStatsOnPortAndStream", "Reads all transmit stats from port", ["port", "streamIdx"], ["port Index", "stream index as defined in traffic file"]);
addHelpInfo("TrafficGenerator.ClearReceiveStatsOnPort", "Clears receive stats on port", ["port"], ["port Index"]);
addHelpInfo("TrafficGenerator.GetTotalReceiveStatsOnPort", "Reads total receive stats on port", ["port"], ["port Index"]);
addHelpInfo("TrafficGenerator.GetReceivedStatsOnPortAndFilter", "Get receive stats on port, for provided filter", ["port", "filterIdx"], ["port Index", "filter index as defined in traffic file"]);
addHelpInfo("TrafficGenerator.GetReceivedStatsOnPortAndTID", "Get receive stats on port, for provided Traffic ID", ["port", "filterIdx"], ["port Index", "TID as defined in traffic file"]);
addHelpInfo("TrafficGenerator.SetBitRateForStream", "Set bitrate (bps) for stream", ["port", "streamIdx", "rate"], ["port Index", "stream index as defined in traffic file", "bitrate"]);
addHelpInfo("TrafficGenerator.SetPacketPerSecForStream", "Set PPS rate for stream", ["port", "streamIdx", "rate"], ["port Index", "stream index as defined in traffic file", "PPS rate"]);
addHelpInfo("TrafficGenerator.IsRepeatModifierSupported", "Checks is the 'Repeat Modifier' feature is supported", [], [], "true if supported");
addHelpInfo("TrafficGenerator.SetPortSpeed", "Sets the port speed (in mbps)", ["port", "speedMbps"], ["port index", "port speed in Mbps"], "true if successful");
addHelpInfo("TrafficGenerator.SetRepeatModifierForStream", "Sets stream modifier", ["port", "streamIdx", "modIndex", "position", "mask", "method", "nb"], ["port index", "streamIndex from the traffic file", "modifier index frm the traffic file", "position (bytes) in ' quotes", "4 bytes hex mask in ' quotes', 'method in ' quotes", "Number of iteration"], "true if successful");
addHelpInfo("TrafficGenerator.SetPacketLimitForStream", "Set max number of packets sent on stream", ["port", "streamIdx", "nb"], ["port Index", "stream index as defined in traffic file", "max number of packets"]);
addHelpInfo("TrafficGenerator.SendFrameOnPort", "Send the provided ethernet frame on the port", ["port", "frame", "nb"], ["port Index", "frame byte array", "number of time te packet out to be sent"]);
addHelpInfo("TrafficGenerator.SendPcapFileOnPort", "Send the frames from a PCAP File. Timing is not respected", ["port", "filePath"], ["port Index", "file path"]);
addHelpInfo("TrafficGenerator.SendTemplateConfig", "Send config to the traffic generator", ["templateFile", "templateTable"], ["file path", "replacement template table for configurable fields"]);
addHelpInfo("TrafficGenerator.SendTemplateConfigAndDoTest", "Send config to the traffic generator, and performs the tests (send all streams on all ports and retrieve stats). Results can be verified using the ApplyVerdict metho", ["templateFile", "templateTable", "gemTable"], ["file path", "replacement template table for configurable fields", "gem translation table"], "The result table to be passed to ApplyVerdict");
addHelpInfo("TrafficGenerator.ApplyVerdict", "Checks result from SendTemplateConfigAndDoTest using the pfovided rules", ["result", "rules"], ["result object returned by SendTemplateConfigAndDoTest", "verdict rules"]);
addHelpInfo("TrafficGenerator.TestDownstreamFlows", "Test whether downstream flows are forwarded or not. Flows and corresponding filters must be in the same order, with Fow indexing starting at 1 and filter indexing starting at 0", ["rxCriteria"], ["array of boolean (true<=>MUST be forwarded)"], "true if successful");
addHelpInfo("TrafficGenerator.TestSingleFlow", "Test a single flow from an array of flows. Flows and corresponding filters must be in the same order, with Fow indexing starting at 1 and filter indexing starting at 0", ["txPort", "rxPort", "flowIndex", "nbOfFrames", "flows", "filterIndex", "[optional]discard", "[optional]noRxChecks"], ["Tx port index", "Rx port index", "flow Index. starts at 1", "number of frames to send", "filter Index. starts at 0", "whether the flow must be discorded. default is false", "if set to true, Rx is not checked. Default is false"], "true if successful");
addHelpInfo("TrafficGenerator.TestSingleUpstreamFlow", "Test a single upstream flow using port 1, from an array of flows. Flows and corresponding filters must be in the same order, with Fow indexing starting at 1 and filter indexing starting at 0", ["flowIndex", "nbOfFrames", "flows", "filterIndex", "[optional]discard", "[optional]noRxChecks"], ["flow Index. starts at 1", "number of frames to send", "filter Index. starts at 0", "whether the flow must be discorded. default is false", "if set to true, Rx is not checked. Default is false"], "true if successful");
addHelpInfo("TrafficGenerator.TestSingleDownstreamFlow", "Test a single downstream flow using port 1, from an array of flows. Flows and corresponding filters must be in the same order, with Fow indexing starting at 1 and filter indexing starting at 0", ["flowIndex", "nbOfFrames", "flows", "filterIndex", "[optional]discard", "[optional]noRxChecks"], ["flow Index. starts at 1", "number of frames to send", "filter Index. starts at 0", "whether the flow must be discorded. default is false", "if set to true, Rx is not checked. Default is false"], "true if successful");
addHelpInfo("TrafficGenerator.TestDownstreamPriorities", "Test downstream priorities", ["flowStates", "config"], ["flow definition array -- see test 247i2 6.2.12 for example", "config object - see test 247i2 6.2.12 for example"], "true if successful");
addHelpInfo("TrafficGenerator.ApplyGEMTranslationRules", "Apply GEM translation rules doe the provided stream. See TrafficGenerator GEMTranslationMode attribute for GEMTable definition", ["portIndex", "streamName", "GEMTable"], ["Traffic Generator port conventional index (0=eOLT, 1... ONUs)", "name of the stream as used in GEMTable", "GEM Translation rule table. See GEMTranslationMode"]);
