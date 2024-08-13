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

NGPLOAM = {

    /// Default timeout for PLOAM ONU response (2000ms)
    Timeout: 2000,
    /// Current serial Number
    SerialNumber: {},
    /// OMCC For each ONU
    OMCC: {},
    /// Key used by ONU
    Key: {},
    /// Maximum RTD, 1 SFC => 311040 bits at 2.5 Gbits/s
    MaxRTD: 380000, //380000,
    /// RTD Delta, to simulate variations in RTD
    RTDDelta: 0,
    /// Data GEM ports -- array contening used Data GEM ports
    DataGEMPorts: [],
    /// Max value for Data GEM port
    MaxGEMPort: 4095, //16383, /// Set to the maximum valid Allocation by default
    /// encryption key retransmission min
    MinEncryptionKeyCnt: 1,
    /// Default System PROFILE
    SystemProfile: {
        "onuid": 1023,
        "NG2SYSID": 0x000cafee,
        "systemProfileVersion": 0,
        "upstreamOperatingWavelengthBands": 0,
        "TWDMChannelCount": 1,
        "channelSpacingTWDM": 100,
        "upstreamMSETWDM": 5,
        "FSRTWDM": 0,
        "TWDMAMCCControl": 0x3,
        "looseCalibrationBoundTWDM": 0x00,
        "PTPWDMChannelCount": 0,
        "channelSpacingPTPWDM": 100,
        "upstreamMSEPTPWDM": 0,
        "FSRPTPWDM": 0,
        "PTPWDMCalibrationAccuracy": 0,
        "looseCalibrationBoundPTPWDM": 0x00
    },
    /// PON ID label
    PONIDLabel: 0xdeadbee,
    /// Burst Profile template
    burstProfileTemplate: {
        "onuid": 0x3ff,
        "profileIdx": 0,
        "profileVer": 0,
        "delimiterLen": 4,
        "delimiter": [0xad, 0x4c, 0xc3, 0x0f, 0x00, 0x00, 0x00, 0x00],
        "preambleCnt": 120,
        "preambleLen": 8,
        //"preamble": [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
        "preamble": [0xbb, 0x52, 0x1e, 0x26, 0xbb, 0x52, 0x1e, 0x26],
        "PON-TAG": [0x4d, 0x54, 0x32, 0x20, 0x4d, 0x54, 0x32, 0x20],
        "rate": 1,
        "fec": 0
    },
    /// Mapping between channel index and upstream frequency in 0.1 GHz units
    upstreamChannelFrequencyTable: [
        1956000,
        1955000,
        1954000,
        1953000
    ],

    MakeXGPONID: function (RE, ODN, DSFEC, P, linkType, label, DWLCHID, R, C, TOL) {
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

    DiscoverONU: function (serialNumber, channel, DSFEC, profiles) {
        if (channel === undefined);
        channel = readDownstreamChannelIndex();
        if (DSFEC === undefined)
            DSFEC = 1;
        logInfo("Discovering ONU" + ((serialNumber != undefined) ? " " + arrayToHexStr(serialNumber) : "") + " on channel " + channel);
        if (profiles == undefined) {
            profiles = [];
            profiles.push(clone(this.burstProfileTemplate));
            profiles[0].profileIdx = 0;
            profiles[0].fec = 0;
            profiles.push(clone(this.burstProfileTemplate));
            profiles[1].profileIdx = 1;
            profiles[1].fec = 1;
        }

        var XGPONID = this.MakeXGPONID(0, 0, DSFEC, 1, 0, this.PONIDLabel, channel - 1, 0, 0, 0x131);

        setXGPONPonId(XGPONID);

        /// Send Profile PLOAM
        var nb_repeat = 3;
        var foundSerial = undefined;

        do {
            //FOR PROFILE MESSAGES (SYSTEM/CHANNEL/BURST)
            {
                sendXPLOAM("System_Profile", 1, this.SystemProfile);
                sleep(5);

                sendXPLOAM("Channel_Profile", 1, {
                    "onuid": 1023,
                    "controlOctet": (channel << 4) | 0x04,
                    "channelProfileVersion": 0,
                    "PONID": (this.PONIDLabel << 4) | (channel - 1),
                    "downstreamFrequencyOffset": 0,
                    "downstreamRate": (DSFEC & 0x01) << 4,
                    "channelPartition": 0,
                    "defaultResponseChannel": (this.PONIDLabel << 4) | (channel - 1),
                    "serialNumberGrantTypeIndication": 0x02,
                    "AMCCWindowSpecification": 0x00000000,
                    "UWLCHID": channel - 1,
                    "upstreamFrequency": this.upstreamChannelFrequencyTable[channel - 1],
                    "opticalLinkType": 0x02,
                    "upstreamRate": 0x02,
                    "defaultONUAttenuation": 0,
                    "responseThreshold": 0
                });

                // BURST PROFILE MESSAGE
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

            }
            sleep(300);

            sendXPLOAM("Serial_Number_Request", 3, {
                "alloc_id": 1022
            });
            sleep(0);
            foundSerial = waitForXPLOAM("Serial_Number_ONU", 0x3ff, this.Timeout);
            if (foundSerial != undefined) {
                foundSerial = foundSerial.slice(0, 8);
                logInfo("found serial number: " + arrayToHexStr(foundSerial));
                if ((serialNumber != undefined) && (serialNumber.length > 0) && (0 != ArrayByteCmp(foundSerial, serialNumber))) {
                    logWarning("looking for " + arrayToHexStr(serialNumber) + ", found " + arrayToHexStr(foundSerial));
                    foundSerial = undefined;
                }
            }

            sleep(0);
        } while ((foundSerial == undefined) && (--nb_repeat));
        /// Wait for serial number

        return foundSerial;
    },

    /** Activate And Range a new ONU using the specified onuId
     * \param onuId ONU-ID to use for the new ONU (in range [0..253])
     */
    ActivateAndRangeONU: function (onuId, channel, DSFEC, profileIdx, serialNumber, profiles) {
        if (channel === undefined)
            channel = channel = readDownstreamChannelIndex();
        if (DSFEC === undefined)
            DSFEC = 1;
        logInfo("Activating and ranging ONU " + onuId + " on channel " + channel);
        /// Check all parameters
        if ((onuId < 0) || (onuId > 253)) {
            return logError("Invalid ONU-ID parameter used in PLOAM.ActivateAndRangeONU");
        }

        this.SerialNumber[onuId] = this.DiscoverONU(serialNumber, channel, DSFEC, profiles);

        if (this.SerialNumber[onuId] == undefined)
            testFailed("No Serial Number Response found");

        logInfo("Serial number is " + arrayToHexStr(this.SerialNumber[onuId]));
        /// Send Assign_ONU_ID
        sendXPLOAM("Assign_ONU-ID", 1, {
            "onuid": onuId,
            "vendor-id": this.SerialNumber[onuId].slice(0, 4),
            "VSSN": this.SerialNumber[onuId].slice(4, 8),
            "lineRate": 0x01
        });
        sleep(150);
        /// Send Ranging Request
        sendXPLOAM("Range_Request", 1, {
            "onuid": onuId
        });
        /// Wait ACK from ONU
        var res = waitForXPLOAM("Registration", onuId, this.Timeout);
        if (res == undefined)
            testFailed("No Registration Response found");
        sleep(150);
        /// Read Computed RTD
        /// Value of the ONU to calculate RTD
        var onuRTD = readRegisterHigh(13);
        /// Value of the RTD
        var valueRTD = readRegisterLow(13);
        var valueRTDinBit = valueRTD * 32; // Bits at 2.5 Gbits/s
        logInfo("RTD Value is " + valueRTDinBit);
        /// Check if RTD is not too high
        if (this.RTDDelta > 0) {
            valueRTDinBit = valueRTDinBit + RandomInteger(0, this.RTDDelta) - (this.RTDDelta / 2);
        }
        if (valueRTDinBit > this.MaxRTD) {
            testFailed("RTD value is too high " + valueRTDinBit + ". Please update NGPLOAM.MaxRTD value (current is " + this.MaxRTD + ")");
        }
        var eqDelay = this.MaxRTD - valueRTDinBit;
        /// Send Ranging time
        sendXPLOAM("Ranging_Time", 1, {
            "onuid": onuId,
            "eqDelay": eqDelay
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
    DeactivateONU: function (onuId) {
        /// Check all parameters
        if ((onuId < 0) || (onuId > 1023)) {
            return logError("Invalid ONU-ID parameter used in NGPLOAM.DeactivateONU");
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
    AssignAllocId: function (onuId, allocid) {
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

    CreateOMCC: function (onuId, omcc) {
        ///Nothing to be done in XGPON
        omcc = onuId;
        this.OMCC[onuId] = omcc;
    },

    /** Gets an unused GEM port for data traffic & automatically reserves it
     */
    GetUnusedDataGEMPort: function () {
        var newGEM = RandomIntegerExcept(1021, this.MaxGEMPort, this.DataGEMPorts);
        this.DataGEMPorts.push(newGEM);
        return newGEM;
    },

    /** Reserves a data GEM port. Returns the GEM port if successful.
     */
    ReserveDataGEMPort: function (GEMPort) {
        if (this.DataGEMPorts.indexOf(GEMPort) < 0) {
            this.DataGEMPorts.push(GEMPort);
            return GEMPort;
        }
        return undefined;
    },

    ActivateEncryption: function (onuId, portId, keyIndex) {
        logInfo("Activating encryption for ONU " + onuId + " / PortId " + portId);
        /// Request a new Key from the ONU if none already present
        if (undefined === keyIndex)
            keyIndex = 1;
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
            /// Wait for 5 fragments (retransmission every 20 ms, for default timeout of 100ms
            var resp = waitForXPLOAM("Key_Report", onuId, this.Timeout, this.MinEncryptionKeyCnt);
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
        logInfo("confirm key " + keyIndex + " for ONU " + onuId);
        sendXPLOAM("Key_Control", 1, {
            "onuid": onuId,
            "control": 0x0001,
            "key_index": keyIndex,
            "key_length": keyLength
        });
        sleep(1000);
        /// Activate the encryption
        startEncryption(onuId, portId, keyIndex);
        logInfo("Encryption activated for ONU " + onuId + " / PortId " + portId + " / KeyIndex " + keyIndex);
        sleep(1000);
    },

    DeactivateEncryption: function (onuId, portId) {
        stopEncryption(portId);
        sleep(1000);
    },

    GetPassword: function (onuId) {
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

    waitFor: function (message, onuId, timeOut, nb) {
        var res = waitForXPLOAM(message, onuId, timeOut, nb);
        return res;
    },

    ForceChannel: function (channelIndex) {
        var channelValue = (channelIndex - 1) & 0x00000003;
        writeRegister(12, 0x80000000, channelValue);
    }

};

addHelpInfo("NGPLOAM.ActivateAndRangeONU", "ActivateAndRangeONU(onuId [, profileIdx, serialNumber, protocol, profiles]): Activate And Range a new ONU using the specified onuId. the profile index, the protocol, and profiles (as an array) are optional");
addHelpInfo("NGPLOAM.ActivateEncryption", "ActivateEncryption(onuId, portId): Activate the encryption of the specified portId");
addHelpInfo("NGPLOAM.AssignAllocId", "AssignAllocId(onuId, allocid): Assign Alloc ID allocid to the specified onuId");
addHelpInfo("NGPLOAM.CreateOMCC", "CreateOMCC(onuId, omcc): Create a specific OMCC for the specified onuId");
addHelpInfo("NGPLOAM.DeactivateEncryption", "DeactivateEncryption(onuId, portId): Deactivate the encryption of the specified portId");
addHelpInfo("NGPLOAM.DeactivateONU", "DeactivateONU(onuId): Deactivate the ONU with specified onuId");
addHelpInfo("NGPLOAM.ForceChannel", "Force NPON2 channel", ["channelIndex"], ["channel index (1-4)"]);
addHelpInfo("NGPLOAM.GetPassword", "GetPassword(onuId): Ask and return the Password (registration-id) of the specified ONU");
addHelpInfo("NGPLOAM.GetUnusedDataGEMPort", "GetUnusedDataGEMPort(): gets an unused data gem port value, and reserves it");
addHelpInfo("NGPLOAM.ReserveDataGEMPort", "ReserveDataGEMPort(GEMPort): reserves the GEM port, if available. returns the GEM port if successful, undefined otherwise");
addHelpInfo("NGPLOAM.waitFor", "waitFor(message, onuId, timeOut): wait for a specific NGPLOAM message");
