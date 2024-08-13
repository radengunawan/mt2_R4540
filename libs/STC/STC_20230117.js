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

STC = {
    /// STC IP Address
    ipAddress: "172.16.14.211",
    /// STC slot
    stcSlot: "3",
    /// STC eOLT port
    stc_eoltPort: "1",
    /// STC eOLT IP address base -- used to generate IP addresses
    /// IP layer support is done automatically from XTC config files
    /// or from XML configuration using the place holder IP_WANx (x being
    /// the address index) for the OLT port
    stc_eoltIPBase: "128.0.0.0",
    /// STC ONU ports
    stc_onuPorts: ["2", "3"],
    /// STC ONU ports IP address base -- used to generate IP addresses
    /// IP layer support is done automatically from XTC config files
    /// or from XML configuration using the place holder IP_LANy_x (y being
    /// the port index, starting at 0, and x the address index) for the ONU
    /// ports
    stc_eoltIPBase: "128.0.0.0",
    stc_onuPortsIPBase: ["192.168.1.0", "192.168.2.0"],
    /// STC proxy address
    proxyAddress: "127.0.0.1",
    /// STC proxy Port
    proxyPort: 4000,
    /// STC response timeout (2minutes)
    timeout: 120000,
    /// Delay before before traffic testing (ms)
    delayBeforeTraffic: 10000,
    /// Delay before sending each traffic in automatic traffic generation (in ms)
    delayBeforeSend: 200,
    /// Delay after sending traffic -- to allow enough time for buffer to be empties, statistical computation,...
    delayAfterSend: 600,
    /// Delay to wait after STC connect -- some chassis need extra delay
    delayAfterConnect: 100,
    /// Nb of packet to send in automatic traffic generation
    nbOfPacketToSend: 100,
    /// timeout on automated send (ms)
    sendTimeOut: (10 * 1000),
    /// Bit rate (kilobits/s)
    lineRate: 1000000,
    ///file path -- if defined, must be "\" terminated, and all '\' characters must be escaped properly
    filePath: "",
    ///backup -- if defined the resulting configuration, after replacement & processing, is saved to the 'backup' (must contain the name of the file
    backup: undefined,
    ///enableFilter -- filters are only used if non zero (certain STC model can not handle filters & TID statistics)
    ///if set to true, filters will be used always, false never, undefined: internal policy
    enableFilter: false,
    ///ignoreParasiteTraffic -- set to true for ONUs which generate additionnal traffic on their own (e.g. ONU-RG)
    ignoreParasiteTraffic: true,

    ///////////////////////////////////
    /// internal state
    ///////////////////////////////////
    /// Current socket
    socket: undefined,
    /// STC internal object handles
    project: undefined,
    /// ports: array of port, ordered according to external API: 0 is eOLT, 1 is ONU 1, 2 is ONU 2
    /// port: {
    ///        "stc_index",
    ///         "handle", // (port handle)
    ///         "phy",
    ///         "generator",
    ///         "analyzer"
    ///        }
    ports: [],
    /// streams[portIdx][streamIdx], ordered according to external API
    /// stream: {
    ///          "handle",
    ///          "rate",
    ///          "packetNb",
    ///          "packetRepeat",
    ///          "len",
    ///          "name",
    ///          "tid",
    ///          "enabled"
    //          }
    streams: [],
    filter: {}, ///Per analyzer handle
    ///Stream Name & TID are global and resolve into port (index) & stream (index)
    streamNameToTID: {}, /// TID is global, arbitrary, and starts at 1
    streamNameToIdx: {}, /// idx is per port, starts with 0
    streamNameToPort: {},

    filterIndexToStreamName: [],
    /*
     * [portIdx][filterIdx][]. Necessary, as there can only be one filter per
     * analyzer. In case of multiple concurrent stream, one filter is used
     * instead of one per stream in xena, and differentiation is based on TID.
     * But the scripts must remain the same, and these use a filter index. This
     * also implies that one filter (as seen from the script) can only apply to
     * one stream in case of concurrent streams.
     */

    streamTIDToName: [],
    streamNameToFilterConfig: {},
    modifiers: {}, // per stream 'all' means apply to all

    currentConfig: undefined,

    anonIndex: 0, ///used for configuration bookkeeping

    CreatePort: function () {
        var port = {
            stc_index: undefined,
            handle: undefined, // (port handle)
            phy: undefined,
            generator: undefined,
            analyzer: undefined
        };
        return port;
    },

    /** Connect to the STC device using current ipAddress, ipPort
     */
    Connect: function () {
        this.ConnectToProxy();
        /// Create object
        /// Reset proxy
        this.StcResetProxy();
        /// Create project
        this.project = this.StcNewProject();
        /// Create ports
        /// 1. Instantiation
        if (this.ports[0] == undefined)
            this.ports[0] = this.CreatePort();
        this.ports[0].stc_index = this.stc_eoltPort;
        for (var i = 0; i < this.stc_onuPorts.length; i++) {
            if (this.ports[i + 1] == undefined)
                this.ports[i + 1] = this.CreatePort();
            this.ports[1 + i].stc_index = this.stc_onuPorts[i];
        }
        /// 1. Handle
        for (var port in this.ports) {
            this.ports[port].handle = this.StcNewPort(this.project, this.ipAddress, this.stcSlot, this.ports[port].stc_index);
        }
        /// 2. phy interface
        for (var port in this.ports) {
            this.ports[port].phy = this.StcNewPhy(this.ports[port].handle);
        }

        /// Connect Proxy to STC device
        this.StcConnect(this.ipAddress);

        sleep(this.delayAfterConnect);

        /// Reserve port
        for (var port in this.ports) {
            this.StcReservePort(this.ipAddress, this.stcSlot, this.ports[port].stc_index);
        }

        /// Setting up STC
        this.StcSetupPhy();

        /// Apply config
        this.StcApply();

        /// Get Generators and analysers objects
        for (var port in this.ports) {
            this.ports[port].generator = this.StcGetGenerator(this.ports[port].handle);
        }
        for (var port in this.ports) {
            this.ports[port].analyzer = this.StcGetAnalyzer(this.ports[port].handle);
        }

        /// Get physical speed
        for (var port in this.ports) {
            this.StcGetPhySpeed(this.ports[port].phy);
        }

    },

    /** Disconnect from the STC device
     */
    Disconnect: function () {
        TrafficGenerator.logInfo("Disconnecting from STC");
        if (this.socket && this.socket.isConnected()) {
            for (var port in this.ports) {
                this.StcReleasePort(this.ipAddress, this.stcSlot, this.ports[port].stc_index);
            }
            if (this.project != undefined)
                this.StcDelProject(this.project);
            this.StcDisconnect(this.ipAddress);
            this.socket.disconnect();
        }
        this.socket = undefined;
        this.project = undefined;

        this.ports = [];
        this.streams = [];
        this.filterIndexToStreamName = [];
        this.streamTIDToName = [];
        for (var key in this.streamNameToTID)
            delete this.streamNameToTID[key];
        this.streamNameToTID = {};
        for (var key in this.streamNameToIdx)
            delete this.streamNameToIdx[key];
        this.streamNameToIdx = {};
        for (var key in this.streamNameToPort)
            delete this.streamNameToPort[key];
        this.streamNameToPort = {}
        for (var key in this.filter)
            delete this.filter[key];
        this.filter = {};
        for (var key in this.streamNameToFilterConfig)
            delete this.streamNameToFilterConfig[key];
        this.streamNameToFilterConfig = {};
        for (var key in this.modifiers)
            delete this.modifiers[key];
        this.modifiers = {};

        this.currentConfig = undefined;
    },

    ClearFilterForStream: function (streamName) {
        for (var portIdx in this.filterIndexToStreamName) {
            for (var filterIdx in this.filterIndexToStreamName[portIdx]) {
                for (var i = 0; i < this.filterIndexToStreamName[portIdx][filterIdx].length; i++) {
                    if (this.filterIndexToStreamName[portIdx][filterIdx][i] == streamName) {
                        this.filterIndexToStreamName[portIdx][filterIdx][i] = undefined;
                        ///keep cleaning -- in case of duplicate
                    }
                }
            }
        }
    },

    checkPortBeforeAccess: function (port) {
        if (this.ports[Number(port)] === undefined) {
            TrafficGenerator.logWarning("Accessing unconfigured port " + port);
            return false;
        }
        return true;
    },

    /** Start traffic on the specified port
     */
    StartTrafficOnPort: function (port, nbOfFrame) {
        if (!this.checkPortBeforeAccess(port))
            return;

        TrafficGenerator.logInfo("Starting traffics on port " + port);

        ///Clean up filters -- can not do it in stop as reading the stats may happen later
        TrafficGenerator.logInfo("cleaning filters");
        for (var streamIdx in this.streams[port]) {
            var streamName = this.streams[port][streamIdx].name;
            if (this.streamNameToFilterConfig[streamName] != undefined) {
                for (var filterIdx in this.streamNameToFilterConfig[streamName]) {
                    var filterName = this.streamNameToFilterConfig[streamName][filterIdx].name;
                    var filterPort = this.GetPortIdFromXmlString(this.streamNameToFilterConfig[streamName][filterIdx].port);
                    var analyzer = this.GetAnalyzerHandle(filterPort);
                    if ((this.filter[analyzer] != undefined) /*&& (this.filter[analyzer][filterName] != undefined)*/) {
                        ///Delete any previous filter on port filter -- this may be needed when start is done on a second upstream port
                        for (var filterName in this.filter[analyzer]) {
                            var filter = this.filter[analyzer][filterName];
                            if (filter != undefined) {
                                TrafficGenerator.logInfo("deleting filter " + filterName);
                                this.StcDeleteHandle(filter);
                                this.filter[analyzer][filterName] = undefined;
                            }
                        }
                    }
                }
            }
            this.ClearFilterForStream(streamName);
        }

        ///Filter analysis: There can either be 1 stream and several filters, or several streams but one filter
        var enableFilter = this.enableFilter;
        if (enableFilter) {
            var numStreamEnabled = 0;
            var numFilterToCreate = 0;
            var createdFilterName = undefined;
            for (streamIdx in this.streams[port]) {
                if (this.streams[port][streamIdx].enabled == true) {
                    numStreamEnabled++;
                    var stream = this.streams[port][streamIdx];
                    if (this.streamNameToFilterConfig[stream.name] != undefined) {
                        for (var filterIdx in this.streamNameToFilterConfig[stream.name]) {
                            var filterPort = this.GetPortIdFromXmlString(this.streamNameToFilterConfig[stream.name][filterIdx].port);
                            var filterConfig = this.streamNameToFilterConfig[stream.name][filterIdx].config;
                            var filterName = this.streamNameToFilterConfig[stream.name][filterIdx].name;
                            if ((filterConfig != undefined) && (filterName != createdFilterName)) {
                                numFilterToCreate++;
                                createdFilterName = filterName;
                            }
                        }
                    }
                }
            }
            if ((numStreamEnabled > 1) && (numFilterToCreate > 1)) {
                logInfo("Disabling filters: too many streams or filters defined");
                enableFilter = false; ///There can either be 1 stream and several filters or several streams but one filter
            }
        }

        /// For each enabled stream on port
        var frameCnt = 0;
        for (streamIdx in this.streams[port]) {
            if (this.streams[port][streamIdx].enabled == true) {
                /// Check whether there is a modifier for this stream
                var stream = this.streams[port][streamIdx];
                TrafficGenerator.logInfo("Final configuration for stream " + stream.name);
                if ((this.modifiers[stream.name] != undefined) || (this.modifiers['all'] != undefined)) {
                    var modifier = (this.modifiers[stream.name] != undefined) ? this.modifiers[stream.name] : this.modifiers['all'];
                    TrafficGenerator.logInfo("Applying modifier for stream " + stream.name + ": " + modifier.offset + "\t" + modifier.mask + "\t" + modifier.method + "\t" + modifier.repeat);
                    this.ApplyModifierForStream(port, streamIdx, modifier.offset, modifier.mask, modifier.method, modifier.repeat);
                }
                /// Set the stream rate and nb
                var streamNbOfFrame = stream.packetNb;
                if (nbOfFrame != undefined) {
                    if (Array.isArray(nbOfFrame))
                        streamNbOfFrame = nbOfFrame[streamIdx];
                    else
                        streamNbOfFrame = nbOfFrame;
                }
                if ((0 != stream.packetRepeat) && (undefined != streamNbOfFrame))
                    streamNbOfFrame = streamNbOfFrame * stream.packetRepeat;

                frameCnt += streamNbOfFrame;

                this.StcSetStreamRate(stream.handle, stream.rate);
                if (this.streamNameToFilterConfig[stream.name] != undefined) {
                    for (var filterIdx in this.streamNameToFilterConfig[stream.name]) {
                        var filterPort = this.GetPortIdFromXmlString(this.streamNameToFilterConfig[stream.name][filterIdx].port);
                        var filterConfig = this.streamNameToFilterConfig[stream.name][filterIdx].config;
                        var filterName = this.streamNameToFilterConfig[stream.name][filterIdx].name;
                        var analyzer = this.GetAnalyzerHandle(filterPort);
                        if (enableFilter && (filterConfig != undefined)) {
                            ///There can only be one filter at a time. Filters must be designed accordingly
                            TrafficGenerator.logInfo("Creating filter " + filterName);
                            if (this.filter[analyzer] == undefined)
                                this.filter[analyzer] = {};
                            this.filter[analyzer][filterName] = this.StcCreateFilter(filterName, analyzer, filterConfig);
                        }
                        ///regardless of the fact that the filter is created we assign a filter index to the stream for access from the API. First one wins ...
                        if (this.filterIndexToStreamName[filterPort] == undefined)
                            this.filterIndexToStreamName[filterPort] = [];
                        if (this.filterIndexToStreamName[filterPort][filterIdx] == undefined)
                            this.filterIndexToStreamName[filterPort][filterIdx] = [];
                        TrafficGenerator.logInfo("Tying filter " + this.streamNameToFilterConfig[stream.name][filterIdx].name + "/" + filterIdx + " to " + stream.name + " on port " + filterPort);
                        this.filterIndexToStreamName[filterPort][filterIdx].push(stream.name);
                    }
                }
            }
        }
        /// Limit the number of packet to send and bit rate to 1% the physical media speed
        var portGeneratorHandle = this.GetGeneratorHandle(port);
        this.StcConfigGenerator(portGeneratorHandle, frameCnt, 0);
        this.StcApply();
        /// Start all analyzer
        for (var port in this.ports) {
            this.StcStartAnalyzer(this.ports[port].analyzer);
        }
        /// Start enabled traffic on the port
        this.StcStartGenerator(portGeneratorHandle);
    },

    /** Stop the traffic on the specified port
     */
    StopTrafficOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        TrafficGenerator.logInfo("Stopping traffics on port " + port);
        /// Stop enabled traffic on the port
        this.StcStopGenerator(this.GetGeneratorHandle(port));
        /// Stop all analyzer
        for (var port in this.ports) {
            this.StcStopAnalyzer(this.ports[port].analyzer);
        }
    },

    /** Refresh result on all streams
     */
    RefreshStatsOnPort: function (streamIdx, port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.StcRefreshResults(this.streams[port][streamIdx].handle);
    },

    /** Enable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    EnableStreamOnPort: function (streamIdx, port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.StcActivateStream(this.streams[port][streamIdx].handle);
        this.streams[port][streamIdx].enabled = true;
    },

    /** Disable a stream (defined by its index) on the specified port (Traffic has to be stopped)
     */
    DisableStreamOnPort: function (streamIdx, port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var stream = this.streams[port][streamIdx];
        this.StcDeactivateStream(stream.handle);
        stream.enabled = false;
        this.ClearFilterForStream(stream.name);
    },

    /** Clear transmit statistics
     */
    ClearTransmitStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.StcClearStatPort(this.ports[port].handle);
    },

    /** Retrieve total transmit statistics
     */
    GetTotalTransmitStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        return parseInt(this.StcGetTxTotalFrame(this.GetGeneratorHandle(port)));
    },

    /** Retrieve transmit statistics on specific stream
     */
    GetTransmitStatsOnPortAndStream: function (port, streamIdx) {
        if (!this.checkPortBeforeAccess(port))
            return;

        return parseInt(this.StcGetTxStream(this.streams[port][streamIdx].handle));
    },

    /** Clear receive statistics
     */
    ClearReceiveStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.StcClearStatPort(this.ports[port].handle);
    },

    /** Retrieve total receive statistics
     */
    GetTotalReceiveStatsOnPort: function (port) {
        if (!this.checkPortBeforeAccess(port))
            return;

        return parseInt(this.StcGetRxTotalFrame(this.GetAnalyzerHandle(port)));
    },

    /** Retrieve  receive on specific filter
     */
    /*  GetReceivedStatsOnPortAndFilter: function(port, filter){
    return this.StcGetFilterStat(port);
    },*/
    _GetReceivedStatsOnPortAndFilterOrStream: function (port, filterOrStream, streamPort) {
        if ((streamPort == undefined) || (this.streams[streamPort] == undefined) || (this.streams[streamPort][filterOrStream] == undefined) || (this.streams[streamPort][filterOrStream].handle == undefined)) {
            return parseInt(this.StcGetFilterStat(this.ports[port].handle));
        } else {
            return parseInt(this.StcGetFilterStatTID(this.ports[port].handle, this.streams[streamPort][filterOrStream].handle));
        }
    },

    GetReceivedStatsOnPortAndFilter: function (port, filter) {
        if (!this.checkPortBeforeAccess(port))
            return;

        TrafficGenerator.logInfo("GetReceivedStatsOnPortAndFilter::port=" + port + "; filter=" + filter);
        this.StcRefreshResults(this.ports[port].handle);
        if (isInteger(filter) && (this.filterIndexToStreamName[port] != undefined) && (this.filterIndexToStreamName[port][filter] != undefined)) {
            var res = 0;
            ///multiple streams: add the results accross the streams
            for (var i = 0; i < this.filterIndexToStreamName[port][filter].length; i++) {
                var streamName = this.filterIndexToStreamName[port][filter][i]
                    if (streamName != undefined) {
                        TrafficGenerator.logInfo("Mapping filter " + filter + " to stream " + streamName);
                        var streamPort = this.streamNameToPort[streamName];
                        var streamIdx = this.streamNameToIdx[streamName];
                        var streamRes = this._GetReceivedStatsOnPortAndFilterOrStream(port, streamIdx, streamPort); ///streamIdx is the stream index by construction
                        TrafficGenerator.logInfo(streamName + " has received " + streamRes + " frames");
                        res = res + streamRes;
                    }
            }
            return res;
        }
        return this._GetReceivedStatsOnPortAndFilterOrStream(port, filter);
    },

    /** Retrieve  receive on specific TID
     */
    GetReceivedStatsOnPortAndTID: function (port, tid) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var streamIndex = this.streamNameToIdx[this.streamTIDToName[tid]];
        var streamPort = this.streamNameToPort[this.streamTIDToName[tid]];
        TrafficGenerator.logInfo("stream TID=" + tid + "/" + "stream Idx=" + streamIndex + "/" + "tx port=" + streamPort);
        this.StcRefreshResults(this.ports[port].handle);

        return parseInt(this.StcGetFilterStatTID(this.ports[port].handle, this.streams[streamPort][streamIndex].handle));
    },

    /** Set Bit rate for the specified stream
     */
    SetBitRateForStream: function (port, stream, rate) {
        this.streams[port][stream].rate = rate;
    },

    /** Set Bit rate for the specified stream
     */
    SetPacketPerSecForStream: function (port, stream, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var rate = (nb * this.streams[port][stream].len * 8);
        this.streams[port][stream].rate = rate;
    },

    /** Set the repeat for the modifier of the stream
     */
    SetRepeatModifierForStream: function (port, streamIdx, mod, pos, mask, method, nb) {
        TrafficGenerator.logWarning("Support for modifiers not implemented in STC");
        return;

        if (!this.checkPortBeforeAccess(port))
            return;

        ///if it were supported...
        var stream = this.streams[port][streamIdx];

        if (this.modifiers == undefined) {
            this.modifiers = [];
        }
        if (undefined == this.modifiers[stream.name]) {
            this.modifiers[stream.name] = {};
        }
        this.modifiers[stream.name].offset = pos;
        this.modifiers[stream.name].mask = mask;
        this.modifiers[stream.name].method = method;
        this.modifiers[stream.name].repeat = nb;
    },

    IsRepeatModifierSupported: function () {
        return false;
    },

    IsPortSpeedSettingSupported: function () {
        return false;
    },

    SetPortSpeed: function (port, speed) {
        if (!this.checkPortBeforeAccess(port))
            return;

        popup("Action", "Please set port " + port + " speed to " + speed + "Mbps, then click OK");
        this.lineRate = speed * 1000; //kbps
        return true;
    },

    ApplyModifierForStream: function (port, streamIdx, pos, mask, method, nb) {
        TrafficGenerator.logWarning("Support for modifiers not implemented in STC");
        return;

        ///if it were supported...
        if (!this.checkPortBeforeAccess(port))
            return;

        //var rate = this.streamRate[port][this.streamIdxToName[portHandle][stream]];
        var stream = this.streams[port][streamIdx];
        stream.packetRepeat = nb;
        pos = 0; ///Force offset to 0 as the range being used is defined as a custom header
        if (undefined == this.modifiers[stream.name]) {
            this.modifiers[stream.name] = this.StcCreateRangeModifier(stream.handle, pos, mask, method, nb);
            TrafficGenerator.logInfo("Created modifier " + this.modifiers[stream.name] + " for stream " + stream.handle);
        } else {
            this.StcConfigRangeModifier(this.modifiers[stream.name], pos, mask, method, nb);
        }
    },

    /** Set the packet limit for the stream
     */
    SetPacketLimitForStream: function (port, stream, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        this.streams[port][stream].packetNb = nb;
    },

    /** Send a frame on the port
     */
    SendFrameOnPort: function (port, frame, nb) {
        if (!this.checkPortBeforeAccess(port))
            return;

        var hexFrameHeader = "0000000000000000" + (frame.length & 0xff).hex(2, 0) + ((frame.length >> 8) & 0xff).hex(2, 0) + "0000" + (frame.length & 0xff).hex(2, 0) + ((frame.length >> 8) & 0xff).hex(2, 0) + "0000";
        var hexFrame = "";
        for (var i in frame)
            hexFrame += frame[i].hex(2, 0);
        this.StcSendFrame(this.ports[port].handle, nb, hexFrame, hexFrameHeader);
    },

    PacketHeaderToUDPPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "udp:Udp",
            name: "proto1",
        };
        return PDU;
    },

    PacketHeaderToIGMPPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "igmp:Igmpv3Query",
            name: "proto1",
            sections: []
        }

        var type = packetHeader[offset];
        offset += 4;

        switch (type) {
        case 0x12:
            PDU.pdu = "igmp:Igmpv1";

            if ((4 + offset <= packetHeader.length)) {
                PDU.sections.push({
                    type: 'groupAddress',
                    content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                });
                offset += 4;
            }
            break;

        case 0x16: //V2 Report
            PDU.pdu = "igmp:Igmpv2Report"

                if ((4 + offset <= packetHeader.length)) {
                    PDU.sections.push({
                        type: 'groupAddress',
                        content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                    });
                    offset += 4;
                }
                break;

        case 0x17: //V2 Leave
            PDU.pdu = "igmp:Igmpv2";
            PDU.sections.push({
                type: 'type',
                content: 17
            });

            if ((4 + offset <= packetHeader.length)) {
                PDU.sections.push({
                    type: 'groupAddress',
                    content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                });
                offset += 4;
            }
            break;

        case 0x11: ///query
            if ((4 + offset <= packetHeader.length)) {
                PDU.sections.push({
                    type: 'groupAddress',
                    content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                });
                offset += 4;
            }
            if ((offset + 4) > packetHeader.length) {
                PDU.pdu = "igmp:Igmpv2Query";
            } else {
                var numSource = 0;
                numSource = ExtractUnsigned16BitsFromArray(packetHeader, offset + 2);
                PDU.sections.push({
                    type: "numSource",
                    content: numSource
                });
                offset += 4;
                if (numSource > 0) {
                    var addrListContentSection = [];
                    for (var j = 0;
                        (j < numSource) && ((4 + offset) <= packetHeader.length); j++) {
                        var IPv4AddressSection = [{
                                type: "value",
                                content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                            }
                        ];
                        addrListContentSection.push({
                            type: "Ipv4Addr",
                            name: "Ipv4Addr_" + j,
                            sections: IPv4AddressSection
                        });
                        offset += 4;
                    }
                    PDU.sections.push({
                        type: "addrList",
                        name: this.GetXMLAnonSectionName(),
                        sections: addrListContentSection
                    });
                }
            }
            break;

        case 0x22: //report v3
            PDU.pdu = "igmp:Igmpv3Report";
            var numGrpRecords = 0;
            if ((4 + offset <= packetHeader.length)) {
                numGrpRecords = ExtractUnsigned16BitsFromArray(packetHeader, offset + 2);
                PDU.sections.push({
                    type: "numGrpRecords",
                    content: numGrpRecords
                });
                offset += 4;
            }
            if (numGrpRecords > 0) {
                var groupRecordSection = {
                    type: "grpRecords",
                    name: this.GetXMLAnonSectionName(),
                    sections: []
                };
                for (var i = 0;
                    (i < numGrpRecords) && (offset < packetHeader.length); i++) {
                    var GroupRecordContentSection = [];
                    if ((1 + offset) <= packetHeader.length) {
                        GroupRecordContentSection.push({
                            type: "recordType",
                            content: packetHeader[offset]
                        });
                    }
                    var numSource = 0;
                    if ((4 + offset) <= packetHeader.length) {
                        numSource = ExtractUnsigned16BitsFromArray(packetHeader, offset + 2);
                        GroupRecordContentSection.push({
                            type: "numSource",
                            content: numSource
                        });
                        offset += 4;
                    }
                    if ((4 + offset) <= packetHeader.length) {
                        GroupRecordContentSection.push({
                            type: "mcastAddr",
                            content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                        });
                        offset += 4;
                    }
                    if (numSource > 0) {
                        var addrListContentSection = [];
                        for (var j = 0;
                            (j < numSource) && ((4 + offset) <= packetHeader.length); j++) {
                            var IPv4AddressSection = [{
                                    type: "value",
                                    content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
                                }
                            ];
                            addrListContentSection.push({
                                type: "Ipv4Addr",
                                name: "Ipv4Addr_" + j,
                                sections: IPv4AddressSection
                            });
                            offset += 4;
                        }
                        GroupRecordContentSection.push({
                            type: "addrList",
                            name: this.GetXMLAnonSectionName(),
                            sections: addrListContentSection
                        });
                    }
                    groupRecordSection.sections.push({
                        type: "GroupRecord",
                        name: "GroupRecord_" + i,
                        sections: GroupRecordContentSection
                    });
                }
                PDU.sections.push(groupRecordSection);
            }

            break;
        }

        return PDU;
    },

    GetXMLAnonSectionName: function () {
        return "anon_" + (++this.anonIndex);
    },

    PacketHeaderToIPv4PDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "ipv4:IPv4",
            name: "ip_1",
            sections: [{
                    type: 'totalLength',
                    content: packetLength - offset
                }, {
                    type: 'tosDiffserv',
                    name: this.GetXMLAnonSectionName(),
                    sections: [{
                            type: "tos"
                        }
                    ]
                }, {
                    type: 'ttl',
                    content: packetHeader[offset + 8]
                }, {
                    type: 'identification',
                    content: ExtractUnsigned16BitsFromArray(packetHeader, offset + 4)
                }, {
                    type: 'totalLength',
                    content: ExtractUnsigned16BitsFromArray(packetHeader, offset + 2)
                }
            ]
        };
        var headerLength = 20;
        if (offset < packetHeader.length)
            headerLength = (packetHeader[offset] & 0x0F) * 4;

        var protocol = 17;
        if ((offset + 10) <= packetHeader.length)
            protocol = packetHeader[offset + 9];

        offset += 12;

        if ((4 + offset) <= packetHeader.length) {
            PDU.sections.push({
                type: 'sourceAddr',
                content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
            });
            offset += 4;
        }
        if ((4 + offset) <= packetHeader.length) {
            PDU.sections.push({
                type: 'destAddr',
                content: IPv4Address(packetHeader.mid(offset, 4)).ToString()
            });
            offset += 4;
        }
        if ((headerLength > 20) && ((offset + 2) < packetHeader.length)) {
            var optionIdx = 0;
            var options_length = headerLength - 20;
            var optionSection = {
                type: 'options',
                sections: []
            };
            while ((options_length > 2) && ((offset + 2) <= packetHeader.length)) {
                var optType = packetHeader[offset];
                var optLength = packetHeader[offset + 1];
                switch (optType) {
                case 148: ///Router applyFilterToStream
                    optionSection.sections.push({
                        type: "IPv4HeaderOption",
                        name: "IPv4HeaderOption_" + optionIdx,
                        sections: [{
                                type: 'rtrAlert'
                            }
                        ]
                    });
                    break;

                }
                if (0 == optLength)
                    break;
                offset += optLength;
                options_length -= optLength;
                optionIdx++;
            }
            PDU.sections.push(optionSection);
        }

        switch (protocol) {
        case 17: ///UDP
            PDU.next = this.PacketHeaderToUDPPDU(packetHeader, offset, packetLength);
            break;

        case 2: ///IGMP
            PDU.next = this.PacketHeaderToIGMPPDU(packetHeader, offset, packetLength);
            break;

        }
        return PDU;
    },

    PacketHeaderToIPv6PDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "ipv6:IPv6",
            name: "ip_1",
            sections: [{
                    type: 'totalLength',
                    content: packetLength - offset
                },
            ]
        };
        return PDU;
    },

    PacketHeaderToARPPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "arp:ARP",
            name: "proto_1",
            sections: [{
                    type: 'hardware',
                    content: "0001"
                }, {
                    type: 'protocol',
                    content: '0800'
                }
            ]
        };

        return PDU;
    },

    PacketHeaderToPPPoEDiscoveryPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "pppoe:PPPoEDiscovery",
            name: "proto_1",
            sections: [{
                    type: 'length',
                    content: 0
                }
            ]
        };

        return PDU;
    },

    PacketHeaderToPPPoESessionPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "pppoe:PPPoESession",
            name: "proto_1",
            sections: [{
                    type: 'length',
                    content: 0
                }
            ]
        };

        return PDU;
    },

    PacketHeaderToEthernetPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "ethernet:EthernetII",
            name: "eth1",
            sections: [{
                    type: 'dstMac',
                    content: "10:11:22:33:44:01"
                }, {
                    type: 'srcMac',
                    content: "20:11:22:33:44:02"
                }
            ]
        };
        if ((6 + offset) <= packetHeader.length) {
            PDU.sections[0].content = IEEE_802_1QAddress(packetHeader.mid(offset, 6)).ToString();
            offset += 6;
        }
        if ((6 + offset) <= packetHeader.length) {
            PDU.sections[1].content = IEEE_802_1QAddress(packetHeader.mid(offset, 6)).ToString();
            offset += 6;
        }
        if ((2 + offset) <= packetHeader.length) {
            var etherType = ExtractUnsigned16BitsFromArray(packetHeader, offset);
            offset += 2;
            if ((etherType == 0x88a8) || (etherType == 0x8100)) {
                var subsections = [];
                while ((etherType == 0x88a8) || (etherType == 0x8100)) {
                    var subsection = {
                        type: "Vlan",
                        name: "Vlan",
                        sections: []
                    };
                    if (etherType == 0x88a8)
                        subsection.sections.push({
                            type: 'type',
                            'content': etherType.hex()
                        });
                    if ((2 + offset) <= packetHeader.length) {
                        var id = ExtractUnsigned16BitsFromArray(packetHeader, offset) & 0x0FFF;
                        var pri = (packetHeader[offset] >> 5) & 0x07;
                        subsection.sections.push({
                            type: 'pri',
                            content: pri.bin(3, 0)
                        });
                        subsection.sections.push({
                            type: 'id',
                            content: id
                        });
                        offset += 2;
                    }
                    subsections.push(subsection);
                    if ((2 + offset) <= packetHeader.length) {
                        etherType = ExtractUnsigned16BitsFromArray(packetHeader, offset);
                        offset += 2;
                    } else {
                        etherType = 0x0800;
                    }
                }

                PDU.sections.push({
                    type: 'vlans',
                    name: this.GetXMLAnonSectionName(),
                    sections: subsections
                });
            }
            switch (etherType) {
            case 0x0800:
                ///IPv4
                PDU.next = this.PacketHeaderToIPv4PDU(packetHeader, offset, packetLength);
                break;

            case 0x806:
                PDU.next = this.PacketHeaderToARPPDU(packetHeader, offset, packetLength);
                break;

            case 0x8863:
                PDU.next = this.PacketHeaderToPPPoEDiscoveryPDU(packetHeader, offset, packetLength);
                break;

            case 0x8864:
                PDU.next = this.PacketHeaderToPPPoESessionPDU(packetHeader, offset, packetLength);
                break;

            case 0x86dd:
                PDU.next = this.PacketHeaderToIPv6PDU(packetHeader, offset, packetLength);
                break;

            }
        } else {
            PDU.next = this.PacketHeaderToIPv4PDU(packetHeader, offset, packetLength);
        }
        return PDU;
    },

    PacketHeaderToPDUs: function (packetHeader, offset, packetLength) {
        return this.PacketHeaderToEthernetPDU(packetHeader, offset, packetLength);
    },

    PDUSectionToStreamConfig: function (section) {
        var config = "<" + section.type;
        if (section.name != undefined) {
            config += " name=\"" + section.name + "\"";
        }
        config += ">";
        if (section.content != undefined)
            config += section.content;

        if (section.sections != undefined) {
            for (var i = 0; i < section.sections.length; i++) {
                config += this.PDUSectionToStreamConfig(section.sections[i]);
            }
        }
        config += "</" + section.type + ">";
        return config;
    },

    PDUToStreamConfig: function (PDU) {
        var name = PDU.name;
        if (name == undefined)
            name = "anon_" + (++this.anonIndex);

        var config = "<pdu name=\"" + name + "\" pdu=\"" + PDU.pdu + "\">";

        if (PDU.sections != undefined) {
            for (var i = 0; i < PDU.sections.length; i++) {
                config += this.PDUSectionToStreamConfig(PDU.sections[i]);
            }
        }

        config += "</pdu>";
        if (PDU.next != undefined)
            config += this.PDUToStreamConfig(PDU.next);

        return config;
    },

    ConvertPacketHeaderToStreamConfig: function (packetHeader, packetLength) {
        ///1st create russian doll encapsulation from the header
        var PDU = this.PacketHeaderToPDUs(packetHeader, 0, packetLength);
        var config = "<frame><config><pdus>";
        config += this.PDUToStreamConfig(PDU);
        config += "</pdus></config></frame>";

        return config; //FormatStringToXML(config);
    },

    CompressXTCFiltersOnPort: function (port, maxSize) {
        ///First compare all filters to find whatever is common to all (first candidate for removal)
        var maxExistingFilterSize = 0;
        var maxExistingFilterBufferLength = 0;
        for (var XTCFilter in port.XTC.filters) {
            if (port.XTC.filters[XTCFilter].ethFilterSize > maxExistingFilterSize) {
                maxExistingFilterSize = port.XTC.filters[XTCFilter].ethFilterSize;
            }
            if (port.XTC.filters[XTCFilter].ethMask.length > maxExistingFilterBufferLength) {
                maxExistingFilterBufferLength = port.XTC.filters[XTCFilter].ethMask.length1;
            }
        }
        var differentValueArray = new ByteArray(maxExistingFilterBufferLength);
        var differentByteCount = 0;
        if (maxExistingFilterSize > maxSize) {
            if (port.XTC.filters.length > 1) {
                for (var k = 0; k < maxExistingFilterSize; k += 1) {
                    var maskByte = port.XTC.filters[0].ethMask[k];
                    var valueByte = port.XTC.filters[0].ethValue[k];
                    for (var p = 1; p < port.XTC.filters.length; p++) {
                        if (port.XTC.filters[p].ethMask[k] != maskByte) {
                            differentValueArray[0] = 0xFF;
                            differentByteCount++;
                            break;
                        }
                        if ((maskByte != 0) && (port.XTC.filters[p].ethValue[k] != valueByte)) {
                            differentValueArray[0] = 0xFF;
                            differentByteCount++;
                            break;
                        }
                    }
                }
            }
        }

        for (var XTCFilter in port.XTC.filters) {
            if (port.XTC.filters[XTCFilter].ethFilterSize > maxSize) {
                ///erase from left to right
                if (differentByteCount > 0) {
                    ///1. Fast pass: remove common criteria
                    for (var k = 0;
                        (k < port.XTC.filters[XTCFilter].ethMask.length) && (port.XTC.filters[XTCFilter].ethFilterSize > maxSize); k += 1) {
                        if ((differentValueArray[k] == 0) && (port.XTC.filters[XTCFilter].ethMask[k] != 0)) {
                            port.XTC.filters[XTCFilter].ethMask[k] = 0;
                            port.XTC.filters[XTCFilter].ethFilterSize--;
                        }
                    }
                }
                ///if the filter size is still to large, prune from left to right
                for (var k = 0;
                    (k < port.XTC.filters[XTCFilter].ethMask.length) && (port.XTC.filters[XTCFilter].ethFilterSize > maxSize); k += 1) {
                    if (port.XTC.filters[XTCFilter].ethMask[k] != 0) {
                        port.XTC.filters[XTCFilter].ethMask[k] = 0;
                        port.XTC.filters[XTCFilter].ethFilterSize--;
                    }
                }
            }
        }
    },

    XTCFilterToIPv4FilterPDU: function (valueArray, maskArray, offset) {
        var PDU = {
            pdu: "ipv4:IPv4",
            name: "ip_1",
        };
        return PDU;
    },

    XTCFilterToIPv6FilterPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "ipv6:IPv6",
            name: "ip_1",
        };
        return PDU;
    },

    XTCFilterToARPFilterPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "arp:ARP",
            name: "proto_1",
        };

        return PDU;
    },

    XTCFilterToPPPoEDiscoveryFilterPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "pppoe:PPPoEDiscovery",
            name: "proto_1",
        };

        return PDU;
    },

    XTCFilterToPPPoESessionFilterPDU: function (packetHeader, offset, packetLength) {
        var PDU = {
            pdu: "pppoe:PPPoESession",
            name: "proto_1",
        };

        return PDU;
    },

    XTCFilterToEthernetFilterPDU: function (valueArray, maskArray, offset) {
        var PDU = {
            pdu: "ethernet:EthernetII",
            name: "eth1",
            sections: []
        };
        if ((6 + offset) <= maskArray.length) {
            var maskMAC = IEEE_802_1QAddress(maskArray.mid(offset, 6));
            if (maskMAC.ToInt() != 0) {
                var valueString = IEEE_802_1QAddress(valueArray.mid(offset, 6)).ToString();
                PDU.sections.push({
                    type: 'dstMac',
                    filterMinValue: valueString,
                    filterMaxValue: valueString,
                    content: maskMAC.ToString()
                });
            }
            offset += 6;
        }
        if ((6 + offset) <= maskArray.length) {
            var maskMAC = IEEE_802_1QAddress(maskArray.mid(offset, 6));
            if (maskMAC.ToInt() != 0) {
                var valueString = IEEE_802_1QAddress(valueArray.mid(offset, 6)).ToString();
                PDU.sections.push({
                    type: 'srcMac',
                    filterMinValue: valueString,
                    filterMaxValue: valueString,
                    content: maskMAC.ToString()
                });
            }
            offset += 6;
        }

        if ((2 + offset) <= maskArray.length) {
            var etherType = ExtractUnsigned16BitsFromArray(valueArray, offset);
            var etherTypeMask = ExtractUnsigned16BitsFromArray(maskArray, offset);
            offset += 2;
            if ((etherType == 0x88a8) || (etherType == 0x8100)) {
                var subsections = [];
                while ((etherType == 0x88a8) || (etherType == 0x8100)) {
                    var subsection = {
                        type: "Vlan",
                        name: "Vlan",
                        sections: []
                    };

                    if ((2 + offset) <= maskArray.length) {
                        var VLANMask = ExtractUnsigned16BitsFromArray(maskArray, offset);
                        if ((VLANMask & 0xE000) != 0) {
                            var pri = (valueArray[offset] >> 5) & 0x07;
                            subsection.sections.push({
                                type: 'pri',
                                filterMinValue: pri.bin(3, 0),
                                filterMaxValue: pri.bin(3, 0),
                                content: ((VLANMask >> 13) & 0x07).bin(3, 0)
                            });
                        }
                        if ((VLANMask & 0x0FFF) != 0) {
                            var id = ExtractUnsigned16BitsFromArray(valueArray, offset) & 0x0FFF;
                            subsection.sections.push({
                                type: 'id',
                                filterMinValue: id,
                                filterMaxValue: id,
                                content: VLANMask & 0x0FFF
                            });
                        }
                        offset += 2;
                    }
                    subsections.push(subsection);
                    if ((2 + offset) <= maskArray.length) {
                        etherType = ExtractUnsigned16BitsFromArray(valueArray, offset);
                        etherTypeMask = ExtractUnsigned16BitsFromArray(maskArray, offset);
                        offset += 2;
                    } else {
                        etherType = 0x0800;
                    }
                }
                PDU.sections.push({
                    type: 'vlans',
                    name: this.GetXMLAnonSectionName(),
                    sections: subsections
                });
            }
        }
        return PDU;
    },

    FilterPDUSectionToFilterConfig: function (section) {
        var config = "<" + section.type;
        if (section.name != undefined) {
            config += " name=\"" + section.name + "\"";
        }
        if (section.filterMinValue != undefined)
            config += " filterMinValue=\"" + section.filterMinValue + "\"";
        if (section.filterMaxValue != undefined)
            config += " filterMaxValue=\"" + section.filterMinValue + "\"";
        config += ">";
        if (section.content != undefined)
            config += section.content;

        if (section.sections != undefined) {
            for (var i = 0; i < section.sections.length; i++) {
                config += this.FilterPDUSectionToFilterConfig(section.sections[i]);
            }
        }
        config += "</" + section.type + ">";
        return config;
    },

    FilterPDUToFilterConfig: function (PDU) {
        var name = PDU.name;
        if (name == undefined)
            name = "anon_" + (++this.anonIndex);

        var config = "<pdu name=\"" + name + "\" pdu=\"" + PDU.pdu + "\">";

        if (PDU.sections != undefined) {
            for (var i = 0; i < PDU.sections.length; i++) {
                config += this.FilterPDUSectionToFilterConfig(PDU.sections[i]);
            }
        }

        config += "</pdu>";

        if (PDU.next != undefined)
            config += this.FilterPDUToFilterConfig(PDU.next);

        return config;
    },

    ConvertXTCFilterToFilterConfig: function (XTCFilter) {
        var PDU = this.XTCFilterToEthernetFilterPDU(XTCFilter.ethValue, XTCFilter.ethMask, 0);

        var config = "<frame><config><pdus>";
        config += this.FilterPDUToFilterConfig(PDU);
        config += "</pdus></config></frame>";

        return config; //FormatStringToXML(config);
    },

    ProcessXTCFilters: function (testCase) {
        for (var portIdx in testCase) {
            ///Filters
            var port = testCase[portIdx];
            if (port.XTC.filters == undefined)
                continue;
            for (var XTCFilter in port.XTC.filters) {
                ///Only 1 positive condition is supported in STC (no or, no negative, no length)
                if (port.XTC.filters[XTCFilter].positiveConditions.length > 0) {
                    var cond = port.XTC.filters[XTCFilter].positiveConditions[0] & 0xffff;
                    var ethValueArray = new ByteArray();
                    var ethMaskArray = new ByteArray();
                    var ethFilterSize = 0;
                    var condIndex = 0;
                    while (cond != 0) {
                        if (cond & 0x1) {
                            var condition = port.XTC.conditions[condIndex];
                            if ((condition.protocol == "ETHERNET") && (condition.position < 60)) {
                                ///Only Ethernet is supported for now
                                while (ethMaskArray.length < (condition.position + 8)) {
                                    ethMaskArray.push(0);
                                    ethValueArray.push(0);
                                }
                                for (var k = 0; k < condition.mask.length; k += 1) {
                                    if ((ethMaskArray[condition.position + k] == 0) && (condition.mask[k] != 0)) {
                                        ethMaskArray[condition.position + k] = condition.mask[k];
                                        ethValueArray[condition.position + k] = condition.value[k];
                                        ethFilterSize += 1;
                                    }
                                }
                            }
                        }
                        cond = cond >> 1;
                        condIndex++;
                    }
                    port.XTC.filters[XTCFilter].ethValue = ethValueArray;
                    port.XTC.filters[XTCFilter].ethMask = ethMaskArray;
                    port.XTC.filters[XTCFilter].ethFilterSize = ethFilterSize;
                }
            }
            this.CompressXTCFiltersOnPort(port, 8);

            var stream = undefined;
            if (port.XTC.filters.length == 1) {
                ///One filter on this port: applies on all streams
                stream = "all";
            }

            for (var filterIdx = 0; filterIdx < port.XTC.filters.length; filterIdx++) {
                var config = "";
                var name = "dummy_" + this.GetPortIdFromXmlString(port) + filterIdx;
                if (port.XTC.filters[filterIdx] != undefined) {
                    config = this.ConvertXTCFilterToFilterConfig(port.XTC.filters[filterIdx]);
                    name = port.XTC.filters[filterIdx].name;
                }
                for (var k in testCase) {
                    if (k != portIdx) {
                        if (undefined == testCase[k].filters) {
                            testCase[k].filters = [];
                        }
                        testCase[k].filters.push({
                            name: name,
                            config: config,
                            port: portIdx,
                            stream: stream,
                        });
                    }
                }
            }
        }
    },

    LoadXTCConfigFile: function (filename, templateTable) {
        var IPCfg = undefined;
        if (this.stc_eoltIPBase !== undefined) {
            IPCfg = {};
            IPCfg.ports = [];
            IPCfg.ports[0] = {
                base: this.stc_eoltIPBase
            };
            for (var port in this.stc_onuPortsIPBase) {
                IPCfg.ports.push({
                    base: this.stc_onuPortsIPBase[port]
                });
            }
            IPCfg.protocol = 0x11; ///UDP
        }
        var Config = TrafficGenerator.LoadXTCFile(filename, templateTable, IPCfg);

        var lines = Config.split("\n");
        var portNb = -1;
        var portName = undefined;
        var nameRe = new RegExp('"', "g");

        var testCase = {};

        for (var i in lines) {
            /// Modify the config to set the module/port correctly
            var re = new RegExp(";Port:    [0-9]/[0-9]", "g");
            var line = lines[i];
            if (re.test(line)) {
                portNb = Number(line[12]);
                if (portNb == 0)
                    portName = "downstream";
                else {
                    portName = "upstream" + portNb;
                }
                testCase[portName] = {};
                testCase[portName].name = portName;
                testCase[portName].XTC = {};
            } else {
                if (line[0] == ';')
                    continue; ///ignore comments...
                var params = line.split(/(\s+)/); /// split by space
                var index = 0;

                if (params.length < 3)
                    continue;
                if (params[2][0] == '[') ///string index
                {
                    index = parseInt(params[2].substring(1, params[2].length - 1))
                        if (params[0].substring(0, 2) == 'PS') {
                            if (testCase[portName].XTC.streams == undefined) {
                                testCase[portName].XTC.streams = [];
                                testCase[portName].streams = [];
                            }
                            if (testCase[portName].XTC.streams[index] == undefined) {
                                testCase[portName].XTC.streams[index] = {};
                                testCase[portName].XTC.streams[index].enabled = false;
                            }
                        }
                        if (params[0].substring(0, 2) == 'PM') {
                            if (testCase[portName].XTC.conditions == undefined)
                                testCase[portName].XTC.conditions = [];
                            if (testCase[portName].XTC.conditions[index] == undefined)
                                testCase[portName].XTC.conditions[index] = {};
                        }
                        if (params[0].substring(0, 2) == 'PF') {
                            if (testCase[portName].XTC.filters == undefined)
                                testCase[portName].XTC.filters = [];
                            if (testCase[portName].XTC.filters == undefined)
                                testCase[portName].XTC.filters = [];
                            if (testCase[portName].XTC.filters[index] == undefined)
                                testCase[portName].XTC.filters[index] = {};
                        }
                }
                switch (params[0]) {
                case "PS_INDICES":
                    ///ignore
                    break;

                case "PS_ENABLE":
                    if (params[4] == "ON") {
                        testCase[portName].XTC.streams[index].enabled = true;
                    }
                    break;

                case "PS_RATEL2BPS":
                    testCase[portName].XTC.streams[index].rate = parseInt(params[4]);
                    break;

                case "PS_COMMENT":
                    testCase[portName].XTC.streams[index].name = line.wordAt(2).replace(nameRe, '');
                    break;

                case "PF_COMMENT":
                    testCase[portName].XTC.filters[index].name = line.wordAt(2).replace(nameRe, '');
                    break;

                case "PS_HEADERPROTOCOL":
                    //ignore: we will parse from content
                    break;

                case "PS_PACKETHEADER":
                    testCase[portName].XTC.streams[index].packetHeader = new ByteArray(params[4].substring(2, params[4].length));
                    break;

                case "PS_PACKETLENGTH":
                    testCase[portName].XTC.streams[index].length = parseInt(params[6]); ///only care for fixed for now
                    break;

                case "PS_PAYLOAD":
                    ///ignore
                    break;

                case "PS_INSERTFCS":
                    //ignore
                    break;

                case "PS_TPLDID":
                    testCase[portName].XTC.streams[index].tid = parseInt(params[4]);
                    if (testCase[portName].XTC.streams[index].tid < 0)
                        ///Use a valid < 0 number to avoid TID aliasing
                        testCase[portName].XTC.streams[index].tid = -16;
                    break;

                case 'PM_PROTOCOL':
                    testCase[portName].XTC.conditions[index].protocol = params[4];
                    break;

                case 'PM_POSITION':
                    testCase[portName].XTC.conditions[index].position = parseInt(params[4]);
                    break;

                case 'PM_MATCH':
                    testCase[portName].XTC.conditions[index].mask = new ByteArray(params[4].substring(2, params[4].length));
                    testCase[portName].XTC.conditions[index].value = new ByteArray(params[6].substring(2, params[6].length));
                    break;

                case 'PL_LENGTH':
                    ///ignore
                    break;

                case 'PF_CONDITION': {
                        testCase[portName].XTC.filters[index].positiveConditions = [];
                        if (params[4] != '0')
                            testCase[portName].XTC.filters[index].positiveConditions.push(parseInt(params[4]));
                        if (params[8] != '0')
                            testCase[portName].XTC.filters[index].positiveConditions.push(parseInt(params[8]));
                        if (params[12] != '0')
                            testCase[portName].XTC.filters[index].positiveConditions.push(parseInt(params[12]));
                        // Negative conditions are not supported

                    }
                    break;

                case 'PF_ENABLE':
                    testCase[portName].XTC.filters[index].enabled = parseInt(params[4]);
                    break;

                default:
                    break;
                }
            }
        }

        ///now go through config and process it
        for (var port in testCase) {
            ///Streams
            if (testCase[port].XTC.streams == undefined)
                continue;
            for (var streamIdx = 0; streamIdx < testCase[port].XTC.streams.length; streamIdx++) {
                if (testCase[port].XTC.streams[streamIdx] == undefined) {
                    testCase[port].streams["dummy_" + this.GetPortIdFromXmlString(port) + streamIdx] = {
                        name: "dummy_" + this.GetPortIdFromXmlString(port) + streamIdx,
                        tid: -1,
                        length: 1280,
                        config: ""
                    };
                    continue;
                }
                if (testCase[port].XTC.streams[streamIdx].length == undefined)
                    testCase[port].XTC.streams[streamIdx].length = 1280;
                if (testCase[port].XTC.streams[streamIdx].length < (testCase[port].XTC.streams[streamIdx].packetHeader.length + 24))
                    testCase[port].XTC.streams[streamIdx].length = (testCase[port].XTC.streams[streamIdx].packetHeader.length + 24); //space for FCS + STC book-keeping

                testCase[port].streams[testCase[port].XTC.streams[streamIdx].name] = {
                    name: testCase[port].XTC.streams[streamIdx].name,
                    tid: testCase[port].XTC.streams[streamIdx].tid,
                    length: testCase[port].XTC.streams[streamIdx].length,
                    config: this.ConvertPacketHeaderToStreamConfig(testCase[port].XTC.streams[streamIdx].packetHeader, testCase[port].XTC.streams[streamIdx].length)
                };
            }
        }

        this.ProcessXTCFilters(testCase);

        return {
            'testcase': testCase
        };
    },

    ConvertConfigToXML: function (config) {
        var XML = "<?xml version=\"1.0\" ?>\n";
        XML += "<testcase>\n";
        for (var port in config.testcase) {
            XML += "  <port name=\"" + config.testcase[port].name + "\">\n";
            XML += "    <streams>\n";
            for (var stream in config.testcase[port].streams) {
                XML += "      <stream" +
                " name=\"" + config.testcase[port].streams[stream].name + "\"" +
                " length=\"" + config.testcase[port].streams[stream].length + "\"";
                if (config.testcase[port].streams[stream].tid >= 0)
                    XML += " tid=\"" + config.testcase[port].streams[stream].tid + "\"";
                XML += " config=\"" + FormatStringToXML(config.testcase[port].streams[stream].config) + "\"" +
                "/>\n";

            }
            XML += "    </streams>\n";
            XML += "    <filters>\n";
            for (var filter in config.testcase[port].filters) {
                if (config.testcase[port].filters[filter] != undefined) {
                    XML += "      <filter" +
                    " name=\"" + config.testcase[port].filters[filter].name + "\"" +
                    " port=\"" + config.testcase[port].filters[filter].port + "\"";
                    if (config.testcase[port].filters[filter].stream != undefined)
                        XML += " stream=\"" + config.testcase[port].filters[filter].stream + "\"";
                    XML += " config=\"" + FormatStringToXML(config.testcase[port].filters[filter].config) + "\"" +
                    "/>\n";
                } else {
                    XML += "      <filter name=\"" + "dummy_" + filter + "\" config=\"\">\n";
                }
            }
            XML += "    </filters>\n";
            XML += "  </port>\n"
        }

        XML += "</testcase>"
        return XML;
    },

    ConvertXTCToXMLFile: function (xtc, xml, templateTable) {
        var Config = this.LoadXTCConfigFile(xtc, templateTable);
        var XMLString = this.ConvertConfigToXML(Config);

        saveFile(xml, XMLString);
    },

    ///Conversion routine from JSONML to the test configuration object
    FromJSONML: function (JSONMLObject, configObject /* set to undefined at the top*/) {
        if (configObject == undefined) {
            configObject = {};
        }
        if (Array.isArray(JSONMLObject)) {
            var subObject = {};
            var subObjectName = JSONMLObject[0];
            var childIdx = 1;
            if ((!Array.isArray(JSONMLObject[childIdx]) && typeof(JSONMLObject[childIdx]) == 'object')) {
                ///if the first element is an object, not an array, it represents the XML attributes -- pass them as Js object atttribute
                for (var k in JSONMLObject[childIdx]) {
                    subObject[k] = JSONMLObject[childIdx][k];
                    if (k == 'name') ///this will be used to differentiate object of the same type, stored as array element in JSONML, and as object attribute in the test configuration object
                        subObjectName = JSONMLObject[0] + ':' + JSONMLObject[childIdx][k];
                }
                childIdx = 2;
            }
            ///Transform array into object, essentially
            configObject[subObjectName] = subObject;
            for (childIdx; childIdx < JSONMLObject.length; childIdx++) {
                if (Array.isArray(JSONMLObject[childIdx])) {
                    this.FromJSONML(JSONMLObject[childIdx], configObject[subObjectName]);
                } else {
                    ///simple element, name value pair --ought not to happen with the subset of XML used
                    configObject[subObjectName] = JSONMLObject[childIdx];
                    break;
                }
            }
        }
        return configObject;
    },

    IPAddressReplace: function (config, addressBaseString, addressBase) {
        var IPAddressIndex = 0;
        var IPAddressAsInt = IPv4Address(addressBase).ToInt();
        while (config.indexOf(addressBaseString) != -1) {
            logInfo("Replacing " + '@' + addressBaseString + IPAddressIndex + '@' + " with " + IPv4Address(IPAddressAsInt).ToString());
            var r = new RegExp('@' + addressBaseString + IPAddressIndex + '@', "g");
            config = config.replace(r, IPv4Address(IPAddressAsInt).ToString());
            IPAddressIndex++;
            IPAddressAsInt++;
        }
        return config;
    },

    /** Load a configuration file
     */
    LoadXMLConfigFile: function (filename, templateTable) {
        var Config = readFile(filename + ".xml").toLatin1String();
        if (Config == null || Config.length == 0) {
            TrafficGenerator.logWarning("STC::LoadXMLConfigFile::Unable to read the configuration file " + filename);
            return undefined;
        }
        TrafficGenerator.logInfo("STC config file generation");
        /// Foreach templateTable entry
        for (var i in templateTable) {
            var entry = templateTable[i];
            /// Replace all occurrence of entry with value
            var e = entry[0].replace('<', '@').replace('>', '@');
            var eName = e.replace('@', '').replace('@', ''); ///Bug in interpretor. Should only be done once
            var r = new RegExp(e, "g");

            var value = TrafficGenerator.GetStringFromTemplateEntry(entry);
            TrafficGenerator.logInfo('Replacing ' + entry[0].replace('<', '').replace('>', '') + ' by 0x' + value);
            /// Specific case of MAC address that need a ':' separator
            if (e.indexOf("MAC") != -1) {
                value = '' + value[0] + value[1] +
                    ':' + value[2] + value[3] +
                    ':' + value[4] + value[5] +
                    ':' + value[6] + value[7] +
                    ':' + value[8] + value[9] +
                    ':' + value[10] + value[11];
                //value = "00:00:00:00" +
                //        ':' + value[8] + value[9] +
                //        ':' + value[10]+ value[11];
                /// Replace MASK value in the source

                var maskMatch = "@MASK_" + eName + "@";
                //var value = "FF:FF:FF:FF:FF:FF";
                var maskValue = "00:00:00:00:FF:FF";
                var maskReg = new RegExp(maskMatch, "g")
                    Config = Config.replace(maskReg, maskValue);
            } else if ((e.indexOf("bit") != -1) || (e.indexOf("Bit") != -1)) {
                /// Specific case of PBits value that need to be binary value
                value = (entry[1] >> 1).bin(3, 0);
            } else if (e.indexOf("VID") != -1) {

                /// Specific case of VID value that need to be decimal value
                value = entry[1].dec();
            } else if (e.indexOf("IP") != -1) {
                var IP = IPv4Address(entry[1]);
                value = IP.toString();
            }
            Config = Config.replace(r, value);
        }
        ///Now replace default IPs automatically
        if (this.stc_eoltIPBase != undefined) {
            Config = this.IPAddressReplace(Config, "IP_WAN", this.stc_eoltIPBase);
        }
        if (Array.isArray(this.stc_onuPortsIPBase)) {
            for (var ONUPortIndex = 0; ONUPortIndex < this.stc_onuPortsIPBase.length; ONUPortIndex++) {
                Config = this.IPAddressReplace(Config, "IP_LAN" + ONUPortIndex + "_", this.stc_onuPortsIPBase[ONUPortIndex]);
            }
        }

        var JSONMLCfg = convXmlToObject(Config);

        return this.FromJSONML(JSONMLCfg);
    },

    LoadConfigFile: function (filename, templateTable) {
        var config = undefined;
        try {
            config = this.LoadXMLConfigFile(filename, templateTable);
        } catch (e) {}
        if (config == undefined)
            config = this.LoadXTCConfigFile(filename, templateTable);

        if (undefined == config) {
            TrafficGenerator.logError("Unable to read the configuration file " + filename);
            return config;
        }

        if (this.backup != undefined) {
            var XMLString = this.ConvertConfigToXML(config);
            saveFile(this.backup, XMLString);
        }

        return config;
    },

    ParseStream: function (expectedTID, streamIdx, port, stream, xml) {
        var streamTID = expectedTID;
        var portIdx = this.GetPortIdFromXmlString(port);
        if (xml.testcase[port].streams[stream].tid != undefined)
            streamTID = parseInt(xml.testcase[port].streams[stream].tid);

        this.RegisterStream(streamIdx, streamTID, xml.testcase[port].streams[stream].name, portIdx, xml.testcase[port].streams[stream].length, xml.testcase[port].streams[stream].config, xml.testcase[port].streams[stream].nb, xml.testcase[port].streams[stream].repeat);

        TrafficGenerator.logInfo("this is handle " + this.streams[portIdx][streamIdx].handle + " for stream: " + this.streams[portIdx][streamIdx].name + "(port=" + portIdx + ", idx= " + streamIdx + "," + "TID=" + this.streams[portIdx][streamIdx].tid + ")");
        //look for a filter, load the configuration, but do not create it

        var filterIdx = []; ///Per port
        for (var i = 0; i < this.ports.length; i++)
            filterIdx[i] = 0;

        for (var filter in xml.testcase[port].filters) {
            var filterName = xml.testcase[port].filters[filter].name;
            var applyFilterToStream = false;
            if ((xml.testcase[port].filters[filter].stream == "all") || ///if filter apply to all
                (xml.testcase[port].streams[stream].name.indexOf(filterName) == 0) || ///or the name of the stream starts with the filter name
                ((xml.testcase[port].filters[filter].stream != undefined) && ///or the name of the stream is present in the filter stream attribute
                    (xml.testcase[port].filters[filter].stream.indexOf(xml.testcase[port].streams[stream].name) >= 0)))
                applyFilterToStream = true;

            var filterPort = this.GetPortIdFromXmlString(xml.testcase[port].filters[filter].port);
            if (applyFilterToStream) {
                TrafficGenerator.logInfo("New filter found " + filterName + " on port " + xml.testcase[port].filters[filter].port);
                if (this.streamNameToFilterConfig == undefined)
                    this.streamNameToFilterConfig = {};
                if (this.streamNameToFilterConfig[xml.testcase[port].streams[stream].name] == undefined)
                    this.streamNameToFilterConfig[xml.testcase[port].streams[stream].name] = [];
                this.streamNameToFilterConfig[xml.testcase[port].streams[stream].name][filterIdx[filterPort]] = xml.testcase[port].filters[filter];
                TrafficGenerator.logInfo("Associating filter " + filterName + "/" + filterIdx[filterPort] + " to " + xml.testcase[port].streams[stream].name);
            }
            filterIdx[filterPort] = filterIdx[filterPort] + 1;
        }

        return streamTID;

    },

    ParsePort: function (port, xml, streamTID) {
        TrafficGenerator.logInfo("Parsing configuration for port " + port);
        /// Parsing streams
        var streamIdx = 0; // idx is valid for one port
        for (var stream in xml.testcase[port].streams) {
            TrafficGenerator.logInfo("New stream found " + stream);
            streamTID = this.ParseStream(streamTID, streamIdx, port, stream, xml);
            streamIdx = streamIdx + 1;
            streamTID = streamTID + 1;
        }
        for (var modifier in xml.testcase[port].modifiers) {
            if (this.modifiers == undefined)
                this.modifiers = {};
            this.modifiers[modifier.stream] = modifier;
        }
    },

    /** Send a xml config
     */
    SendConfig: function (xml) {

        if (!this.socket || !this.socket.isConnected())
            this.onError("SendConfig: Error the STC is not connected");
        /// For each port
        var streamTID = 1; // TID is common to all ports
        /// upstream then downstream ports (for stream TID ordering)
        for (var port in xml.testcase) {
            if (xml.testcase[port].name.substring(0, 8) != "upstream")
                continue;
            this.ParsePort(port, xml, streamTID);
        }

        for (var port in xml.testcase) {
            if (xml.testcase[port].name.substring(0, 10) != "downstream")
                continue;
            this.ParsePort(port, xml, streamTID);
        }

        /// Subscribe to results
        this.StcSubscribeToResult();
        for (var port in this.ports) {
            this.StcSubscribeToFilter(this.ports[port].handle);
        }

        /// Apply
        this.StcApply();
        return xml;
    },

    /** Send a template xml config (replace all template with associated value according to the replace table)
     */
    SendTemplateConfig: function (templateFile, templateTable) {
        /// Read inputFilename
        var xml = this.LoadConfigFile((this.filePath + templateFile), templateTable);
        if (!xml) {
            TrafficGenerator.logError("Unable to read the configuation file " + templateFile);
            return undefined;
        }

        /// Send the configuration
        this.SendConfig(xml);
        /// Disable all streams
        for (var port in xml.testcase) {
            var portIdx = this.GetPortIdFromXmlString(port);
            if (portIdx != undefined) {
                this.StopTrafficOnPort(portIdx);
                for (var stream in xml.testcase[port].streams) {
                    var streamName = xml.testcase[port].streams[stream].name;
                    if (xml.testcase[port].streams[stream].enabled)
                        this.EnableStreamOnPort(this.streamNameToIdx[streamName], portIdx);
                    else
                        this.DisableStreamOnPort(this.streamNameToIdx[streamName], portIdx);

                }
            }
        }
        return xml;
    },

    /** Send a template xml STC configuration (replace all template with associated value according to the replace table) and start generation automatically
     */
    SendTemplateConfigAndDoTest: function (templateFile, templateTable, gemTable) {
        /// Send the template configuration with replacement
        var xml = this.SendTemplateConfig(templateFile, templateTable);
        if (xml == undefined) {
            TrafficGenerator.logError("Unable to send the configuation file " + templateFile);
            return undefined;
        }
        var shadowEnableFilter = this.enableFilter;
        if (this.enableFilter == undefined)
            this.enableFilter = true;
        var result = {};

        /// Wait for the ONU
        sleep(this.delayBeforeTraffic);
        /// For each port
        for (var port in xml.testcase) {
            var portName = xml.testcase[port].name;
            var portIdx = this.GetPortIdFromXmlString(portName);
            if (portIdx == undefined)
                continue;
            TrafficGenerator.logInfo("");
            TrafficGenerator.logInfo("********");
            TrafficGenerator.logInfo("Treating Port:" + portName);
            /// For each stream
            for (var stream in xml.testcase[port].streams) {
                var streamName = xml.testcase[port].streams[stream].name;
                var streamIdx = this.streamNameToIdx[streamName];
                /// Enable the stream
                this.EnableStreamOnPort(streamIdx, portIdx);
                /// Clear all stats
                for (var i = 0; i < this.ports.length; i++) {
                    this.ClearTransmitStatsOnPort(i);
                    this.ClearReceiveStatsOnPort(i);
                }
                TrafficGenerator.logInfo("****");
                TrafficGenerator.logInfo("Starting stream: " + streamName);
                /// Limit the number of packet to send and bit rate to 1% the physical media speed
                this.StcConfigGenerator(this.GetGeneratorHandle(portIdx), this.nbOfPacketToSend, this.lineRate);
                /// Set translation table if asked
                if ((gemTable != undefined) && (TrafficGenerator.GEMTranslationMode != 'ignore')) {
                    delAllTranslationRules();
                    TrafficGenerator.ApplyGEMTranslationRules(portIdx, streamName, gemTable);
                }

                this.StcApply();

                /// Send the stream
                this.StartTrafficOnPort(portIdx, this.nbOfPacketToSend);

                /// Wait for end of generation (timeout 10 seconds)
                sleep(this.sendTimeOut);

                /// Stop traffic
                this.StopTrafficOnPort(portIdx);

                sleep(this.delayAfterSend);
                /// Refresh stats and disable
                this.RefreshStatsOnPort(streamIdx, portIdx);
                this.DisableStreamOnPort(streamIdx, portIdx);

                /// Add info to user
                TrafficGenerator.logInfo("\tSent on " + streamName + ": " + this.GetTransmitStatsOnPortAndStream(portIdx, streamIdx) + " Packet(s)");
                result[streamName] = {};
                /// Show the stats for each filter
                if (this.streamNameToFilterConfig[streamName] != undefined) {
                    for (var filterIdx in this.streamNameToFilterConfig[streamName]) {
                        var filterName = this.streamNameToFilterConfig[streamName][filterIdx].name;
                        TrafficGenerator.logInfo(" filterName " + filterName);
                        var filterPort = this.GetPortIdFromXmlString(this.streamNameToFilterConfig[streamName][filterIdx].port);
                        var nbOfRcvd = this.GetReceivedStatsOnPortAndFilter(filterPort, filterName);
                        result[streamName][filterName] = nbOfRcvd;
                        TrafficGenerator.logInfo("  Received on Port " + filterPort + ":" + filterName + ": " + nbOfRcvd + " Packet(s)");
                        if (this.filter[this.GetAnalyzerHandle(filterPort)] != undefined) {
                            this.StcDeleteHandle(this.filter[this.GetAnalyzerHandle(filterPort)][filterName]);
                            this.filter[this.GetAnalyzerHandle(filterPort)][filterName] = undefined;
                        }
                    }
                    this.ClearFilterForStream(streamName);
                }
                var stat_tid = this.streamNameToTID[streamName];
                if ((stat_tid != undefined) && (stat_tid >= 0)) {
                    for (var i = 0; i < this.ports.length; i++) {
                        if (i == portIdx)
                            continue;
                        // Use getTotalReceiveStats: TID works within
                        // the filter frame so that it is useless to detect
                        // unformatted traffic. As Each stream is processed
                        // sequentially, and stats being cleared between runs,
                        // when a filter is applied, just get the total number
                        // of rx-ed packet on the port
                        var nbOfRcvd = this.GetTotalReceiveStatsOnPort(i);
                        TrafficGenerator.logInfo("  Received on Port " + i + ": " + nbOfRcvd + " Packet(s)");
                        if ((!this.enableFilter) || this.ignoreParasiteTraffic) {
                            ///when filtering is not used, or the ONU may generate traffic which will contaminate the stats,
                            ///use TID based rx counter, and overwrite nbOfRcvd with it
                            nbOfRcvd = this.GetReceivedStatsOnPortAndTID(i, stat_tid);
                            TrafficGenerator.logInfo("  Received on Port " + i + "): TID " + (stat_tid) + ":" + i + " : " + nbOfRcvd + " Packet(s)");
                        }
                        result[streamName]["TID " + (stat_tid) + ":" + i] = nbOfRcvd;
                    }
                } else {
                    TrafficGenerator.logInfo("TID for " + streamName);
                }
            }
        }
        this.enableFilter = shadowEnableFilter;

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
                    if (result[stream][r] == undefined) { ///Add again when TID is working
                        //TrafficGenerator.logWarning("No statistics for rule " + stream + ":" + r);
                    } else {
                        if (((rule[r] > 0) && (result[stream][r] < (rule[r] - TrafficGenerator.toleranceInFrame))) ||
                            ((rule[r] == 0) && (result[stream][r] > 0))) {
                            verdict = false;
                            TrafficGenerator.logError("Filter " + r + " on Stream " + stream + " is expected to received " + rule[r] + " packet(s) and received " + result[stream][r] + " packet(s)");
                        } else {
                            if (result[stream][r] == rule[r]) {
                                TrafficGenerator.logInfo("Filter " + r + " has correctly received " + result[stream][r] + " packet(s)");
                            } else {
                                TrafficGenerator.logWarning("Filter " + r + " has received " + result[stream][r] + " packet(s), expected " + rule[r] + " frames (result is acceptable)");
                            }
                        }
                    }
                }
            }
        }
        return verdict;
    },

    /// Internal functions used to facilitate work with STC proxy
    ReadResult: function () {
        this.socket.waitForReadyRead(this.timeout);
        var res = this.socket.readAllData();
        res = res.substring(0, res.length - 2);
        return res;
    },

    GetPortHandle: function (port) {
        if (port in this.ports)
            return this.ports[port].handle;
        return undefined;
    },

    GetPortIdFromXmlString: function (port) {
        if (port == "port:downstream")
            return 0;
        if (port == "port:upstream1")
            return 1;
        if ((port == "port:upstream2") && (this.stc_onuPorts.length > 1))
            return 2;
        if (port == "downstream")
            return 0;
        if (port == "upstream1")
            return 1;
        if ((port == "upstream2") && (this.stc_onuPorts.length > 1))
            return 2;
        return undefined;
    },

    GetPortNameFromId: function (port) {
        if (port == 0)
            return "downstream";
        return "upstream" + port;
    },

    GetPortHandleFromXmlString: function (port) {
        return this.GetPortHandle(this.GetPortIdFromXmlString(port));
    },

    GetGeneratorHandle: function (port) {
        if (port in this.ports)
            return this.ports[port].generator;
        return undefined;
    },

    GetGeneratorHandleFromXmlString: function (port) {
        return this.GetGeneratorHandle(this.GetPortIdFromXmlString(port));
    },

    GetAnalyzerHandle: function (port) {
        if (port in this.ports)
            return this.ports[port].analyzer;
        return undefined;
    },

    GetAnalyzerHandleFromXmlString: function (port) {
        return this.GetAnalyzerHandle(this.GetPortIdFromXmlString(port));
    },

    CreateStream: function () {
        var stream = {
            handle: undefined,
            rate: undefined,
            packetNb: undefined,
            packetRepeat: undefined,
            len: undefined,
            name: undefined,
            tid: undefined,
            enabled: undefined
        };
        return stream;
    },

    RegisterStream: function (streamIdx, streamTID, streamName, port, frameLen, frameConfig, nb, repeat) {
        TrafficGenerator.logInfo("Registering new stream " + streamName);
        var streamHandle = this.StcCreateStream(this.ports[port].handle, frameLen, frameConfig, streamName);

        if (this.streams[port] == undefined)
            this.streams[port] = [];
        if (this.streams[port][streamIdx] == undefined)
            this.streams[port][streamIdx] = this.CreateStream();
        this.streamNameToIdx[streamName] = streamIdx;
        this.streamNameToPort[streamName] = port;
        this.streams[port][streamIdx].name = streamName;
        this.streams[port][streamIdx].tid = streamTID;
        this.streamNameToTID[streamName] = streamTID;
        this.streamTIDToName[streamTID] = streamName;
        this.streams[port][streamIdx].handle = streamHandle;
        this.streams[port][streamIdx].rate = this.lineRate;
        if (nb == undefined)
            this.streams[port][streamIdx].packetNb = 0;
        else
            this.streams[port][streamIdx].packetNb = nb;
        this.streams[port][streamIdx].len = frameLen;
        this.streams[port][streamIdx].enabled = false;
        if (repeat == undefined)
            this.streams[port][streamIdx].packetRepeat = 1;
        else
            this.streams[port][streamIdx].packetRepeat = repeat;
    },

    StcCreateStream: function (port, frameLen, frameConfig, streamName) {

        this.socket.write('NEW_STREAM ' + port + ' ' + frameLen + " '" + frameConfig + "' '" + streamName + "'\r\n");
        return this.ReadResult();
    },

    StcCreateFilter: function (filterName, analyzer, filterConfig) {
        this.socket.write('NEW_FILTER ' + analyzer + " '" + filterName + "' '" + filterConfig + "'\r\n");
        return this.ReadResult();
    },

    StcConfigGenerator: function (port, nbTotalFrame, rate) {
        this.socket.write('CONFIG_GENERATOR ' + port + ' ' + nbTotalFrame + ' ' + rate + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to config the generator on STC");
        this.socket.readAllData();
    },

    StcSubscribeToResult: function () {
        TrafficGenerator.logInfo("Subscribing to result");
        this.socket.write('SUBSCRIBE_RESULT ' + this.project + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to subscribe to result on STC");
        this.socket.readAllData();
    },

    StcSubscribeToFilter: function (port) {
        TrafficGenerator.logInfo("Subscribing to filter on " + port);
        this.socket.write('SUBSCRIBE_FILTER ' + this.project + ' ' + port + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to subscribe to filter on STC");
        this.socket.readAllData();
    },

    StcGetState: function (analyzerOrGenerator) {
        this.socket.write('GET_STATE ' + analyzerOrGenerator + '\r\n');
        return this.ReadResult();
    },

    StcApply: function () {
        this.socket.write('APPLY\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to apply setting up STC");
        this.socket.readAllData();

        sleep(this.delayBeforeSend);
    },

    StcSetupPhy: function () {
        TrafficGenerator.logInfo("Setting up STC Physical interfaces");
        this.socket.write('SETUP_PHY\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to setting up STC");
        this.socket.readAllData();
    },

    StcGetGenerator: function (port) {
        this.socket.write('GET_GENERATOR ' + port + '\r\n');
        return this.ReadResult();
    },

    StcGetAnalyzer: function (port) {
        this.socket.write('GET_ANALYZER ' + port + '\r\n');
        return this.ReadResult();
    },

    StcReservePort: function (ipAddress, slot, port) {
        TrafficGenerator.logInfo("Reserving STC port " + ipAddress + '/' + slot + '/' + port);
        this.socket.write('RESERVE ' + ipAddress + '/' + slot + '/' + port + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to reserve port " + ipAddress + '/' + slot + '/' + port + " on STC");
        this.socket.readAllData();
    },

    StcReleasePort: function (ipAddress, slot, port) {
        TrafficGenerator.logInfo("Releasing STC port " + ipAddress + '/' + slot + '/' + port);
        this.socket.write('RELEASE ' + ipAddress + '/' + slot + '/' + port + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to release port " + ipAddress + '/' + slot + '/' + port + " on STC");
        this.socket.readAllData();
    },

    StcConnect: function (ipAddress) {
        TrafficGenerator.logInfo("Connecting to STC at " + ipAddress);
        this.socket.write('CONNECT ' + ipAddress + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to connect on STC at " + ipAddress);
        this.socket.readAllData();
    },

    StcDisconnect: function (ipAddress) {
        TrafficGenerator.logInfo("Disconnecting from STC at " + ipAddress);
        this.socket.write('DISCONNECT ' + ipAddress + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to disconnect on STC at " + ipAddress);
        this.socket.readAllData();
    },

    StcNewProject: function () {
        TrafficGenerator.logInfo("Creating new STC project");
        this.socket.write('NEW_PROJECT\r\n');
        return this.ReadResult();
    },

    StcDelProject: function (project) {
        TrafficGenerator.logInfo("Deleting STC project");
        this.socket.write('DEL_PROJECT ' + project + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to delete project " + project + "on STC");
        this.socket.readAllData();
    },

    StcNewPort: function (project, ipAddress, slot, port) {
        TrafficGenerator.logInfo("Creating new port " + ipAddress + '/' + slot + '/' + port);
        this.socket.write('NEW_PORT ' + project + ' ' + ipAddress + '/' + slot + '/' + port + '\r\n');
        return this.ReadResult();
    },

    StcNewPhy: function (port) {
        TrafficGenerator.logInfo("Creating new physical interface on " + port);
        this.socket.write('NEW_PHY ' + port + '\r\n');
        return this.ReadResult();
    },

    StcGetPhySpeed: function (port) {
        TrafficGenerator.logInfo("Getting physical speed on " + port);
        this.socket.write('GET_PHY_SPEED ' + port + '\r\n');
        var speed = this.ReadResult();
        TrafficGenerator.logInfo("PHY speed for " + port + ": " + speed);
        return speed;
    },

    StcResetProxy: function () {
        TrafficGenerator.logInfo("Resetting STC proxy");
        this.socket.write('RESET\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to reset STC proxy");
        this.socket.readAllData();
    },

    StcFlushStream: function () {
        this.socket.write(' \r\n');
        this.socket.write(' \r\n');
        this.socket.write(' \r\n');
        sleep(500);
        this.socket.readAllData();
        this.socket.readAllData();
    },

    StcStartAnalyzer: function (analyzer) {
        TrafficGenerator.logInfo("Starting analyzer " + analyzer);
        this.socket.write('START_ANALYZER ' + analyzer + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to start analyzer " + analyzer);
        this.socket.readAllData();
    },

    StcStopAnalyzer: function (analyzer) {
        TrafficGenerator.logInfo("Stopping analyzer " + analyzer);
        this.socket.write('STOP_ANALYZER ' + analyzer + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to stop analyzer " + analyzer);
        this.socket.readAllData();
    },

    StcStartGenerator: function (generator) {
        TrafficGenerator.logInfo("Starting generator " + generator);
        this.socket.write('START_GENERATOR ' + generator + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to start generator " + generator);
        this.socket.readAllData();
    },

    StcStopGenerator: function (generator) {
        TrafficGenerator.logInfo("Stopping generator " + generator);
        this.socket.write('STOP_GENERATOR ' + generator + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to stop generator " + generator);
        this.socket.readAllData();
    },

    StcStartStream: function (stream) {
        TrafficGenerator.logInfo("Starting stream " + stream);
        this.socket.write('START_STREAM ' + stream + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to start stream " + stream);
        this.socket.readAllData();
    },

    StcStopStream: function (stream) {
        TrafficGenerator.logInfo("Stopping stream " + stream);
        this.socket.write('STOP_STREAM ' + stream + '\r\n');
        if (this.socket.waitForData('OK', this.timeout) == false)
            this.onError("Unable to stop stream " + stream);
        this.socket.readAllData();
    },

    StcGetRxTotalFrame: function (analyzer) {
        TrafficGenerator.logInfo("Getting total RX frame on " + analyzer);
        this.socket.write('GET_STAT_TOTAL_RX ' + analyzer + '\r\n');
        return this.ReadResult();
    },

    StcGetRxSigFrame: function (analyzer) {
        TrafficGenerator.logInfo("Getting signature RX frame on " + analyzer);
        this.socket.write('GET_STAT_SIG_RX ' + analyzer + '\r\n');
        return this.ReadResult();
    },

    StcGetTxTotalFrame: function (generator) {
        TrafficGenerator.logInfo("Getting total TX frame on " + generator);
        this.socket.write('GET_STAT_TOTAL_TX ' + generator + '\r\n');
        return this.ReadResult();
    },

    StcGetTxSigFrame: function (generator) {
        TrafficGenerator.logInfo("Getting signature TX frame on " + generator);
        this.socket.write('GET_STAT_SIG_TX ' + generator + '\r\n');
        return this.ReadResult();
    },

    StcGetRxStream: function (stream) {
        TrafficGenerator.logInfo("Getting total RX frame on " + stream);
        this.socket.write('GET_STAT_RX_STREAM ' + stream + '\r\n');
        return this.ReadResult();
    },

    StcGetTxStream: function (stream) {
        TrafficGenerator.logInfo("Getting total TX frame on " + stream);
        this.socket.write('GET_STAT_TX_STREAM ' + stream + '\r\n');
        return this.ReadResult();
    },

    StcGetFilterStat: function (port) {
        //Only returns the last result: works if there is one filter and one stream
        TrafficGenerator.logInfo("Getting filter stats on " + port);
        this.socket.write('GET_STAT_FILTER ' + port + '\r\n');
        return this.ReadResult();
    },

    StcGetFilterStatTID: function (port, stream) {
        TrafficGenerator.logInfo("Getting filter stats on " + port + " for stream tid " + stream);
        this.socket.write('GET_STAT_IDX ' + port + ' ' + stream + '\r\n');
        return this.ReadResult();
    },

    StcRefreshResults: function (handle) {
        this.socket.write('REFRESH_RESULT ' + handle + '\r\n');
        return this.ReadResult();
    },

    StcActivateStream: function (stream) {
        this.socket.write('ACTIVATE_STREAM ' + stream + '\r\n');
        return this.ReadResult();
    },

    StcDeactivateStream: function (stream) {
        this.socket.write('DEACTIVATE_STREAM ' + stream + '\r\n');
        return this.ReadResult();
    },

    StcDeleteHandle: function (handle) {
        this.socket.write('DEL_HANDLE ' + handle + '\r\n');
        return this.ReadResult();
    },

    StcSendFrame: function (port, nb, frame, frame_header) {
        this.socket.write('SEND_FRAME ' + port + ' ' + frame.length + ' ' + nb + " '" + frame + "' '" + frame_header + "'\r\n");
        return this.ReadResult();
    },

    StcClearStatPort: function (port) {
        this.socket.write('CLEAR_STAT_PORT ' + port + '\r\n');
        return this.ReadResult();
    },

    StcCreateRangeModifier: function (stream, offset, mask, method, repeat) {
        TrafficGenerator.logWarning("Support for modifiers not implemented in STC");
        return 0;

        var m = "DECR";
        switch (method) {
        case "DEC":
            m = "DECR";
            break;
        case "INC":
            m = "INCR";
            break;
        }
        this.socket.write('CREATE_RANGE_MODIFIER ' + stream + ' ' + offset + ' ' + mask + ' ' + m + ' ' + repeat + '\r\n');
        return this.ReadResult();
    },

    StcConfigRangeModifier: function (modifier, offset, mask, method, repeat) {
        TrafficGenerator.logWarning("Support for modifiers not implemented in STC");
        return 0;

        var m = "DECR";
        switch (method) {
        case "DEC":
            m = "DECR";
            break;
        case "INC":
            m = "INCR";
            break;
        }
        this.socket.write('SET_RANGE_MODIFIER ' + modifier + ' ' + offset + ' ' + mask + ' ' + m + ' ' + repeat + '\r\n');
        return this.ReadResult();
    },

    StcSetStreamRate: function (stream, rate) {
        var kRate = Math.round(rate / 1000);
        if (kRate == 0)
            kRate = 1;
        this.socket.write('SET_STREAM_RATE ' + stream + ' ' + kRate + '\r\n');
        return this.ReadResult();
    },

    ConnectToProxy: function () {
        /// Close current connection
        if (this.socket && this.socket.isConnected()) {
            this.Disconnect();
        }
        /// Open a new connection
        this.socket = new Socket();
        if (this.socket.connectToHost(this.proxyAddress, this.proxyPort, this.timeout) == false)
            TrafficGenerator.testFailed("Unable to connect to STC Proxy (" + this.proxyAddress + ":" + this.proxyPort + ")");
        /// Flush the stream
        this.StcFlushStream();
    },

    onError: function (msg) {
        this.Disconnect();
        TrafficGenerator.testFailed(msg);
    }
};
