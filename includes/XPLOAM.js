////////////////////////////////////////////////////////////
/// Copyright (c) 2011-2013, MT2 SAS                     ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

XPLOAM = {

    /// Default timeout for PLOAM ONU response (2000ms)
    Timeout: 2000,
    /// Current serial Number
    SerialNumber: {},
    /// OMCC For each ONU
    OMCC: {},
    /// Key used by ONU
    Key: {},
    /// Maximum RTD, 1 SFC => 311040 bits at 2.5 Gbits/s
    MaxRTD: 380000,
    /// RTD Delta, to simulate variations in RTD
    RTDDelta: 0,
    /// Data GEM ports -- array contening used Data GEM ports
    DataGEMPorts: [],
    /// Max value for Data GEM port
    MaxGEMPort: 16383, /// Set to the maximum valid Allocation by default
    /// encryption key retransmission min
    MinEncryptionKeyCnt: 1, /// Wait for 5 fragments (retransmission every 20 ms, for default timeout of 100ms (recommended by the standard)
    /// encryption key timeOut
    EncryptionGenerationTimeOut: 100,
    /// Assign_ONUIdToRange_RequestDelay_ms for debug purpose
    Assign_ONUIdToRange_RequestDelay_ms: 150,
    /// Assign_ONUIdToRange_RequestDelay_ms for debug purpose
    Profiles: {
        'XGPON': [
            ///No FEC
            {
                "onuid": 0x3ff,
                "profileIdx": 0,
                "profileVer": 0,
                "delimiterLen": 4,
                "delimiter": [0xad, 0x4c, 0xc3, 0x0f, 0x00, 0x00, 0x00, 0x00],
                "preambleCnt": 20,
                "preambleLen": 8,
                "preamble": [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
                "PON-TAG": [0x4d, 0x54, 0x32, 0x20, 0x4d, 0x54, 0x32, 0x20],
                "rate": 0,
                "fec": 0
            },
            // FEC
            {
                "onuid": 0x3ff,
                "profileIdx": 1,
                "profileVer": 0,
                "delimiterLen": 4,
                "delimiter": [0xA5, 0x66, 0x79, 0xE0, 0x00, 0x00, 0x00, 0x00], //Alt value: [0x4B, 0xDE, 0x1B, 0x90, 0x00, 0x00, 0x00, 0x00] //(both values are recommended by G.987 when FEC is enabled)
                "preambleCnt": 20,
                "preambleLen": 8,
                "preamble": [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
                "PON-TAG": [0x4d, 0x54, 0x32, 0x20, 0x4d, 0x54, 0x32, 0x20],
                "rate": 0,
                "fec": 1
            }
        ],
        'XGSPON': [
            ///No FEC
            {
                "onuid": 0x3fe,
                "profileIdx": 0,
                "profileVer": 0,
                "delimiterLen": 4,
                "delimiter": [0xA3, 0x76, 0x70, 0xC9, 0x00, 0x00, 0x00, 0x00], //Alt value: [0xAD, 0x4C, 0xC3, 0x0F, 0x00, 0x00, 0x00, 0x00] //(both values are recommended by G.9807
                "preambleCnt": 144,
                "preambleLen": 8,
                "preamble": [0xbb, 0x52, 0x1e, 0x26, 0xbb, 0x52, 0x1e, 0x26], //[0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa]
                "PON-TAG": [0x4d, 0x54, 0x32, 0x20, 0x4d, 0x54, 0x32, 0x20],
                "rate": 1,
                "fec": 0
            },
            ///FEC
            {
                "onuid": 0x3fe,
                "profileIdx": 1,
                "profileVer": 0,
                "delimiterLen": 4,
                "delimiter": [0x4B, 0xDE, 0x1B, 0x90, 0x00, 0x00, 0x00, 0x00], //Alt value [0xA5, 0x66, 0x79, 0xE0, 0x00, 0x00, 0x00, 0x00] //(both values are recommended by G.807 when FEC is enabled)
                "preambleCnt": 144,
                "preambleLen": 8,
                "preamble": [0xbb, 0x52, 0x1e, 0x26, 0xbb, 0x52, 0x1e, 0x26], //Al value[0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa]
                "PON-TAG": [0x4d, 0x54, 0x32, 0x20, 0x4d, 0x54, 0x32, 0x20],
                "rate": 1,
                "fec": 1
            }
        ]
    },

    SetDelimiter: function(protocol, fec, length, value) {
        var FECIndex = (fec == true) ? 1 : 0;
        this.Profiles[protocol][FECIndex].delimiterLen = length;
        this.Profiles[protocol][FECIndex].delimiter = value;
    },

    SetPreamble: function(protocol, fec, length, value, repeat) {
        var FECIndex = (fec == true) ? 1 : 0;
        this.Profiles[protocol][FECIndex].preambleLen = length;
        this.Profiles[protocol][FECIndex].preamble = value;
        this.Profiles[protocol][FECIndex].preambleCnt = repeat;
    },

    MakeXGPONID: function(RE, ODN, DSFEC, P, linkType, label, DWLCHID, R, C, TOL) {
        var PONID = [
            ((RE & 0x1) << 2) | (ODN >> 1) & 0x3,
            ((ODN & 0x01) << 7) | ((DSFEC & 0x01) << 6) | (P & 0x01) << 5 | ((linkType & 0x03) << 3) | (label >> 25) & 0x00000007,
            (label >> 17) & 0x000000FF,
            (label >> 9) & 0x000000FF,
            (label >> 1) & 0x000000FF,
            ((label & 0x00000001) << 7) | ((DWLCHID & 0x0F) << 3) | (R << 2) | (C << 1) | ((TOL >> 8) & 0x0001),
            TOL & 0x00FF
        ];
        return PONID;
    },

    DiscoverONU: function(serialNumber, protocol, profiles) {
        logInfo("Discovering ONU" + (((serialNumber != undefined) && (serialNumber.length != 0)) ? " " + arrayToHexStr(serialNumber) : ""));
        if (profiles == undefined) {
            profiles = this.Profiles[protocol];
        }

        /// Send Profile PLOAM
        var nb_repeat = 3;
        var foundSerial = undefined
        do {
            sendXPLOAM("Profile", 1, profiles[0]);
            sleep(0);

            if (profiles.length > 1) {
                sendXPLOAM("Profile", 1, profiles[1]);
                sleep(0);
            }

            if (profiles.length > 2) {
                sendXPLOAM("Profile", 1, profiles[2]);
                sleep(0);
            }

            if (profiles.length > 3) {
                sendXPLOAM("Profile", 1, profiles[3]);
                sleep(0);
            }

            sleep(300);
            /// Send Serial number request
            sendXPLOAM("Serial_Number_Request", 1, {
                "alloc_id": profiles[0].onuid
            });
            foundSerial = waitForXPLOAM("Serial_Number_ONU", 0x3ff, this.Timeout);
            if (foundSerial != undefined) {
                foundSerial = foundSerial.slice(0, 8);
                logInfo("found serial number: " + arrayToHexStr(foundSerial));
                if ((serialNumber != undefined) && (serialNumber.length > 0) && (0 != ArrayByteCmp(foundSerial, serialNumber)))
                    foundSerial = undefined;
            }
        } while ((foundSerial == undefined) && (--nb_repeat));
        /// Wait for serial number

        return foundSerial;
    },

    /* CalculateRTD
     * Calculate the equalization delay
     * \return integer, default value is 100
     */
    CalculateRTD: function() {
        var resp = {
            delay: -1,
            valueRTDinBit: undefined
        };

        /// Read Computed RTD
        /// Value of the ONU to calculate RTD
        var onuRTD = readRegisterHigh(13);
        /// Value of the RTD
        var valueRTD = readRegisterLow(13);
        resp.valueRTDinBit = valueRTD * 32; // Bits at 2.5 Gbits/s
        logInfo("RTD Value is " + resp.valueRTDinBit);
        if (this.RTDDelta > 0) {
            resp.valueRTDinBit = resp.valueRTDinBit + RandomInteger(0, this.RTDDelta) - (this.RTDDelta >> 1);
        }
        /// Check if RTD is not too high
        if (resp.valueRTDinBit <= this.MaxRTD)
            resp.delay = this.MaxRTD - resp.valueRTDinBit;

        return resp;
    },

    /** Activate And Range a new ONU using the specified onuId
     * \param onuId ONU-ID to use for the new ONU (in range [0..253])
     */
    ActivateAndRangeONU: function(onuId, profileIdx, protocol, serialNumber, profiles) {
        logInfo("Activating and ranging ONU " + onuId);
        /// Check all parameters
        if ((onuId < 0) || (onuId > 1020)) {
            testFailed("Invalid ONU-ID parameter used in XPLOAM.ActivateAndRangeONU");
        }

        this.SerialNumber[onuId] = this.DiscoverONU(serialNumber, protocol, profiles);
        if ((this.SerialNumber[onuId] == undefined) && (protocol == "XGSPON")) {
            this.SerialNumber[onuId] = this.DiscoverONU(serialNumber, "XGPON", profiles);
            if (this.SerialNumber[onuId] != undefined)
                protocol = "XGPON";
        }
        if (this.SerialNumber[onuId] == undefined)
            testFailed("No Serial Number Response found");

        logInfo("Serial number is " + arrayToHexStr(this.SerialNumber[onuId]));
        /// Send Assign_ONU_ID
        sendXPLOAM("Assign_ONU-ID", 1, {
            "onuid": onuId,
            "vendor-id": this.SerialNumber[onuId].slice(0, 4),
            "VSSN": this.SerialNumber[onuId].slice(4, 8),
            "lineRate": (protocol == "XGSPON") ? 0x01 : 0x00
        });
        sleep(this.Assign_ONUIdToRange_RequestDelay_ms);
        /// Send Ranging Request
        sendXPLOAM("Range_Request", 1, {
            "onuid": onuId
        });
        /// Wait ACK from ONU
        var res = waitForXPLOAM("Registration", onuId, this.Timeout);
        if (res == undefined)
            testFailed("No Registration Response found");

        sleep(150);

        var delayStruct = this.CalculateRTD();
        if (delayStruct.delay == -1) {
            testFailed("RTD value is too high " + delayStruct.valueRTDinBit + ". Please update PLOAM.MaxRTD value (current is " + this.MaxRTD + ")");
        }
        /// Send Ranging time
        sendXPLOAM("Ranging_Time", 1, {
            "onuid": onuId,
            "eqDelay": delayStruct.delay
        });
        /// Set profile to 0 if fec is deactivated, 1 otherwise
        if (profileIdx == undefined)
            profileIdx = 0;
        /// Add BWMap Entry
        /// 50MBit/s, burstProfile 0 or 1 depending on FEC, Ploam 1, DBRu 0
        bwmapAddEntry(onuId, onuId, 50, profileIdx, 1, 0);

        waitForXPLOAM("Acknowledge", onuId, this.Timeout);

        logInfo("ONU " + onuId + " Ranged");
        this.OMCC[onuId] = onuId;

        return this.SerialNumber[onuId];
    },

    /** Deactivate an ONU
     * \param onuId ONU-ID of the ONU to disable
     */
    DeactivateONU: function(onuId) {
        /// Check all parameters
        if ((onuId < 0) || (onuId > 1023)) {
            return logError("Invalid ONU-ID parameter used in XPLOAM.DeactivateONU");
        }
        /// Disable the ONU-ID
        sendXPLOAM("Deactivate_ONU-ID", 3, {
            "onuid": onuId
        });
        if (onuId == 1023) {
            logInfo("Deactivating All ONU");
            this.SerialNumber = [];
            bwmapReset();
            this.OMCC = [];
            logInfo("All ONU Deactivated");
        } else {
            logInfo("Deactivating ONU " + onuId);
            /// Remove the serial number
            this.SerialNumber[onuId] = {};
            /// Remove OMCC BWMap entry for the specified ONU
            //bwmapDelEntry(onuId);
            bwmapDelEntry(this.OMCC[onuId]);
            logInfo("ONU " + onuId + " Deactivated");
        }
    },

    /** Assign Alloc ID
     * \param onuId ONU-ID on which to assign the Alloc ID
     * \param Alloc ID
     */
    AssignAllocId: function(onuId, allocid) {
        logInfo("Assigning AllocId " + allocid + " on ONU " + onuId);
        var times = 3;
        do {
            sendXPLOAM("Assign_Alloc-ID", 1, {
                "onuid": onuId,
                "allocid": allocid
            });
            var res = waitForXPLOAM("Acknowledge", onuId, this.Timeout);
            if (res != undefined) {
                logInfo("Alloc ID " + allocid + " associated for ONU " + onuId);
                return;
            }
            logWarning("No Assign Alloc-ID Acknowledge found");
            times--;
            sleep(5);
        } while (times > 0);
        testFailed("No Assign Alloc-ID Acknowledge found");
    },

    CreateOMCC: function(onuId, omcc) {
        ///Nothing to be done in XGPON
        omcc = onuId;
        this.OMCC[onuId] = omcc;
    },

    /** Gets an unused GEM port for data traffic & automatically reserves it
     */
    GetUnusedDataGEMPort: function(protocol) {
        var min = 1023;
        if (protocol == "XGSPON")
            min = 1021;
        var newGEM = RandomIntegerExcept(min, this.MaxGEMPort, this.DataGEMPorts);
        this.DataGEMPorts.push(newGEM);
        return newGEM;
    },

    /** Reserves a data GEM port. Returns the GEM port if successful.
     */
    ReserveDataGEMPort: function(GEMPort) {
        if (this.DataGEMPorts.indexOf(GEMPort) < 0) {
            this.DataGEMPorts.push(GEMPort);
            return GEMPort;
        }
        return undefined;
    },

    ConfirmEncryptionKey: function(onuId, keyIndex) {
        logInfo("confirm key " + keyIndex + " for ONU " + onuId);
        var keyLength = 16;
        sendXPLOAM("Key_Control", 1, {
            "onuid": onuId,
            "control": 0x0001,
            "key_index": keyIndex,
            "key_length": keyLength
        });
        var resp = waitForXPLOAM("Key_Report", onuId, this.Timeout, 1);
        while ((resp != undefined) && (resp[0] == 0))
            resp = waitForXPLOAM("Key_Report", onuId, this.Timeout, 1); ///Removing retransmission of the new key report
        if (resp == undefined)
            testFailed("Unable to get Encryption Key Confirmation from the ONU " + onuId);
        if (resp[0] != 1)
            testFailed("key not confirmed for ONU " + onuId + "/" + resp[0]);
        if (resp[1] != keyIndex)
            testFailed("Wrong Key index for  ONU " + onuId);

        var key = getONUEncryptionKey(onuId, keyIndex);
        var expectedKeyName = generateKeyName(onuId, key);
        var receivedKeyName = resp.slice(4, 4 + keyLength);

        if (0 != ArrayByteCmp(expectedKeyName, receivedKeyName)) {
            testFailed("Received key name " + arrayToHexStr(receivedKeyName) + ", expected " + arrayToHexStr(expectedKeyName));
        }
    },

    RenewEncryptionKey: function(onuId, keyIndex) {
        logInfo("Renewing key" + keyIndex + " on ONU " + onuId);
        /// Request a new Key from the ONU if none already present
        if ((keyIndex != 1) && (keyIndex != 2))
            testFailed("Invalid key index provided (" + keyIndex + ")");
        var keyLength = 16;
        if ((this.Key[onuId] == undefined) || (this.Key[onuId][keyIndex] == undefined)) {
            /// Request the key
            sendXPLOAM("Key_Control", 1, {
                "onuid": onuId,
                "control": 0x0000,
                "key_index": keyIndex,
                "key_length": keyLength
            });

            var resp = waitForXPLOAM("Key_Report", onuId, (this.EncryptionGenerationTimeOut * this.MinEncryptionKeyCnt), this.MinEncryptionKeyCnt);
            if (resp == undefined)
                testFailed("Unable to retrieve Encryption Key from the ONU " + onuId);
            if (resp[0] != 0)
                testFailed("New Key has not been generated for  ONU " + onuId);
            if (resp[1] != keyIndex)
                testFailed("Wrong Key has not been generated for  ONU " + onuId);
            if (this.Key[onuId] == undefined)
                this.Key[onuId] = new Array();
            this.Key[onuId][keyIndex] = resp.splice(4, 4 + keyLength);

        }

        this.ConfirmEncryptionKey(onuId, keyIndex);
        sleep(1000);
    },

    ActivateEncryption: function(onuId, portId, keyIndex) {
        if (undefined === keyIndex)
            keyIndex = 1;
        this.RenewEncryptionKey(onuId, keyIndex);
        /// Activate the encryption
        startEncryption(onuId, portId, keyIndex);
        logInfo("Encryption activated for ONU " + onuId + " / PortId " + portId + " / KeyIndex " + keyIndex);
        sleep(1000);
    },

    DeactivateEncryption: function(onuId, portId) {
        stopEncryption(portId);
        sleep(1000);
    },

    GetPassword: function(onuId) {
        logInfo("Getting Password (registration) for ONU " + onuId);
        sendXPLOAM("Request_Registration", 1, {
            "onuid": onuId
        });
        var res = waitForXPLOAM("Registration", onuId, this.Timeout);

        if (res == undefined)
            testFailed("No Registration response found");
        res = res.slice(0, 36);
        logInfo("Password is " + arrayToHexStr(res) + ': "' + ArrayToString(res) + '"');

        return res;
    },

    waitFor: function(message, onuId, timeOut, nb) {
        var res = waitForXPLOAM(message, onuId, timeOut, nb);
        return res;
    },


    GetXGTCFrameHeaderString: function() {
        var headerString = "XGTC_header";
        if (PLOAMMapper.ReadProtocolFromDevice() != "XGPON") {
            try {
                var softrev = eval(getSoftwareRevision());
                if (softrev >= 4531) {
                    headerString = "FS_header";
                }
            } catch (e) {}
        }
        return headerString;
    }
};

if (MT2GUI != "eOLT-GUI") {
    try {
        if (isConnected()) {
            switch (getDeviceType()) {
                case "eOLT-XGPON":
                    setXGPONPonId(XPLOAM.MakeXGPONID(0 /*RE*/ , 0 /*ODN*/ , 0 /* DSFEC --activated but flag set to 0 */ , 0 /* P*/ , 0 /*linkType */ , 0xdeadbee /*label */ , 0 /* DWLCHID*/ , 0 /*R */ , 0 /*C */ , 131 /*TOL*/ ));
                    break;
                case "eOLT-XGSPON":
                    setXGPONPonId(XPLOAM.MakeXGPONID(0 /*RE*/ , 0 /*ODN*/ , 1 /* DSFEC */ , 1 /* P*/ , 0 /*linkType */ , 0xdeadbee /*label */ , 0 /* DWLCHID*/ , 0 /*R */ , 0 /*C */ , 131 /*TOL*/ ));
                    break;
                case "eOLT-NGPON2":
                    setXGPONPonId(XPLOAM.MakeXGPONID(0 /*RE*/ , 0 /*ODN*/ , 1 /* DSFEC */ , 1 /* P*/ , 0 /*linkType */ , 0xdeadbee /*label */ , 0 /* DWLCHID*/ , 0 /*R */ , 0 /*C */ , 131 /*TOL*/ ));
                    break;

            }
        }
    } catch (e) {
        ///ignore
    }
}

addHelpInfo("XPLOAM.ActivateAndRangeONU", "ActivateAndRangeONU(onuId [, profileIdx, protocol, serialNumber, profiles]): Activate And Range a new ONU using the specified onuId. the profile index, the protocol, and profiles (as an array) are optional");
addHelpInfo("XPLOAM.ActivateEncryption", "ActivateEncryption(onuId, portId): Activate the encryption of the specified portId");
addHelpInfo("XPLOAM.AssignAllocId", "AssignAllocId(onuId, allocid): Assign Alloc ID allocid to the specified onuId");
addHelpInfo("XPLOAM.ConfirmEncryptionKey", "Confirm AES key", ["onuId", "keyIndex"], ["ONU-ID", "key Index"]);
addHelpInfo("XPLOAM.CreateOMCC", "CreateOMCC(onuId, omcc): Create a specific OMCC for the specified onuId");
addHelpInfo("XPLOAM.DeactivateEncryption", "DeactivateEncryption(onuId, portId): Deactivate the encryption of the specified portId");
addHelpInfo("XPLOAM.DeactivateONU", "DeactivateONU(onuId): Deactivate the ONU with specified onuId");
addHelpInfo("XPLOAM.GetXGTCFrameHeaderString", "Retrieve the string identifying the XGTC frame header (depending on protocol) -- useful to parse raw messages", undefined, undefined, "The identifying string");
addHelpInfo("XPLOAM.GetPassword", "GetPassword(onuId): Ask and return the Password (registration-id) of the specified ONU");
addHelpInfo("XPLOAM.GetUnusedDataGEMPort", "GetUnusedDataGEMPort(): gets an unused data gem port value, and reserves it");
addHelpInfo("XPLOAM.RenewEncryptionKey", "Renew the AES key", ["onuId", "keyIndex"], ["ONU-ID", "key Index"]);
addHelpInfo("XPLOAM.ReserveDataGEMPort", "ReserveDataGEMPort(GEMPort): reserves the GEM port, if available. returns the GEM port if successful, undefined otherwise");
addHelpInfo("XPLOAM.SetDelimiter", "Set default delimiter", ["protocol", "fec", "length", "value"], ["'XGPON'/'XGSPON'", "FEC enabled", "delimiter length", "delimiter array"]);
addHelpInfo("XPLOAM.SetPreamble", "Set default preamble", ["protocol", "fec", "length", "value", "repeat"], ["'XGPON'/'XGSPON'", "FEC enabled", "preamble length", "preamble array", "preamble repeat"]);
addHelpInfo("XPLOAM.waitFor", "waitFor(message, onuId, timeOut): wait for a specific XPLOAM message");
