////////////////////////////////////////////////////////////
/// Copyright (c) 2011, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

PLOAM = {

    /// Default timeout for PLOAM ONU response (2000ms)
    Timeout: 2000,
    /// Current serial Number
    SerialNumber: {},
    /// OMCC For each ONU
    OMCC: {},
    /// Key used by ONU
    Key: {},
    /// Maximum RTD, 1SFC => 155520 bits at 1.25 Gbits/s
    MaxRTD: (380000),
    /// RTD Delta, to simulate variations in RTD (in bits)
    RTDDelta: 0, //(200 * 8),
    /// Used GEM ports
    GEMPorts: [],
    /// Min Data GEM port -- Data GEM port will be assigned between this value and 4094
    MinDataGEMPort: 256,
    /// msg Data
    msgData: {
        'Upstream_OverheadPLOAM': {
            "guard_bits": 32,
            "type1_preamble": 0,
            "type2_preamble": 0,
            "pattern": 0xaa,
            "data1": 0xab,
            "data2": 0x59,
            "data3": 0x83,
            "preassigned_delay": 100
        },
        'Extended_Burst_Length': {
            "type3_ranging": 30,
            "type3_ranged": 24
        }
    },

    DiscoverONU: function(serialNumber) {
        logInfo("Discovering ONU" + ((serialNumber != undefined) ? " " + arrayToHexStr(serialNumber) : ""));

        var ONUs = [];
        if (serialNumber != undefined) {
            ONUs.push(new ONU(serialNumber));
        }

        this.DiscoverONUs(ONUs, 1, 3);

        if (ONUs[0].state != "O3") {
            testFailed("No Serial Number Response found");
            return undefined;
        }
        logInfo("Serial number is " + arrayToHexStr(ONUs[0].serialNumber));

        return ONUs[0].serialNumber;
    },

    /** DiscoverONUs
     *  Discover a batch of ONUs
     *  /param ONUs table
     *  /return integer, number of serial found
     */
    DiscoverONUs: function(ONUs, maxONUs, nb_repeat) {
        /// Repeat 3 times Serial Number Request before Failed
        var resp = undefined;
        var serialsFound = 0;
        do {
            /// Send Upstream overhead PLOAM
            sendPLOAM("Upstream_OverheadPLOAM", 3, this.msgData['Upstream_OverheadPLOAM']);
            sleep(5);
            /// Send Extended Burst Length
            sendPLOAM("Extended_Burst_Length", 3, this.msgData['Extended_Burst_Length']);
            sleep(5);
            /// Send Serial number request
            sendPLOAM("Serial_Number_Request", 1);
            resp = waitForPLOAM("Serial_Number_ONU", 255, this.Timeout);
            if (resp != undefined) {
                while (resp != undefined) {
                    var startSlice = 0;
                    var endSlice = 8;
                    for (var i = 0; i < (resp.length / 10); i++) {
                        logInfo("found serial number: " + arrayToHexStr(resp.slice(startSlice, endSlice)));
                        var ONUIndex = this.GetOrCreateONU(resp.slice(startSlice, endSlice), ONUs, maxONUs);
                        if (ONUIndex >= 0)
                            ++serialsFound;
                        startSlice += 10;
                        endSlice += 10;
                        if ((serialsFound >= maxONUs) && (serialsFound >= ONUs.length))
                            break;
                    }
                    if ((serialsFound >= maxONUs) && (serialsFound >= ONUs.length))
                        break;
                    resp = waitForPLOAM("Serial_Number_ONU", 255, this.Timeout);
                }
            } else {
                logWarning("No Serial_Number_ONU received");
            }
            sleep(5);
        } while ((resp == undefined) && ((--nb_repeat) > 0));

        return serialsFound;
    },

    /** Activate And Range a new ONU using the specified onuId
     * \param onuId ONU-ID to use for the new ONU (in range [0..253])
     */
    ActivateAndRangeONU: function(onuId, FEC, serialNumber) {
        var newONU = new ONU(serialNumber, onuId, FEC);
        this.ActivateAndRangeONUs(newONU);
        if (newONU.state != "O5")
            testFailed("ActivateAndRangeONU failed");
    },

    /* CalculateRTD
     * Calculate the equalization delay
     * \return integer, default value is 100
     */
    CalculateRTD: function() {
        var resp = {
            delay: 100,
            valueRTDinBit: undefined
        };

        if (MT2GUI == "MT2-Browser") {
            /// Read Computed RTD
            /// Value of the ONU to calculate RTD
            var onuRTD = readRegisterHigh(13);

            /// Value of the RTD
            var valueRTD = readRegisterLow(13);
            resp.valueRTDinBit = valueRTD * 8; // Bits at 1.25 Gbits/s
            logInfo("RTD Value is " + resp.valueRTDinBit + " bit @ 1.25 Gbit/s");

            /// Check if RTD is not too high
            if (this.RTDDelta > 0) {
                resp.valueRTDinBit = resp.valueRTDinBit + RandomInteger(0, this.RTDDelta) - (this.RTDDelta / 2);
            }
            if (resp.valueRTDinBit > this.MaxRTD) {
                resp.delay = -1;
                return resp;
            }
            resp.delay = this.MaxRTD - resp.valueRTDinBit;
        }
        return resp;
    },

    /* Range an ONU
     * \param ONU must be pass as parameter
     */
    rangeONU: function(ONU) {
        if (ONU != undefined) {
            logInfo("Ranging ONU " + ONU.ONUID + " With serial " + arrayToHexStr(ONU.serialNumber));
            /// Send Assign_ONU_ID
            sendPLOAM("Assign_ONU-ID", 3, {
                "onuid": ONU.ONUID,
                "serial_number": ONU.serialNumber
            });
            sleep(5);

            /// Send Ranging Request
            sendPLOAM("Range_Request", 1, {
                "onuid": ONU.ONUID
            });

            /// Wait for serial number
            var res = waitForPLOAM("Serial_Number_ONU", ONU.ONUID, this.Timeout);
            if (res != undefined) {
                ONU.state = "O4";
            } else {
                logWarning("ONU " + ONU.ONUID + " no serial response found");
                logInfo("");
                return ONU
            }
            sleep(150);
            var delayStruct = this.CalculateRTD();
            if (delayStruct.delay == -1) {
                logWarning("For ONU " + ONU.ONUID + " RTD value is too high " + delayStruct.valueRTDinBit + ". Please update PLOAM.MaxRTD value (current is " + this.MaxRTD + ")");
                logInfo("");
                return ONU;
            }

            /// Send Ranging time
            sendPLOAM("Ranging_Time", 3, {
                "onuid": ONU.ONUID,
                "delay": delayStruct.delay
            });
            ONU.state = "O5";

            /// Set profile to 0 if FEC is deactivated, 1 otherwise
            var profile = ((ONU.FEC != undefined) && ONU.FEC) ? 1 : 0;

            /// Create a new BWMap entry for this ONU with Alloc-Id = ONU-ID (5MBit/s traffic) no FEC.
            sleep(10);
            bwmapAddEntry(ONU.ONUID, ONU.ONUID, 5, profile, 1, 0);
            logInfo("ONU " + ONU.ONUID + " Ranged");
            logInfo("");
        }
        return ONU;
    },

    /** GetOrCreateONU
     *  Get or create ONU by serial number
     *  \param Serial number
     *  \param ONUs table
     *  \return Index of the ONU
     */
    GetOrCreateONU: function(serialNumber, ONUs, maxONUs) {
        var index = -1;

        for (var i = 0; i < ONUs.length; i++) {
            ///if this is a registered serial number or if the serial number is not defined, we can use the spot
            if (arrayToHexStr(serialNumber) == arrayToHexStr(ONUs[i].serialNumber)) {
                ONUs[i].state = "O3";
                index = i;
                break;
            }
            if (((ONUs[i].serialNumber == undefined) || (ONUs[i].serialNumber.length == 0)) && (ONUs[i].state == "O2")) {
                index = i;
                ///set index but keep running, in case we find the right serial
            }
        }

        if (index == -1) {
            if (ONUs.length < maxONUs) {
                logInfo("Creating ONU for serial " + arrayToHexStr(serialNumber));
                ONUs.push(new ONU(serialNumber));
                ONUs[ONUs.length - 1].state = "O3";
                index = ONUs.length - 1;
            } else {
                logInfo("Unaccounted ONU " + arrayToHexStr(serialNumber) + ", ignoring");
            }
        } else {
            logInfo("Updating ONU " + arrayToHexStr(serialNumber));
            ONUs[index].serialNumber = serialNumber;
            ONUs[index].state = "O3";
        }

        return index;
    },

    /** VerifyOrAssignONUID
     *  Verify if ONU-ID is valid, Affect an ONU-ID if is invalid or if is undefined
     *  \param Index of the ONU in the table
     *  \param ONUs table
     *  \return true if everything ok, otherwise return false
     */
    VerifyOrAssignONUID: function(index, ONUs, minONUID) {
        if ((ONUs[index].ONUID != undefined) && ((ONUs[index].ONUID < 0) || (ONUs[index].ONUID > 253))) {
            logWarning(ONUs[index].ONUID + " is an invalid ONU-ID parameter, a new value will be defined");
            ONUs[index].ONUID = undefined;
        }
        if (minONUID == undefined)
            minONUID = 0;

        if (ONUs[index].ONUID == undefined) {
            for (var j = minONUID; j <= 253; j++) {
                var idAvailable = true;
                for (var p = 0; p < ONUs.length; p++) {
                    if (ONUs[p].ONUID == j) {
                        idAvailable = false;
                        break;
                    }
                }
                if (idAvailable) {
                    ONUs[index].ONUID = j;
                    break;
                }
            }
            if (ONUs[index].ONUID == undefined) return false;
        }

        return true;
    },

    /** Activate And Range new ONU using specified parameter
     *  \param ONUs With value at undefined, it will try to range every ONUs on the PON
     *  \param ONUs With integer value, it will try to range the number of ONUs provided
     *  \param ONUs With an array of ONUs struture, it will try to range every ONUs provided in the array
     */
    ActivateAndRangeONUs: function(ONUs, minONUID) {
        var ONUToRange = 253;
        var ONURanged = 0;
        var nb_repeat = 3;

        // If ONUs is undefined means that all ONUs found must be ranged
        if (ONUs == undefined) {
            logInfo("Activating and ranging ONUs");
            ONUs = [];

            // If ONUs is an array it means that all ONUs within must be ranged
        } else if (Array.isArray(ONUs)) {
            if (ONUs.length <= 0) {
                logInfo("Activating and ranging ONUs");
            } else {
                logInfo("Activating and ranging " + ONUs.length + " ONUs");
                ONUToRange = 0; ///set to 0, as the length of the array will prevail
            }

            // If ONUs is a number try to range this number of ONUs
        } else if (typeof ONUs == "number") {
            logInfo("Activating and ranging " + ONUs + " ONUs");
            ONUToRange = ONUs;
            ONUs = [];

            // If ONUs is not a tab, create a tab with the ONU
        } else { ///Must be an object
            logInfo("Activating and ranging ONU " + ONUs.ONUID + "(serial: " + arrayToHexStr(ONUs.serialNumber) + ")");
            var temp = ONUs;
            ONUs = [];
            ONUs.push(temp);
            ONUToRange = 0; ///set to 0, as the length of the array will prevail
        }

        do {
            var ONUFound = this.DiscoverONUs(ONUs, ONUToRange, 1);
            // Try to range ONUs who may not have been able to be ranged
            for (var f = 0; f < ONUs.length; f++) {
                if ((ONUs[f].state != "O5") && (ONUs[f].state != "O2")) {
                    if (!this.VerifyOrAssignONUID(f, ONUs, minONUID)) {
                        logError("no ONU-ID valid is available");
                        continue;
                    }
                    ONUs[f] = this.rangeONU(ONUs[f]);
                    if (ONUs[f].state == "O5") ++ONURanged;
                }
            }
            if (ONUFound == 0) --nb_repeat;
            if ((ONURanged >= ONUToRange) && (ONURanged >= ONUs.length)) nb_repeat = 0;

        } while (nb_repeat)

        return ONUs;
    },

    ActivateAndRangeONUForSerialNumber: function(onuId, serialNumber) {
        this.ActivateAndRangeONU(onuId, 0, serialNumber);
    },


    /** Activate And Range a new ONU using the specified onuId with FEC upstream activated
     * \param onuId ONU-ID to use for the new ONU (in range [0..253])
     */
    ActivateAndRangeONUWithFEC: function(onuId) {
        this.ActivateAndRangeONU(onuId, 1);
    },

    /** Create a specific OMCC for the specified onuId
     * \param onuId ONU-ID of the ONU on which to create omcc
     * \param omcc OMCC number to use
     */
    CreateOMCC: function(onuId, omcc) {
        logInfo("Creating OMCC " + omcc);
        /// Check all parameters
        if ((onuId < 0) || (onuId > 253)) {
            return logError("Invalid ONU-ID parameter used in PLOAM.CreateOMCC");
        }
        var times = 3; /// Send 3 times configure Port-ID
        do {
            sendPLOAM("Configure_Port-ID", 1, {
                "onuid": onuId,
                "activate": 1,
                "portid": omcc
            });
            var res = waitForPLOAM("Acknowledge", onuId, this.Timeout);
            if (res != undefined) {
                this.OMCC[onuId] = omcc;
                logInfo("OMCC " + omcc + " created");
                this.GEMPorts.push(omcc);
                return;
            }
            logWarning("No Configure Port-ID Acknowledge received");
            sleep(5);
            times--;
        } while (times > 0);
        testFailed("No Configure Port-ID Acknowledge received");
    },

    /** Gets an unused GEM port for data traffic & automatically reserves it
     */
    GetUnusedDataGEMPort: function() {
        var newGEM = RandomIntegerExcept(this.MinDataGEMPort, 4094, this.GEMPorts);
        this.GEMPorts.push(newGEM);
        return newGEM;
    },

    /** Reserves a data GEM port. Returns the GEM port if successful.
     */
    ReserveDataGEMPort: function(GEMPort) {
        if (this.GEMPorts.indexOf(GEMPort) < 0) {
            this.GEMPorts.push(GEMPort);
            return GEMPort;
        }
        logError(GEMPort + " is already reserved");
        return undefined;
    },

    /** Deactivate an ONU
     * \param onuId ONU-ID of the ONU to disable
     */
    DeactivateONUs: function(minOrArray, maxOrUnused) {
        if (minOrArray == undefined)
            this.DeactivateONUs(0, 254);
        else if (Array.isArray(minOrArray)) {
            for (var i in minOrArray) {
                sleep(10);
                this.DeactivateONU(i);
            }
        } else {
            ///minOrArray assumed to be a number;
            if (typeof maxOrUnused != "number")
                this.DeactivateONU(minOrArray);
            else {
                for (var i = minOrArray; i < maxOrUnused; i++) {
                    sleep(10);
                    this.DeactivateONU(i);
                }
            }
        }
    },

    /** Deactivate an ONU
     * \param onuId ONU-ID of the ONU to disable
     */
    DeactivateONU: function(onuId) {
        logInfo("Deactivating ONU " + onuId);
        /// Check all parameters
        if ((onuId < 0) || (onuId > 253)) {
            return logError("Invalid ONU-ID parameter used in PLOAM.DeactivateONU");
        }
        /// Disable the ONU-ID
        sendPLOAM("Deactivate_ONU-ID", 3, {
            "onuid": onuId
        });
        /// Remove the serial number
        this.SerialNumber[onuId] = {};
        /// Remove OMCC BWMap entry for the specified ONU
        bwmapDelEntry(onuId);
        bwmapDelEntry(this.OMCC[onuId]);
        logInfo("ONU " + onuId + " Deactivated");
    },

    /** Set the BER Interval
     * \param onuId ONU-ID on which to set the BER Interval
     * \param interval BER Interval in seconds
     */
    SetBERInterval: function(onuId, interval) {
        logInfo("Setting BER Interval on ONU " + onuId + " To " + interval + " seconds");
        /// Send the BER Interval message 3 times
        sendPLOAM("BER_Interval", 1, {
            "onuid": onuId,
            "interval": interval * 8000
        });
        var res = waitForPLOAM("Acknowledge", onuId, this.Timeout);
        if (res == undefined) testFailed("No BER Interval Acknowledge found");
        sendPLOAM("BER_Interval", 1, {
            "onuid": onuId,
            "interval": interval * 8000
        });
        sleep(5);
        sendPLOAM("BER_Interval", 1, {
            "onuid": onuId,
            "interval": interval * 8000
        });
        logInfo("BER Interval set");
    },

    /** Assign Alloc ID
     * \param onuId ONU-ID on which to assign the Alloc ID
     * \param Alloc ID
     */
    AssignAllocId: function(onuId, allocid) {
        logInfo("Assigning AllocId " + allocid + " on ONU " + onuId);
        var times = 3;
        do {
            sendPLOAM("Assign_Alloc-ID", 1, {
                "onuid": onuId,
                "allocid": allocid
            });
            var res = waitForPLOAM("Acknowledge", onuId, this.Timeout);
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

    /** Retrieve the Password of the specified ONU
     * \param onuId ONU-ID of the ONU to retrieve the password
     * \return Integer array containing the 10 password bytes
     */
    GetPassword: function(onuId) {
        logInfo("Getting Password for ONU " + onuId);
        /// Send the request password message
        sendPLOAM("Request_password", 1, {
            "onuid": onuId
        });
        var password = waitForPLOAM("Password", onuId, this.Timeout);
        if (password == undefined) testFailed("No Password response found");
        password = password.slice(0, 10);
        logInfo("Password is " + arrayToHexStr(password) + ': "' + ArrayToString(password) + '"');
        return password;
    },

    /** Activate the encryption of the specified portId
     * \param onuId ONU-ID on which to retrieve the Key
     * \param portId PortID to encrypt
     */
    ActivateEncryption: function(onuId, portId) {
        logInfo("Activating encryption for ONU " + onuId + " / PortId " + portId);
        /// Request a new Key from the ONU if none already present
        if (this.Key[onuId] == undefined) {
            /// Request the key
            sendPLOAM("Request_Key", 1, {
                "onuid": onuId
            });
            /// Wait for the two fragment repeated 3 times each (6 messages)
            var resp = waitForPLOAM("Encryption_Key", onuId, this.Timeout, 6);
            if (resp == undefined) testFailed("Unable to retrieve Encryption Key from the ONU " + onuId);
            /// Extract the key from the resp
            var frag1 = undefined;
            var frag2 = undefined;
            /// Split response into fragment
            for (var i = 0;
                (i < 6); ++i) {
                var frag = [];
                for (var j = 0; j < 11; ++j) frag[j] = resp[i * 11 + j];
                if (frag != undefined) {
                    if (frag[1] == 0x00) {
                        frag1 = frag;
                        logInfo("Received first Key fragment");
                    } else {
                        frag2 = frag;
                        logInfo("Received second Key fragment");
                    }
                }
            }
            if ((frag1 == undefined) || (frag2 == undefined)) {
                testFailed("Unable to retrieve Encryption Key from the ONU " + onuId);
            }
            logInfo("Key is complete");
            /// Build the key from the two fragment
            this.Key[onuId] = [];
            for (var i = 0; i < 8; ++i) this.Key[onuId][i] = frag1[i + 2];
            for (var i = 0; i < 8; ++i) this.Key[onuId][i + 8] = frag2[i + 2];
        }
        /// Activate the encryption and send Key switching time
        startEncryption(onuId, portId, this.Key[onuId]);
        logInfo("Encryption activated for ONU " + onuId + " / PortId " + portId);
        sleep(1000); // Key Switching time is given 1s in the future
        /// Send PLOAM to Set the port Id as encrypted
        sendPLOAM("Encrypted_Port-ID", 3, {
            "onuid": onuId,
            "portid": portId,
            "encrypted": 1
        });
        var res = waitForPLOAM("Acknowledge", onuId, this.Timeout);
        if (res == undefined)
            logError("No acknowledge received for encrypted port id message");
        sleep(1000); /// sleep long enough for the MT2 browser to take the encryption info into account
    },

    DeactivateEncryption: function(onuId, portId) {
        sendPLOAM("Encrypted_Port-ID", 3, {
            "onuid": onuId,
            "portid": portId,
            "encrypted": 0
        });
        var res = waitForPLOAM("Acknowledge", onuId, this.Timeout);
        if (res == undefined)
            logError("No acknowledge received for encrypted port id message");
        sleep(1000); /// sleep long enough for the MT2 browser to take the encryption info into account
    },

    waitFor: function(message, onuId, timeOut, nb) {
        var res = waitForPLOAM(message, onuId, timeOut, nb);
        return res;
    }


};


addHelpInfo("PLOAM.ActivateAndRangeONU", "ActivateAndRangeONU(onuId, FEC, serialNumber): Activate And Range a new ONU using the specified onuId. If serialNumber is provided (as a byte array), will only accept this one.");
addHelpInfo("PLOAM.ActivateAndRangeONUForSerialNumber", "ActivateAndRangeONUForSerialNumber(onuId, serialNumber): Activate And Range a new ONU using the specified onuId and serialNumber (passed as a byte array)");
addHelpInfo("PLOAM.ActivateAndRangeONUs", "Activate And Range several ONUs", "ONUs | NbOfONUs | ONU", "ONUs: an array of ONUs objects, with at least the serialNumber attribute specified (if the attribute ONUID is specified, the ONU Id will use the provided value\nNbOfONUs: the number of ONUs to range\nONU: an ONU object, with serialNumber defined");
addHelpInfo("PLOAM.ActivateAndRangeONUWithFEC", "ActivateAndRangeONUWithFEC(onuId): Activate And Range a new ONU using the specified onuId with upstream FEC activated");
addHelpInfo("PLOAM.ActivateEncryption", "ActivateEncryption(onuId, portId): Activate the encryption of the specified portId");
addHelpInfo("PLOAM.AssignAllocId", "AssignAllocId(onuId, allocid): Assign Alloc ID allocid to the specified onuId");
addHelpInfo("PLOAM.CreateOMCC", "CreateOMCC(onuId, omcc): Create a specific OMCC for the specified onuId");
addHelpInfo("PLOAM.DeactivateEncryption", "DeactivateEncryption(onuId, portId): Deactivate the encryption of the specified portId");
addHelpInfo("PLOAM.DeactivateONU", "DeactivateONU(onuId): Deactivate the ONU with specified onuId");
addHelpInfo("PLOAM.DeactivateONUs", "Deactivate a set of ONUs based on their ONU-Id", ["minOrArray", "maxOrUnused"], ["if undefined, will deactivate all ONUs;\nif a number, minimum ONU-ID to deactivate;\nif an array, the array of ONU-ID to deactivate", "if provided, upper bound of the ONU-IDs to deactivate"]);
addHelpInfo("PLOAM.GetPassword", "GetPassword(onuId): Ask and return the Password of the specified ONU");
addHelpInfo("PLOAM.GetUnusedDataGEMPort", "GetUnusedDataGEMPort(): gets an unused data gem port value, and reserves it");
addHelpInfo("PLOAM.ReserveDataGEMPort", "ReserveDataGEMPort(GEMPort): reserves the GEM port, if available. returns the GEM port if successful, undefined otherwise");
addHelpInfo("PLOAM.SetBERInterval", "SetBERInterval(onuId, interval): Set the BER Interval for the specified onuId to interval seconds");
addHelpInfo("PLOAM.waitFor", "waitFor: function(message, onuId, timeOut): wait for a specific PLOAM message");