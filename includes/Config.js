////////////////////////////////////////////////////////////
// Copyright (c) 2011, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
include("MT2Version.js");
include("PowerPlug.js");
include("Automatisation.js");
include("Number.js");
include("String.js");
include("Object.js");
include("PLOAM.js");
include("XPLOAM.js");
include("PLOAMMapper.js");
include("OMCI.js");
include("Utils.js");
include("TrafficGenerator.js");
include("Tolerance.js");
include("ONU.js");
include("IEEE_802_1Q.js");
include("IP.js");
include("IGMP.js");
include("CSV.js");
include("Counters.js");

/// MT2 eOLT-GPON General Configuration file

/// ///////////////////
/// PLOAM configuration
/// ///////////////////
ApplyGlobalPrevalence(["AutomatisationParameters"], [
    /// Timeout: Default timeout for PLOAM ONU response (2000ms)
    {
        name: "Timout",
        nameAtSrc: "ploam_Timeout",
        defaultValue: 2000,
        dsts: ["PLOAM", "XPLOAM"]
    }
]);

/// //////////////////
/// OMCI configuration
/// //////////////////
ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// OMCI type
        {
            name: "Type",
            nameAtSrc: "omci_Type",
            defaultValue: "Baseline", //"Extended"
            dsts: "OMCI"
        },
        /// Timeout: Default timeout for OMCI ONU response (2000ms)
        {
            name: "Timeout",
            nameAtSrc: "omci_Timeout",
            defaultValue: 2000,
            dsts: "OMCI"
        },
        /// NbOfRepeat: Number of message repetition before declaring error
        {
            name: "NbOfRepeat",
            nameAtSrc: "omci_NbOfRepeat",
            defaultValue: 3,
            dsts: "OMCI"
        },
        /// MibConsistencyCheck: Flag indicating if MIB consistency check has to be done --SET TO 1 FOR BBF.247 Testing
        {
            name: "MibConsistencyCheck",
            defaultValue: 1,
            dsts: "OMCI"
        },
        /// Flag indicating the log level for MIB consistency issues
        /// >= 3: test is failed
        /// 2: an error is signaled in the log
        /// 1: a warning is signaled in the log
        /// 0: an info is signaled in the log
        /// SET TO 3 FOR BBF.247 Testing
        {
            name: "MibConsistencyLogLevel",
            defaultValue: 3,
            dsts: "OMCI"
        }
    ],
    false, true);

/// //////////////////
/// ONU type
/// //////////////////
ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// defaultONUType: default ONU Type (RG/L2)
        {
            name: "defaultONUType",
            defaultValue: "L2" //"RG"
        },
        /// defaultOMCITerminationPoint: specify the OMCI hand-off entity type
        {
            name: "defaultOMCITerminationPoint",
            defaultValue: "PPTPEthernetUni" //"VEIP"
        },
        /// upstreamFEC -- whether FEC is applied to the ONU (upstream)
        {
            name: "upstreamFEC",
            defaultValue: 0
        },
        /// serialNumber -- ONU serial number used in test
        {
            name: "serialNumber",
            defaultValue: []
        },
    ],
    false, true);

/// ///////////////////////////////
/// Traffic Generator configuration
/// These will take precedence over specific traffic generator settings
/// ///////////////////////////////
ApplyGlobalPrevalence(["AutomatisationParameters"], [
    /// activateAutomatisation: Activate the traffic generation automatisation if set to 1
    {
        name: "activateAutomatisation",
        defaultValue: 1,
        dsts: "TrafficGenerator"
    }
], false, true);
if (TrafficGenerator.activateAutomatisation) {
    ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// driver: Use "STC" driver (or "Xena" driver, or "PCAP" for internal pcap based driver)
        {
            name: "driver",
            defaultValue: "STC",
            dsts: "TrafficGenerator"
        }
    ], true, true);

    if (TrafficGenerator.driver == 'PCAP')
        include('pcap.js');
    else if (TrafficGenerator.driver == 'Xena')
        include("Xena/xena.js");
    else if (TrafficGenerator.driver == 'STC')
        include("STC/STC.js");

    ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// nbOfPacketToSend: Nb of packet to send in automatisation
        {
            name: "nbOfPacketToSend",
            defaultValue: 100,
            dsts: ["TrafficGenerator", "Xena", "STC", "PCAP"]
        },
        /// delayBeforeTraffic: Delay before sending the traffic (in ms)
        {
            name: "delayBeforeTraffic",
            defaultValue: 10000,
            dsts: ["TrafficGenerator", "Xena", "STC", "PCAP"]
        },
        /// delayBeforeSend: Delay before sending each traffic in automatic traffic generation (in ms)
        {
            name: "delayBeforeSend",
            defaultValue: 200,
            dsts: ["TrafficGenerator", "Xena", "STC", "PCAP"]
        },
        /// delayAfterSend: Delay after sending traffic -- to allow enough time for buffer to be empties, statistical computation,...
        {
            name: "delayAfterSend",
            defaultValue: 600,
            dsts: ["TrafficGenerator", "Xena", "STC", "PCAP"]
        },
        ///filePath: if defined, must be "\" terminated, and all '\' caracters must be escaped properly
        ///e.g. "C:\\absolute\\path\\to\\trafic\\"
        ///e.g. "path\\relative\\to\\traffic\\" (relative to, by order of decreasing priority, the current js file folder, the scripts/includes/, the scripts/ and application folders)
        {
            name: "filePath",
            defaultValue: "",
            dsts: ["TrafficGenerator", "Xena", "STC", "PCAP"]
        },
    ], true, true);

    if (TrafficGenerator.driver == "Xena") {
        /// //////////////////
        /// Xena configuration
        /// //////////////////
        ApplyGlobalPrevalence(["AutomatisationParameters"], [
            /// ipAddress: Xena IP Address
            {
                name: "ipAddress",
                defaultValue: "192.168.1.13",
                dsts: "Xena"
            },
            /// ipPort Xena IP Port
            {
                name: "ipPort",
                defaultValue: 22611,
                dsts: "Xena"
            },
            /// timeout: Xena response timeout (1000ms)
            {
                name: "timeout",
                defaultValue: 1000,
                dsts: "Xena"
            },
            /// password: Xena password
            {
                name: "password",
                defaultValue: "xena",
                dsts: "Xena"
            },
            /// owner: Reservation owner
            {
                name: "owner",
                defaultValue: "eOLTGPON",
                dsts: "Xena"
            }
        ], true, true);

    }

    if (TrafficGenerator.driver == "STC") {
        /// /////////////////
        /// STC configuration
        /// /////////////////
        ApplyGlobalPrevalence(["AutomatisationParameters"], [
            /// ipAddress: STC IP Address
            {
                name: "ipAddress",
                defaultValue: "172.16.14.211",
                dsts: "STC"
            },
            /// stcSlot: STC Slot used
            {
                name: "stcSlot",
                defaultValue: 3,
                dsts: "STC"
            },
            /// stc_eoltPort: STC eOLT port 
            {
                name: "stc_eoltPort",
                defaultValue: 1,
                dsts: "STC"
            },
            /// stc_onuPorts: STC ONU ports
            {
                name: "stc_onuPorts",
                defaultValue: ["2", "3"],
                dsts: "STC"
            },
            /// timeout: STC response timeout (40s)
            {
                name: "timeout",
                defaultValue: 40000,
                dsts: "STC"
            },
            /// proxyAddress: STC proxy address
            {
                name: "proxyAddress",
                defaultValue: "127.0.0.1",
                dsts: "STC"
            },
            /// proxyPort: STC proxy Port
            {
                name: "proxyPort",
                defaultValue: 4000,
                dsts: "STC"
            }
        ], true, true);
    }
}
///Traffic parameters randomisation
ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// Set to 1 to activate randomisation of Pbit/VID/MAC and GEM --SET TO 1 FOR BBF.247 Testing
        {
            name: "ParametersRandomisation",
            defaultValue: 1,
            dsts: "UtilsParameters"
        },
        /// Set to 1 to randomize IGMP -- SET TO 1 FOR BBF.247 Testing
        {
            name: "IGMPRandomisation",
            defaultValue: 1 && (TrafficGenerator.driver != "STC"), /// randomisation must not be used with STC
            dsts: "UtilsParameters"
        }
    ],
    false, true);

/// ///////////////////
/// Utils configuration
/// ///////////////////
if (UtilsParameters.ParametersRandomisation == 1) {
    ApplyGlobalPrevalence(["AutomatisationParameters"], [
        /// User seed
        {
            name: "UserSeed",
            defaultValue: 2,
            dsts: "UtilsParameters"
        },
        /// Set to 1 to use a random seed generated from the script filename
        {
            name: "UseRandomSeedFromFilename",
            defaultValue: 1,
            dsts: "UtilsParameters"
        },
        /// Set to 1 to generate the random seed from all the script filename part
        {
            name: "UseRandomSeedWithAllFilenamePart",
            defaultValue: 1,
            dsts: "UtilsParameters"
        },

    ], false, true);
}

/// Add information to log
if (OMCI.MibConsistencyCheck == 0) logError("** MIB Consistency check is Off");
else logInfo("** MIB Consistency check is On");

if (UtilsParameters.ParametersRandomisation == 1) {
    if (UtilsParameters.UseRandomSeedFromFilename == 1) {
        var filename = currentScriptFilename();
        var seed = getSeedFromFilename(filename, UtilsParameters.UseRandomSeedWithAllFilenamePart);
        logInfo("Using Random seed " + seed + " generated from script filename: " + filename);
        RandomSeed(seed + UtilsParameters.UserSeed);
    } else {
        RandomSeed(UtilsParameters.UserSeed);
    }
}