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

include('IP.js');

OMCI = {
    /// OMCI version -- this setting must be consistent with the OMCI definitin folder provided for
    /// emulation in MT2Browser->Settings/Preferences/OMCI
    /// 1010 <=> OMCI/TR247
    /// 1210 <=> OMCI/eOLT-G988-1210
    Version: "1010", //"1210",
    /// Default timeout for OMCI ONU response (2000ms)
    Timeout: 2000,
    /// Number of message repetition before declaring error
    NbOfRepeat: 3,
    ///logging level:
    /// 0: normal logging level
    ///-1: info level are omitted
    ///-2: info & warning are omitted
    ///-3: info, warning & error are omitted
    ///-6: info, warning, error & test failure are omitted
    baseLogLevel: 0,
    /// Flag indicating if MIB consistency check has to be done
    MibConsistencyCheck: 1,
    /// Flag indicating the log level for MIB consistency issues
    /// >= 3: test is failed
    /// 2: an error is signaled in the log
    /// 1: a warning is signaled in the log
    /// 0: an info is signaled in the log
    MibConsistencyLogLevel: 3,
    /// Type
    Type: "Baseline", //"Extended",
    /// GEM Position policy
    GEMPositionPolicy: "bestfit", //"random" or an integer (=>fixed position) // policy other than bestfit will induce extra delay in processing

    send: function (omcc, msgType, priority, me, meid, attrs, retransmission, retransmissionTimeOut) {
        if ((this.Type == "Extended") && (MT2GUI == "MT2-Browser")) {
            sendExtendedOMCI(omcc, msgType, priority, me, meid, attrs, retransmission, retransmissionTimeOut, this.GEMPositionPolicy);
            return;
        }
        sendOMCI(omcc, msgType, priority, me, meid, attrs, retransmission, retransmissionTimeOut, this.GEMPositionPolicy);
        return;
    },

    /** performs an action and returns what the engine returns
     * \param omcc OMCC to work on
     * \param action
     * \param timeout on each attempt
     * \param me Managed entity class
     * \param meid Managed entity instance
     * \param attrs attributes, if any
     */
    Action: function (omcc, action, timeOut, me, meid, attrs) {
        var action_prettified = action.replace('_', ' ');
        var action_done = action + "_Done";
        if (timeOut == undefined)
            timeOut = this.Timeout;

        if (me == undefined)
            this.logInfo(action_prettified + " on OMCC " + omcc);
        else
            this.logInfo(action_prettified + "(" + me + "/" + meid + ") on OMCC " + omcc);

        for (var i = 0; i < this.NbOfRepeat; ++i) {
            this.send(omcc, action, 0, me, meid, attrs);
            /// Wait for the done event
            var res = waitForOMCI(omcc, action_done, timeOut);
            if (res == undefined) {
                this.logWarning("No Response on " + action + " message");
                continue;
            }
            break;
        }
        return res;
    },

    /** performs an complex action and returns what the engine returns
     *  A complex action is an action which requires multiple message
     *  exchanges (such as MIB upload)
     * \param omcc OMCC to work on
     * \param action
     * \param stepTimeOut: timeOut for on each message exchange
     * \pram globalTimeOut: timeOut for the whole action
     * \param me Managed entity class
     * \param meid Managed entity instance
     * \param attrs attributes, if any
     */
    ComplexAction: function (omcc, action, stepTimeOut, globalTimeOut, me, meid, attrs) {
        var action_prettified = action.replace('_', ' ');
        var action_done = action + "_Done";
        if (stepTimeOut == undefined)
            stepTimeOut = this.Timeout;
        if (globalTimeOut == undefined)
            this.testFailed("a global time out must be provided for complex actions");

        if (me == undefined)
            this.logInfo(action_prettified + " on OMCC " + omcc);
        else
            this.logInfo(action_prettified + "(" + me + "/" + meid + ") on OMCC " + omcc);

        this.send(omcc, action, 0, me, meid, attrs, this.NbOfRepeat, stepTimeOut);
        /// Wait for the done event
        var res = waitForOMCI(omcc, action_done, globalTimeOut);
        if (res == undefined) {
            this.logWarning("No Response on " + action + " message");
        }
        return res;
    },

    /** performs an action which returns a result code
     * \param omcc OMCC to work on
     * \param action
     * \param timeout on each attempt
     * \param me Managed entity class
     * \param meid Managed entity instance
     * \param attrs attributes, if any
     */
    ScalarAction: function (omcc, action, timeOut, me, meid, attrs) {
        var res = this.Action(omcc, action, timeOut, me, meid, attrs);

        if (res == undefined)
            this.testFailed("No Response on " + action + " message");
        if (res != 0x00)
            this.testFailed("Error code 0x" + res.hex(2, '0') + " Response on " + action + " message");

        this.logInfo(action + " Done for OMCC " + omcc);
        return;
    },

    /** performs a complext action which returns a result code
     * \param omcc OMCC to work on
     * \param action
     * \param stepTimeOut: timeOut for on each message exchange
     * \pram globalTimeOut: timeOut for the whole action
     * \param me Managed entity class
     * \param meid Managed entity instance
     * \param attrs attributes, if any
     */
    ComplexScalarAction: function (omcc, action, stepTimeOut, globalTimeOut, me, meid, attrs) {
        var res = this.ComplexAction(omcc, action, stepTimeOut, globalTimeOut, me, meid, attrs);

        if (res == undefined)
            this.testFailed("No Response on " + action + " message");
        if (res != 0x00)
            this.testFailed("Error code 0x" + res.hex(2, '0') + " Response on " + action + " message");

        this.logInfo(action + " Done for OMCC " + omcc);
        return;
    },

    /** performs an action which returns an object or a return code
     * \param omcc OMCC to work on
     * \param action
     * \param timeout on each attempt
     * \param me Managed entity class
     * \param meid Managed entity instance
     * \param attrs attributes, if any
     */
    ObjectAction: function (omcc, action, timeOut, me, meid, attrs, optional) {
        var res = this.Action(omcc, action, timeOut, me, meid, attrs);

        if (res == undefined) {
            if (optional)
                this.logWarning("No Response on " + action + " message");
            else
                this.testFailed("No Response on " + action + " message");
            return;
        } else if ((!isNaN(res)) && (res != 0x00)) {
            if (optional)
                this.logWarning("Error code 0x" + res.hex(2, '0') + " Response on Get message");
            else
                this.testFailed("Error code 0x" + res.hex(2, '0') + " Response on Get message");
            return res;
        }
        this.logInfo(action + " Done for OMCC " + omcc);
        return res;
    },

    /** Sends a reboot to the ONU
     * \param omcc OMCC to work on
     */
    Reboot: function (omcc) {
        this.ScalarAction(omcc, "Reboot", this.Timeout * 4, 256, 0);
    },

    /** Force a MIB Reset and reset the MIB sync counter
     * \param omcc OMCC to work on
     */
    MIB_Reset: function (omcc) {
        this.ScalarAction(omcc, "MIB_Reset", this.Timeout * 4);
        /// Pause execution for 1 second
        sleep(1000);
        return;
    },

    /** Initiate a MIB Upload (and populate internal database)
     * Return when the MIB upload is done
     * \param omcc OMCC to work on
     */
    MIB_Upload: function (omcc) {
        this.ComplexScalarAction(omcc, "MIB_Upload", this.Timeout, this.Timeout * 120);
    },

    /** Send a 'create' OMCI command and verify execution by checking the 'get' OMCI command response
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param attrs Attribute list
     */
    Create: function (omcc, ME, attrs) {
        this.logInfo("Create " + ME);
        for (var i = 0; i < this.NbOfRepeat; ++i) {
            /// Send the Create message into the OMCC
            this.send(omcc, "Create", 0, ME, 0, attrs);
            /// Wait for the Create done event
            var meid = waitForOMCI(omcc, "Create_Done", this.Timeout);
            if (meid != undefined) {
                this.logInfo(ME + " created with meid " + meid);
                break;
            }
        }
        if (meid == undefined)
            this.testFailed("No Response on Create message");
        /// Check MIB consistency
        if (this.MibConsistencyCheck == 1) {
            /// Count attribute in attrs
            var cnt = 0;
            for (var i in attrs)
                cnt++;
            if (cnt != 0) {
                /// Do separate Get on each attributes
                for (var attr in attrs) {
                    /// Check that Create as been correctly executed
                    if (attr != "meid")
                        this.AssertAttributeInResp(ME, meid, attr, attrs[attr], this.Get(omcc, ME, meid, [attr]));
                }
            }
        }
        return meid;
    },

    CreateDynamicACLTableRowContent: function (rowMembers) {
        if (rowMembers["RowContent"] != undefined)
            return rowMembers["RowContent"];
        var rowContent = new Array();
        /// initialize to 0
        for (var i = 0; i < 22; i++) {
            rowContent.push(0);
        }
        if (rowMembers["TableIndex"] != undefined) {
            var tableIndex = rowMembers["TableIndex"];
            ///check row part
            var rowPart = (tableIndex >> 11) & 0x7;
            if (rowPart == 1) {
                // For now expect RowContent to be defined in such case
            } else if (rowPart == 2) {
                // For now expect RowContent to be defined in such case
            } else {
                //Fall back on row part 0 format
                if (rowMembers["GEMPortID"] != undefined) {
                    rowContent[0] = (rowMembers["GEMPortID"] >> 8) & 0x000000ff;
                    rowContent[1] = rowMembers["GEMPortID"] & 0x000000ff;
                }
                if (rowMembers["VlanID"] != undefined) {
                    rowContent[2] = (rowMembers["VlanID"] >> 8) & 0x000000ff;
                    rowContent[3] = rowMembers["VlanID"] & 0x000000ff;
                }
                var addrArray;
                if (rowMembers["SourceIPAddr"] != undefined) {
                    addrArray = IP.Parse_IP_Address(rowMembers["SourceIPAddr"]);
                    rowContent[4] = addrArray[0];
                    rowContent[5] = addrArray[1];
                    rowContent[6] = addrArray[2];
                    rowContent[7] = addrArray[2];
                }
                if (rowMembers["DestIPAddrStart"] != undefined) {
                    addrArray = IP.Parse_IP_Address(rowMembers["DestIPAddrStart"]);
                    rowContent[8] = addrArray[0];
                    rowContent[9] = addrArray[1];
                    rowContent[10] = addrArray[2];
                    rowContent[11] = addrArray[2];
                }
                if (rowMembers["DestIPAddrEnd"] != undefined) {
                    addrArray = IP.Parse_IP_Address(rowMembers["DestIPAddrEnd"]);
                    rowContent[12] = addrArray[0];
                    rowContent[13] = addrArray[1];
                    rowContent[14] = addrArray[2];
                    rowContent[15] = addrArray[2];
                }
                if (rowMembers["ImputedGroupBandwidth"] != undefined) {
                    rowContent[16] = (rowMembers["ImputedGroupBandwidth"] >> 24) & 0x000000ff;
                    rowContent[17] = (rowMembers["ImputedGroupBandwidth"] >> 16) & 0x000000ff;
                    rowContent[18] = (rowMembers["ImputedGroupBandwidth"] >> 8) & 0x000000ff;
                    rowContent[19] = rowMembers["ImputedGroupBandwidth"] & 0x000000ff;
                }
            }
        }
        return rowContent;
    },

    /** Send a 'set' OMCI command and verify execution by checking the 'get' OMCI command response
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param meid Managed Entity Id
     * \param attrs Attribute list
     */
    Set: function (omcc, ME, meid, attrs) {
        if ((this.Version == "1210") && (ME == "Multicast_Opr_Profile")) {
            //OMCI 2012: Special handling for this entity, as the format depends on the content for the ACL tables: fall back to an opaque array
            if (attrs["DynamicACLTable"] != undefined) {
                var tableMembers = new Object();
                tableMembers["TableIndex"] = attrs["DynamicACLTable"]["TableIndex"];
                tableMembers["RowContent"] = this.CreateDynamicACLTableRowContent(attrs["DynamicACLTable"]);
                attrs["DynamicACLTable"] = tableMembers;
            }
            if (attrs["StaticACLTable"] != undefined) {
                var tableMembers = new Object();
                tableMembers["TableIndex"] = attrs["StaticACLTable"]["TableIndex"];
                tableMembers["RowContent"] = this.CreateDynamicACLTableRowContent(attrs["StaticACLTable"]);
                attrs["StaticACLTable"] = tableMembers;
            }
        }
        this.ScalarAction(omcc, "Set", this.Timeout, ME, meid, attrs);

        var MibConsistencyCheck = this.MibConsistencyCheck;
        ///disable the mib consistency check when the action leads to deletion of a table item
        if ((ME == "Ext_VLAN_Tagging_Opr_Config_Data") &&
            (attrs["RcvFrameVLANTagOperTbl"] != undefined) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatTagsToRemove'] == 0x03) &&
            (attrs["RcvFrameVLANTagOperTbl"]['Padding3'] == 0x3ff) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatOuterPriority'] == 0x0f) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatOuterVID'] == 0x1fff) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatOuterTPID'] == 0x07) &&
            (attrs["RcvFrameVLANTagOperTbl"]['Padding4'] == 0xfff) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatInnerPriority'] == 0x0f) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatInnerVID'] == 0x1fff) &&
            (attrs["RcvFrameVLANTagOperTbl"]['TreatInnerTPID'] == 0x07))
            MibConsistencyCheck = 0;

        if ((ME == "Multicast_Opr_Profile") &&
            (attrs["DynamicACLTable"] != undefined) &&
            ((attrs["DynamicACLTable"]['TableIndex'] & 0x8000) != 0))
            MibConsistencyCheck = 0;

        if ((ME == "ONU_remote_debug") && (attrs["Command"] != undefined))
            MibConsistencyCheck = 0;

        /// Check MIB consistency
        if (MibConsistencyCheck) {
            /// Count attribute in attrs
            var cnt = 0;
            for (var i in attrs)
                cnt++;
            if (cnt != 0) {
                /// Do separate Get on each attributes
                for (var attr in attrs) {
                    if (attr != "meid")
                        this.AssertAttributeInResp(ME, meid, attr, attrs[attr], this.Get(omcc, ME, meid, [attr]));
                }
            }
        }
    },

    /** Send a 'get' OMCI command and return the result
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param meid Managed Entity Id
     * \param attrs Attribute list
     */
    Get: function (omcc, ME, meid, attrs, optional) {
        /// Check if attrs list is not empty
        var cnt = 0;
        for (var i in attrs)
            cnt++;
        if (cnt == 0)
            this.logWarning("Get with empty attribute list on " + ME);

        return this.ObjectAction(omcc, "Get", this.timeOut, ME, meid, attrs, optional);
    },

    /** Send a 'get' OMCI command and return the result
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param meid Managed Entity Id
     * \param attrs Attribute list
     */
    GetCurrentData: function (omcc, ME, meid, attrs) {
        /// Check if attrs list is not empty
        var cnt = 0;
        for (var i in attrs)
            cnt++;
        if (cnt == 0)
            this.logWarning("Get_Current_Data with empty attribute list on " + ME);

        return this.ObjectAction(omcc, "Get_Current_Data", this.timeOut, ME, meid, attrs);
    },

    /** Send a 'delete' OMCI command and return the result
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     */
    Delete: function (omcc, ME, meid) {
        this.ScalarAction(omcc, "Delete", this.Timeout, ME, meid);
    },

    /** Initiate a Get all alarms Upload
     * Return when the Get all alarms is done
     * \param omcc OMCC to work on
     */
    Get_All_Alarms: function (omcc) {
        this.ScalarAction(omcc, "Get_All_Alarms", this.Timeout * 5);
    },

    /** Wait for an alarm
     * Return when an alarm is found
     * \param omcc OMCC to work on
     */
    Wait_Alarm: function (omcc, timeout) {
        this.logInfo("Waiting alarm on OMCC " + omcc);
        /// Wait for the alarm
        var alarmObj = waitForOMCIAlarm(omcc, timeout * 1000);
        this.logInfo("Alarms Found for OMCC " + omcc + ": " + alarmObj.alarm);
        return alarmObj;
    },

    /** Do a software download
     * \param omcc OMCC to work on
     * \param filename Firmware filename
     * \param windowSize Window size to use
     */
    Software_Download: function (omcc, meid, filename, windowSize) {
        this.logInfo("Software download on OMCC " + omcc);
        /// Load the file
        var firmware = readFile(filename);
        /// Test if file is correctly loaded
        if (firmware.length == 0)
            this.testFailed("Unable to read the firmware file");
        this.logInfo("Firmware file size is " + firmware.length);
        /// Get the number of segment
        var nbOfSegment = Math.round(firmware.length / 31);
        /// Compute last segment size
        var lastSegment = firmware.length - (nbOfSegment * 31);
        /// Compute nb of window to send
        var nbOfWindow = Math.round(nbOfSegment / windowSize);
        /// Compute last window size
        var lastWindowSize = nbOfSegment - (nbOfWindow * windowSize);
        /// Send the start download message
        this.send(omcc, "Start_Software_Download", 0, 0, meid, {
            "imageSize": firmware.length,
            "nbOfCircuitPack": 1,
            "softImageInstance": meid,
            "windowSize": windowSize
        });
        /// Wait response
        var newWindowSize = waitForOMCI(omcc, "Start_Software_Download_Done", this.Timeout);
        /// Check window size
        if (newWindowSize != (windowSize - 1))
            this.testFailed("ONU refuse window size " + windowSize + " and ask for a window size of " + newWindowSize);
        this.logInfo("Software will be sent in " + nbOfWindow + " block");
        /// For each window
        for (var i = 0; i < nbOfWindow; ++i) {
            if ((i % 32) == 0)
                this.logInfo("Sending section " + i + " / " + nbOfWindow);
            /// Get the chunk of data
            var dataSeg = firmware.mid(i * windowSize * 31, 31 * windowSize);
            /// Send the segment
            this.send(omcc, "Download_Section", 0, 0, meid, dataSeg.toHexString());
            /// Wait for the ack of the segment
            waitForOMCI(omcc, "Download_Section_Done", 10000);
        }
        if (lastWindowSize) {
            /// Send last window
            this.logInfo("Sending last section");
            /// Get the chunk of data
            var dataSeg = firmware.mid(nbOfWindow * windowSize * 31, firmware.length);
            /// Send the segment
            this.send(omcc, "Download_Section", 0, 0, meid, dataSeg.toHexString());
            /// Wait for the ack of the segment
            waitForOMCI(omcc, "Download_Section_Done", 10000);
        }
        /// Wait for the write
        sleep(100);
        /// Send End of Sowftare download
        this.send(omcc, "End_Software_Download", 0, 0, meid, {
            "imageSize": firmware.length,
            "nbOfCircuitPack": 1,
            "softImageInstance": meid,
            "windowSize": windowSize,
            "crc32": firmware.aal5crc()
        });
        /// Wait for the ack of the end (Wait for the busy)
        waitForOMCI(omcc, "End_Software_Download_Done", 5 * this.Timeout);
    },

    /** Activate the software
     */
    Activate_Software: function (omcc, meid) {
        this.ScalarAction(omcc, "Activate_Software", this.Timeout, 0, meid);
    },

    /** Commit the software
     */
    Commit_Software: function (omcc, meid) {
        this.ScalarAction(omcc, "Commit_Software", this.Timeout, 0, meid);
    },

    /** Return the meid of the n-th Entity available in the database
     * \param omcc OMCC to work on
     * \param entity to search for
     * \param n Index of the T-CONT meid to retrieve
     */
    GetEntity: function (omcc, entity, n) {
        if (undefined == n)
            n = 0;
        this.logInfo("Getting the " + n + " " + entity + " from database");
        var req = "SELECT DISTINCT meid FROM " + entity + " WHERE " + this.DBOMCCIdentifierString() + "==" + omcc + " ORDER BY meid ASC LIMIT " + n + ",1";
        sqlRequest(omcc, req);
        /// Wait for the SQLREQ done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.logError("Unable to get " + n + " " + entity + " from database");
        } else {
            this.logInfo(entity + " meid is " + resp);
        }
        return resp;
    },

    /** Return the meid of the n-th T-CONT available in the database
     * \param omcc OMCC to work on
     * \param n Index of the T-CONT meid to retrieve
     */
    GetTCONT: function (omcc, n) {
        this.logInfo("Getting the " + n + " T-CONT meid from database");
        /// Get T-CONT from DB
        var req = "SELECT DISTINCT T_CONT.meid FROM Priority_Queue, T_CONT WHERE Priority_Queue." + this.DBOMCCIdentifierString() + "==" + omcc + " AND T_CONT." + this.DBOMCCIdentifierString() + "==" + omcc + " AND (ROUND(Priority_Queue.RelatedPort/65536) =  ROUND(T_CONT.meid)) AND Priority_Queue.meid >= 32768 ORDER BY T_CONT.meid ASC LIMIT " + n + ",1";

        //    var req = "SELECT DISTINCT T_CONT.meid FROM Priority_Queue, T_CONT WHERE Priority_Queue.omcc="+omcc+" AND T_CONT.omcc="+omcc+" AND (Priority_Queue.RelatedPort BETWEEN 65536*T_CONT.meid AND 65537*T_CONT.meid) AND Priority_Queue.meid >= 32768 LIMIT " + n +",1";
        sqlRequest(omcc, req);
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get T-CONT " + n + " from database");
        }
        this.logInfo("T-CONT meid is " + resp);
        return resp;
    },

    /** Return the meid of the Upstream Priority Queue object with meid equal to T-CONT meid available in the database
     * \param omcc OMCC to work on
     * \param tcont T-CONT meid linked to the searched Upstream Priority Queue
     */
    GetUpPQ: function (omcc, tcont, prio) {
        this.logInfo("Getting UpPQ meid from database");
        ///Check for empty sets, as SELECT behavior is undefined in that case
        sqlRequest(omcc, "SELECT COUNT(meid) FROM Priority_Queue WHERE (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (meid >= 32768) AND (ROUND(RelatedPort/65536) = ROUND(" + tcont + ")) GROUP BY RelatedPort ORDER BY RelatedPort ASC LIMIT 0,1");
        var count = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        if ((count == null) || (count == 0)) {
            this.testFailed("No Upstream PriorityQueue attached to TCONT " + tcont + " from database");
        }
        if (prio == undefined)
            prio = 0; /// Default prio is supposed to be 0 (highest)
        else {
            sqlRequest(omcc, "SELECT COUNT(DISTINCT RelatedPort) FROM Priority_Queue WHERE  (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (ROUND(meid) >= ROUND(32768)) AND (ROUND(RelatedPort/65536) = ROUND(" + tcont + "))");
            count = waitForOMCI(omcc, "SQLREQ", this.Timeout + 10000);
            if ((count == null) || (count < prio)) {
                this.testFailed("No upstream PriorityQueue for TCONT " + tcont + " with priority " + prio);
            }
        }
        /// Get UpPQ from DB
        sqlRequest(omcc, "SELECT DISTINCT min(CAST(meid AS INT)) FROM Priority_Queue WHERE  (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (ROUND(meid) >= ROUND(32768)) AND (ROUND(RelatedPort/65536) = ROUND(" + tcont + ")) GROUP BY RelatedPort ORDER BY ROUND(RelatedPort) ASC LIMIT " + prio + ",1");
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get UpPQ connected to T-CONT " + tcont + " from database");
        }
        this.logInfo("UpPQ meid is " + resp);
        return resp;
    },

    GetDwPQFromRelatedPort: function (omcc, relPort, prio) {
        ///1st checks that there are available prioritu queues -- some versions of the sqlite library
        ///do not handle properly queries on empty set: condition per condition
        sqlRequest(omcc, "SELECT COUNT(meid) FROM Priority_Queue WHERE  (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (ROUND(meid) < ROUND(32768)) AND (ROUND(RelatedPort/65536) = ROUND(" + relPort + "))");
        var count = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        if ((count == null) || (count == 0)) {
            this.testFailed("No downstream Priority Queue is attached to related port " + relPort);
        }

        sqlRequest(omcc, "SELECT COUNT(DISTINCT RelatedPort) FROM Priority_Queue WHERE  (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (ROUND(meid) < ROUND(32768)) AND (ROUND(RelatedPort/65536) = ROUND(" + relPort + "))");
        count = waitForOMCI(omcc, "SQLREQ", this.Timeout + 10000);
        if ((count == null) || (count < prio)) {
            this.testFailed("No downstream priority for related port " + relPort + " with priority " + prio);
        }
        /// Get DwPQ from DB
        sqlRequest(omcc, "SELECT DISTINCT min(CAST(meid AS INT)) FROM Priority_Queue WHERE  (" + this.DBOMCCIdentifierString() + " == " + omcc + ") AND (ROUND(meid) < ROUND(32768)) AND (ROUND(RelatedPort/65536) = ROUND(" + relPort + ")) GROUP BY RelatedPort ORDER BY ROUND(RelatedPort) ASC LIMIT " + prio + ",1");
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get DwPQ  from database");
        }
        this.logInfo("DwPQ meid is " + resp);
        return resp;
    },

    /** Return the meid of the n-th Downstream Priority Queue object available in the database
     * \param omcc OMCC to work on
     * \param prio Priority of the U-interface meid to retrieve (0 for highest priority)
     * \param uni UNI Interface (1 for the first one) optional 1 is the default value
     * \param slot UNI Slot (1 for the first one) optional 1 is the default value
     */
    GetDwPQ: function (omcc, prio, uni, slot) {
        if (GetDownstreamPQAttachedEntity(omcc) == "VEIP") {
            return this.GetDwPQ_RG(omcc, prio, uni);
        }
        ///Check for empty sets, as SELECT behavior is undefined in that case
        this.logInfo("Getting the Priority " + prio + " DwPQ meid from database");
        /// Uni is optional (default value is 1)
        if (!uni)
            uni = 1;

        var relPort = undefined;
        if (slot) {
            ///force slot;
            relPort = uni + 256 * slot;
        } else {
            relPort = this.GetPPTPEthUni(omcc, uni - 1);
        }

        return this.GetDwPQFromRelatedPort(omcc, relPort, prio);
    },

    GetDwPQ_RG: function (omcc, prio, uni) {
        ///Check for empty sets, as SELECT behavior is undefined in that case
        this.logInfo("Getting the Priority " + prio + " DwPQ meid from database");
        /// Uni is optional (default value is 1)
        if (!uni)
            uni = 1;

        /// Slot is optional (default value is VEIP meid higher byte which represent the SLOT number)
        var relPort = this.GetVEIP(omcc, uni - 1);

        return this.GetDwPQFromRelatedPort(omcc, relPort, prio);
    },

    GetTerminationPoint: function (omcc, n) {
        var TPTypeStr = GetOMCITerminationPoint(omcc);
        if (TPTypeStr == "VEIP") {
            return this.GetVEIP(omcc, n);
        }
        return this.GetPPTPEthUni(omcc, n);
    },

    GetTerminationPointEntity: function (omcc) {
        return GetOMCITerminationPoint(omcc);
    },

    GetTPType: function (omcc) {
        var TPTypeStr = GetOMCITerminationPoint(omcc);
        if (TPTypeStr == "VEIP") {
            return 11;
        }
        return 1;
    },

    GetTPAssociationType: function (omcc) {
        var TPTypeStr = GetOMCITerminationPoint(omcc);
        if (TPTypeStr == "VEIP") {
            return 10;
        }
        return 2;
    },

    GetTPME: function (omcc) {
        var TPTypeStr = GetOMCITerminationPoint(omcc);
        if (TPTypeStr == "VEIP") {
            return 329;
        }
        return 11;
    },

    /** Return the meid of the n-th PPTPEthUni object available in the database
     * \param omcc OMCC to work on
     * \param n Index of the T-CONT meid to retrieve
     */
    GetPPTPEthUni: function (omcc, n) {
        this.logInfo("Getting the " + n + " PPTPEthUni meid from database");
        /// Get UpPQ from DB
        var meid = GetPPTPEthUniMeid(omcc, n);
        if (meid == undefined) {
            // default method: just pickup the nth one available
            sqlRequest(omcc, "SELECT meid FROM PPTPEthernetUni WHERE " + this.DBOMCCIdentifierString() + " == " + omcc + " ORDER BY meid ASC LIMIT " + n + "," + 1);
        } else {
            sqlRequest(omcc, "SELECT meid FROM PPTPEthernetUni WHERE " + this.DBOMCCIdentifierString() + " == " + omcc + " AND meid == " + meid);
        }
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get PPTPEthUni  from database");
        }
        this.logInfo("PPTPEthUni meid is " + resp);
        return resp;
    },

    GetVEIP: function (omcc, n) {
        this.logInfo("Getting the " + (n) + " VEIP meid from database");
        /// Get UpPQ from DB
        var meid = GetVEIPMeid(omcc, n);
        if (meid == undefined) {
            sqlRequest(omcc, "SELECT meid FROM VEIP WHERE " + this.DBOMCCIdentifierString() + " == " + omcc + " LIMIT " + (n) + "," + 1);
        } else {
            sqlRequest(omcc, "SELECT meid FROM VEIP WHERE " + this.DBOMCCIdentifierString() + " == " + omcc + " AND meid == " + (meid));
        }
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get VEIP  from database");
        }
        this.logInfo("VEIP meid is " + resp);
        return resp;
    },

    GetVirtualCardholder: function (omcc, n) {
        this.logInfo("Getting the " + n + " Cardholder meid from database");
        /// Get Cardholder that is marked as connected VEIP from DB
        sqlRequest(omcc, "SELECT meid FROM Cardholder WHERE " + this.DBOMCCIdentifierString() + " == " + omcc + " AND ActualPlugInUnitType == 48 LIMIT " + n + ",1");
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("Unable to get Cardholder  from database");
        }
        this.logInfo("Virtual cardholder meid is " + resp);
        return resp;
    },

    /** Get a specific MEID from the database
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param idx Return the idx-th entity meid
     */
    GetMEIDFromDb: function (omcc, ME, idx) {
        this.logInfo("Gathering Managed Entity id " + ME + " from database (idx: " + idx + ")");
        /// Get Managed Entity Id from DB
        getMeidFromDb(omcc, ME, idx);
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "MEID", this.Timeout);
        this.logInfo(ME + " (" + idx + ")" + " has id " + resp);
        return resp;
    },

    /** Execute a SQL request on the internal database and return the result
     * \param omcc OMCC to work on
     * \param req SQL request to execute
     */
    Request: function (omcc, req) {
        this.logDebug("Requesting '" + req + "' from database");
        /// Get Managed Entity Id from DB
        sqlRequest(omcc, req);
        /// Wait for the OMCI MIB Reset done event
        var resp = waitForOMCI(omcc, "SQLREQ", this.Timeout);
        /// Verify the response
        if (resp == null) {
            this.testFailed("No response for SQL Request");
        }
        this.logDebug("Request response is " + resp);
        return resp;
    },

    GetUnicastGEMCount: function (omcc) {
        var resp = this.Request(omcc, "SELECT COUNT (DISTINCT GEM_port_network_CTP.meid) FROM GEM_port_network_CTP, GEM_Interworking_Termination_Point WHERE GEM_port_network_CTP." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point." + this.DBOMCCIdentifierString() + "==" + omcc + " AND GEM_Interworking_Termination_Point.GEMPortNetworkCTPPointer == GEM_port_network_CTP.meid");

        return resp;
    },

    GetUnicastGEM: function (omcc, index) {
        var resp;

        if (index == undefined)
            index = 0;

        var maxIndex = this.GetUnicastGEMCount(omcc);

        if (index < maxIndex) {
            resp = this.Request(omcc, "SELECT DISTINCT min(CAST(GEM_port_network_CTP.PortId AS INT)) FROM GEM_port_network_CTP,GEM_Interworking_Termination_Point WHERE (GEM_port_network_CTP." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point.GEMPortNetworkCTPPointer == GEM_port_network_CTP.meid) GROUP BY GEM_port_network_CTP.PortId ORDER BY ROUND(GEM_port_network_CTP.PortId) ASC LIMIT " + index + ",1");
        }

        return resp;
    },

    GetUnicastGEMs: function (omcc) {
        var resp = [];
        var maxIndex = this.GetUnicastGEMCount(omcc);

        for (var i = 0; i < maxIndex; i++) {
            resp.push(this.GetUnicastGEM(omcc, i));
        }
        return resp;
    },

    GetUnicastGEMForPbitCount: function (omcc, pbit) {
        var resp = this.Request(omcc, "SELECT COUNT(DISTINCT GEM_port_network_CTP.PortId) FROM GEM_port_network_CTP,GEM_Interworking_Termination_Point,Pbit_Mapper_Service_Profile WHERE (GEM_port_network_CTP." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point." + this.DBOMCCIdentifierString() + " == " + omcc + " AND Pbit_Mapper_Service_Profile." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point.GEMPortNetworkCTPPointer == GEM_port_network_CTP.meid AND GEM_Interworking_Termination_Point.ServiceProfilePointer == Pbit_Mapper_Service_Profile.meid AND (GEM_Interworking_Termination_Point.InterworkingOpt==5 OR GEM_Interworking_Termination_Point.InterworkingOpt==\"802.1p mapper\") AND P" + pbit + "Ptr==GEM_Interworking_Termination_Point.meid)");

        return resp;
    },

    GetUnicastGEMForPbit: function (omcc, pbit, index) {
        var resp;

        if (index == undefined)
            index = 0;

        var maxIndex = this.GetUnicastGEMForPbitCount(omcc, pbit);

        if (index < maxIndex) {
            resp = this.Request(omcc, "SELECT DISTINCT min(CAST(GEM_port_network_CTP.PortId AS INT)) FROM GEM_port_network_CTP,GEM_Interworking_Termination_Point,Pbit_Mapper_Service_Profile WHERE (GEM_port_network_CTP." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point." + this.DBOMCCIdentifierString() + " == " + omcc + " AND Pbit_Mapper_Service_Profile." + this.DBOMCCIdentifierString() + " == " + omcc + " AND GEM_Interworking_Termination_Point.GEMPortNetworkCTPPointer == GEM_port_network_CTP.meid AND GEM_Interworking_Termination_Point.ServiceProfilePointer == Pbit_Mapper_Service_Profile.meid AND (GEM_Interworking_Termination_Point.InterworkingOpt==5 OR GEM_Interworking_Termination_Point.InterworkingOpt==\"802.1p mapper\") AND P" + pbit + "Ptr==GEM_Interworking_Termination_Point.meid) GROUP BY GEM_port_network_CTP.PortId ORDER BY ROUND(GEM_port_network_CTP.PortId) ASC LIMIT " + index + ",1");
        }

        return resp;
    },

    GetUnicastGEMsForPbit: function (omcc, pbit) {
        var resp = [];
        var maxIndex = this.GetUnicastGEMForPbitCount(omcc, pbit);

        for (var i = 0; i < maxIndex; i++) {
            resp.push(this.GetUnicastGEMForPbit(omcc, pbit, i));
        }
        return resp;
    },

    GetUnicastGEMsForVID: function (omcc, VID) {
        var resp = [];
        var onuId = omcc;
        if ((getDeviceType() == "eOLT-GPON") || (getDeviceType() == "NIVA-GPON")) {
            ///GPON: OMCC & ONU-Id may be different
            var PONSupervision = readPONSupervision();
            var ONUs = PONSupervision['PON Tree']['ONUs']['Active ONUs']
                for (var id in ONUs) {
                    logInfo(ONUs[id]['Status']);
                    if (ONUs[id]['Status']['OMCC'] == omcc) {
                        onuId = Number(id.split('-')[1]);
                    }
                }
        }
        var GEMTable = readGEMTable();
        for (var GEMId in GEMTable) {
            var VLANs = GEMTable[GEMId].VLANs;
            for (var V in VLANs) {
                if (VLANs[V].VID == VID)
                    resp.push(GEMTable[GEMId].portId);
            }
        }

        return resp;
    },

    GetUnicastGEMsForVLAN: function (omcc, VID, pbit) {
        if (pbit == undefined)
            return this.GetUnicastGEMsForPbit(omcc, VID);
        if (VID == undefined)
            this.GetUnicastGEMsForPbit(omcc, pbit);

        var forPbit = this.GetUnicastGEMsForPbit(omcc, pbit);
        var forVID = this.GetUnicastGEMsForVID(omcc, VID);

        var resp = forPbit.filter(function (n) {
            return forVID.indexOf(n) !== -1;
        });

        return resp;
    },

    GetMulticastGEMCount: function (omcc) {
        var resp = this.Request(omcc, "SELECT COUNT (DISTINCT meid) FROM Multicast_GEM_Interworking_Termination_Point WHERE " + this.DBOMCCIdentifierString() + "==" + omcc);

        return resp;
    },

    GetMulticastGEM: function (omcc, index) {
        var resp;

        if (index == undefined)
            index = 0;

        var maxIndex = this.GetUnicastGEMCount(omcc);

        if (index < maxIndex) {
            resp = this.Request(omcc, "SELECT DISTINCT min(CAST(GEM_port_network_CTP.PortId AS INT)) FROM GEM_port_network_CTP,Multicast_GEM_Interworking_Termination_Point WHERE (GEM_port_network_CTP." + this.DBOMCCIdentifierString() + " == " + omcc + " AND Multicast_GEM_Interworking_Termination_Point." + this.DBOMCCIdentifierString() + " == " + omcc + " AND Multicast_GEM_Interworking_Termination_Point.GEMPortCTPConnectPointer == GEM_port_network_CTP.meid) GROUP BY GEM_port_network_CTP.PortId ORDER BY ROUND(GEM_port_network_CTP.PortId) ASC LIMIT " + index + ",1");
        }

        return resp;
    },

    GetMulticastGEMs: function (omcc) {
        var resp = [];
        var maxIndex = this.GetMulticastGEMCount(omcc);

        for (var i = 0; i < maxIndex; i++) {
            resp.push(this.GetMulticastGEM(omcc, i));
        }
        return resp;
    },

    /** Build a PBit Mapper object
     */
    BuildPMapper: function (mapperObject) {
        var PMAPPbit = new Object();
        for (var i in mapperObject) {
            PMAPPbit["P" + mapperObject[i][0] + "Ptr"] = mapperObject[i][1];
        }
        return PMAPPbit;
    },

    BuildDSCPMapper: function (mapperObject) {
        var DSCPMap = new Array();
        /// initialize to 0
        for (var i = 0; i < 64; i++) {
            DSCPMap.push(0);
        }
        for (var i in mapperObject) {
            DSCPMap[mapperObject[i][0]] = mapperObject[i][1];
        }
        return DSCPMap;
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

    logDebug: function (str) {
        this.log(this.baseLogLevel - 1, str);
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
        ///+6 allows to eliminate all logs from OMCI, and keep the failure, by setting baseLogLevel to -3
        this.log(this.baseLogLevel + 6, str);
    },

    /** Test if attr list is in the resp
     * \param attrs Attribute list to test
     * \param resp Response list which have to contain the attribute list
     */
    AssertAttributeInResp: function (ME, meid, key, attr, resp) {
        if (resp == undefined) {
            this.log(this.MibConsistencyLogLevel, "No response to Get " + ME + "[" + key + "](meid:" + meid + ")");
            return false;
        }

        if ((typeof resp === 'object') && (key in resp)) {
            /// Is resp a simple response (scalar value) ?
            if ((typeof(resp[key]) == "string") || (typeof(resp[key]) == "number")) {
                if (attr != resp[key]) {
                    this.log(this.MibConsistencyLogLevel, "Get response is not equal to Set command (" + ME + "[" + key + "](meid:" + meid + ") set to " + attr + " and response is " + resp[key] + ")");
                    return false;
                }
            } else if (Array.isArray(resp[key])) {
                /// Resp is an Array ?
                /// Check for empty array response
                if ((key.indexOf("Table") >= 0) || (key.indexOf("Tbl") >= 0)) {
                    /// Array on a Table: this an array of the same attribute (table item)
                    if (resp[key].length == 0) {
                        this.log(this.MibConsistencyLogLevel, "Get response is an empty table");
                        return false;
                    }
                    /// For each array entry, test the value
                    var k = undefined;
                    for (var i = 0; i < resp[key].length; ++i) {
                        var maskArray = {};
                        if (key == "DynamicACLTable")
                            maskArray["TableIndex"] = 0x3fff;
                        var k = this.CheckIfAttributeIsInResp(attr, resp[key][i], maskArray);
                        /// Correspondance found -> skip search
                        if (k == undefined)
                            return true;
                    }
                } else {
                    if (undefined == this.CheckIfAttributeIsInResp(attr, resp[key])) {
                        return true;
                    }
                }
                /// No correspondance found
                this.log(this.MibConsistencyLogLevel, "Get response is not equal to Set command (" + ME + "[" + key + "](meid:" + meid + ") set to " + attr + ")");
                return false;
            }
            /// Is Resp a scalar array
            else if (typeof(resp[key]) == "object") {
                var maskArray = {};
                if ((ME == "Ethernet_Frame_Extended_PM") && (key == "Control_Block"))
                    maskArray["Accumulation_Disable"] = 0x7fff;
                if (key == "DynamicACLTable")
                    maskArray["TableIndex"] = 0x3fff;
                if (this.CheckIfAttributeIsInResp(attr, resp[key], maskArray) != undefined) {
                    this.log(this.MibConsistencyLogLevel, "Get response is not equal to Set command (" + ME + "[" + key + "](meid:" + meid + ")");
                    return false;
                }
            }
        } else {
            /// Resp is an Array ? -- eOLT-GUI returns table as array of object, rather than an object which is an array
            if (resp.length != undefined) {
                /// Check for empty array response
                if (resp.length == 0) {
                    this.log(this.MibConsistencyLogLevel, "Get response is an empty table (" + ME + "[" + key + "](meid:" + meid + ")");
                    return false;
                }
                /// For each array entry, test the value
                var k = undefined;
                var maskArray = {};
                if (key == "DynamicACLTable")
                    maskArray["TableIndex"] = 0x3fff;
                for (var i = 0; i < resp.length; ++i) {
                    if (this.CheckIfAttributeIsInResp(attr, resp[i][key], maskArray) == undefined) {
                        /// Correspondance found -> skip search
                        return false;
                    }
                }
            }
            this.log(this.MibConsistencyLogLevel, "Get response is not equal to Set command (" + ME + "[" + key + "](meid:" + meid + ")");
            return false;
        }
        return true;
    },

    /* Check if attr list is in the resp
     * \param attrs Attribute list to test
     * \param resp Response list which have to contain the attribute list
     * \return key that is different or undefined if no difference is found
     */
    CheckIfAttributeIsInResp: function (attrs, resp, maskArray) {
        /// Count attribute in attrs
        var cnt = 0;
        for (var i in attrs)
            cnt++;
        /// Check only if attrs in not empty
        if (cnt == 0)
            return undefined;
        /// Verify each attribute value
        for (var key in attrs) {
            /// Check if key is not meid
            if ((key != "meid")) {
                /// Object attribute check
                if ((typeof(attrs[key]) == "object") && (typeof(resp[key]) == "object")) {
                    var k = this.CheckIfAttributeIsInResp(attrs[key], resp[key], maskArray);
                    if (k != undefined)
                        return k;
                }
                /// Simple attribute check
                else {
                    if (attrs[key] != undefined) {
                        if ((maskArray != undefined) && (maskArray[key] != undefined) && (typeof(attrs[key]) == "number")) {
                            attrs[key] = attrs[key] & maskArray[key];
                        }
                        if (attrs[key] != resp[key]) {
                            return key;
                        }
                    }
                }
            }
        }
        return undefined;
    },

    DBOMCCIdentifierString: function () {
        if ((MT2GUI == "eOLT-GUI") && (eOLTKernelRev < 2680)) {
            return "onu_id";
        }
        return "omcc";
    },

    GetSoftwareImageME: function (omcc, image) {
        var firm = OMCI.Get(omcc, "Software_Image", image, ["IsValid", "IsActive", "IsCommitted", "Version"]);
        if (MT2GUI == "eOLT-GUI") {
            if (eOLTKernelRev < 2680) {
                firm.Version = ArrayToString(firm.Version);
            } else { ///Workaround for structure handling bug in rv > 2680
                firm.Version = firm[0].Version;
                firm.IsCommitted = firm[1].IsCommitted;
                firm.IsActive = firm[2].IsActive;
                firm.IsValid = firm[3].IsValid;
                return firm;
            }
        }
        return firm;
    },

    /** Return the current software version running
     */
    Get_CurrentSoftware_Version: function (omcc) {
        var firmMeid0 = this.GetSoftwareImageME(omcc, 0);
        var firmMeid1 = this.GetSoftwareImageME(omcc, 1);
        var firmMeid;
        if (firmMeid1.IsActive == 1)
            firmMeid = firmMeid1;
        else if (firmMeid0.IsActive == 1)
            firmMeid = firmMeid0;
        else
            this.testFailed("No software image bank is declared as active");

        this.logInfo("Software_Image Bank" + firmMeid + ": Version is " + firmMeid.Version);
    },

    SetTerminationPointAttributes: function (omcc, entityType, entity, attrs) {

        if (entityType != "PPTPEthernetUni") {
            if ("MaxFrameSize" in attrs) {
                delete attrs["MaxFrameSize"];
                this.logWarning("termination type is " + entityType + ", MaxFrameSize attribute is not applicable");
            }
        }

        if (Object.keys(attrs).length > 0) {
            OMCI.Set(omcc, entityType, entity, attrs);
        }
    },

    Test: function (omcc, entityType, entity, attrs) {
        this.ScalarAction(omcc, "Test", this.Timeout, entityType, entity, attrs);

        var resp = waitForOMCI(omcc, "Test_Result", this.Timeout * 120);

        return resp;
    },

    checkAlarm: function (alarm, entityType, entity, alarmType, expectedSeqNb) {
        this.logInfo("Rx Alarm: " + alarm.alarm + "(ME: " + alarm.me + "; ID:" + alarm.meid + "; seqNb:" + alarm.seqNb + ")");
        if ((expectedSeqNb != undefined) && (expectedSeqNb != 0)) {
            if (alarm.seqNb != expectedSeqNb) {
                if (this.MibConsistencyLogLevel) {
                    this.testFailed("Alarm seqNb is not correct (" + alarm.seqNb + "/expected: " + expectedSeqNb);
                }
                this.logError("Alarm seqNb is not correct (" + alarm.seqNb + "/expected: " + expectedSeqNb);
            }
        }
        if ((alarm.me == entityType) && (alarm.meid == entity)) {
            this.logInfo("Alarm caught on entity");
            if (alarm.alarm == alarmType) {
                this.logInfo(alarmType + " caught");
                return true;
            }
        }
        return false;
    },

    waitForAlarm: function (omcc, entityType, entity, alarmType, timeOut, expectedSeqNb) {
        this.logInfo("waiting for alarm " + alarmType + " on entity " + entityType + ":" + entity);
        var alarm = waitForOMCIAlarm(omcc, timeOut);
        var expectedAlarms = alarmType;
        if (!Array.isArray(expectedAlarms))
            expectedAlarms = [alarmType];
        while (alarm != undefined) {
            for (var i = 0; i < expectedAlarms.length; ++i) {
                if (this.checkAlarm(alarm, entityType, entity, expectedAlarms[i], expectedSeqNb)) {
                    this.logInfo("Caught alarm " + expectedAlarms[i] + " on entity " + entityType + "(" + entity + ")");
                    return true;
                }
            }
            if (expectedSeqNb != 0) ///expectedSeqNb is set to 0 after a get all alar: no check in that case
                expectedSeqNb = alarm.seqNb + 1;
            var alarm = waitForOMCIAlarm(omcc, timeOut);
        }
        this.logError("alarm time out");
        return false;
    },

    waitForAttributeValueChange: function (omcc, attributesArray, timeOut) {
        this.logInfo("waiting for attribute value change " + JSON.stringify(attributesArray) + " on OMCC " + omcc);
        var expectedAVC = attributesArray;
        if (!Array.isArray(expectedAVC))
            expectedAVC = [attributesArray];

        const AttributeValueChangeCount = expectedAVC.length;
        var allEventReceived = false;
        var receivedEvents = {};
        var AVCevent;
        for (AVCEvent = 0; AVCEvent < AttributeValueChangeCount; ++AVCEvent) {
            receivedEvents[expectedAVC[AVCEvent]] = false;
        }

        var attributeValueChangedEvent;
        while (!allEventReceived) {
            attributeValueChangedEvent = waitForOMCI(omcc, "Attribute_Value_Change", timeOut); // It is accpeted to wait restart the timeout when receiving an AVC. Continuously having AVC  is not real.

            if (attributeValueChangedEvent === undefined) {
                return false;
            }
            for (AVCEvent = 0; AVCEvent < AttributeValueChangeCount; ++AVCEvent) {
                if (attributeValueChangedEvent[expectedAVC[AVCEvent]] !== undefined) {
                    this.logInfo("Received Attribute value change " + expectedAVC[AVCEvent] + " on OMCC " + omcc);
                    receivedEvents[expectedAVC[AVCEvent]] = true;
                }
            }
            allEventReceived = true;
            for (AVCEvent = 0; AVCEvent < AttributeValueChangeCount; ++AVCEvent) {
                allEventReceived = allEventReceived && receivedEvents[expectedAVC[AVCEvent]];
            }
        }
        if (!allEventReceived) {
            this.logError("All the attribute value changes have not been received.");
        }
        return allEventReceived;
    },

    /** Send a 'get' OMCI command and verify attributes value equals expected one
     * \param omcc OMCC to work on
     * \param ME Managed Entity string name
     * \param attributeName Attribute to get
     * \param expectedValue expected value of the attribute to get
     */
    GetAndCheck: function (omcc, ME, meid, attributeName, expectedValue) {
        getResponse = this.Get(omcc, ME, meid, [attributeName]);
        var getValue = getResponse[attributeName];
        if ((Array.isArray(expectedValue)) && (Array.isArray(getValue))) {
            logInfo(ME + " (meid : " + meid + ") attribute " + attributeName + " get value length: " + getValue.length + " expected value length: " + expectedValue.length);
            // Looks like table case or array, compare size then each row.
            if (expectedValue.length != getValue.length) {
                logError(ME + " (meid : " + meid + ") attribute " + attributeName + " get value different from expected one.");
                return false;
            }
            var arraySize = expectedValue.length;
            if (typeof(expectedValue[0]) == "number") {
                for (var arrayRow = 0; arrayRow < arraySize; ++arrayRow) {
                    // Array of are numbers given in the right order by the eOLT
                    if (expectedValue[arrayRow] != getValue[arrayRow]) {
                        this.logError(ME + " (meid : " + meid + ") attribute " + attributeName + " row " + arrayRow + " is different from expected one.");
                        return false;
                    }
                }
            } else {
                for (var arrayRow = 0; arrayRow < arraySize; ++arrayRow) {
                    // Array of structure and array of array are given in reverse order by the eOLT
                    elementToCompare = getValue[(arraySize - 1) - arrayRow];
                    if (this.CheckIfAttributeIsInResp(expectedValue[arrayRow], elementToCompare) != undefined) {
                        this.logError(ME + " (meid : " + meid + ") attribute " + attributeName + " row " + arrayRow + " is different from expected one.");
                        return false;
                    }
                }
            }
        } else {
            logInfo(ME + " (meid : " + meid + ") attribute " + attributeName + " get value : " + getValue + " expected value : " + expectedValue);
            if (getValue != expectedValue) {
                logError(ME + " (meid : " + meid + ") attribute " + attributeName + " get value different from expeted one.");
                return false;
            }
        }
        return true;
    }
};

if (MT2GUI != "MT2-Browser") {
    OMCI.Type = "Baseline"; ///Extended is only supported in MT2Browser/PONPlatform
}

addHelpInfo("OMCI.Reboot", "Reboot(omcc): Perfoms a OMCI reboot");
addHelpInfo("OMCI.MIB_Reset", "MIB_Reset(omcc): Force a MIB Reset and reset the MIB sync counter");
addHelpInfo("OMCI.MIB_Upload", "MIB_Upload(omcc): Initiate a MIB Upload (and populate internal database)");
addHelpInfo("OMCI.Get", "Get(omcc, ME, meid, attrs): Send a 'get' OMCI command");
addHelpInfo("OMCI.GetAndCheck", "GetAndCheck(omcc, ME, meid, attrName, expectedValue): Send a 'get' OMCI command and verify attribute value equals expected one");
addHelpInfo("OMCI.Create", "Create(omcc, ME, attrs): Send a 'create' OMCI command and verify execution by checking the 'get' OMCI command response if MIBConsistencyCheck is set to 1");
addHelpInfo("OMCI.Delete", "Delete(omcc, ME, meid): Send a 'delete' OMCI command");
addHelpInfo("OMCI.GetMulticastGEMs", "Retrieve an array containing the Multicast GEM Port Ids for the OMCC", ["OMCC"], ["OMCC identifier"], "Array of GEM Port Ids");
addHelpInfo("OMCI.GetUnicastGEMs", "Retrieve an array containing the Unicast GEM Port Ids for the OMCC", ["OMCC"], ["OMCC identifier"], "Array of GEM Port Ids");
addHelpInfo("OMCI.GetUnicastGEMsForPbit", "Retrieve an array containing the Unicast GEM Port Ids asscociated with the provided Pbit value for the OMCC", ["OMCC", "Pbit"], ["OMCC identifier", "Priority bits value [0-7]"], "Array of GEM Port Ids");
addHelpInfo("OMCI.GetUnicastGEMsForVID", "Retrieve an array containing the Unicast GEM Port Ids asscociated with the provided VID value for the OMCC", ["OMCC", "VID"], ["OMCC identifier", "VID"], "Array of GEM Port Ids");
addHelpInfo("OMCI.GetUnicastGEMsForVLAN", "Retrieve an array containing the Unicast GEM Port Ids asscociated with the provided VID and/or Pbit value for the OMCC", ["OMCC", "VID", "Pbit"], ["OMCC identifier", "VID", "Priority bits value [0-7]"], "Array of GEM Port Ids");
addHelpInfo("OMCI.Set", "Set(omcc, ME, meid, attrs): Send a 'set' OMCI command and verify execution by checking the 'get' OMCI command response if MIBConsistencyCheck is set to 1");
addHelpInfo("OMCI.Get_All_Alarms", "Get_All_Alarms(omcc): Initiate a Get all alarms Upload");
addHelpInfo("OMCI.Wait_Alarm", "Wait_Alarm(omcc, timeout): Wait for an alarm during timeout seconds");
addHelpInfo("OMCI.Software_Download", "Software_Download(omcc, meid, filename, windowSize): Do a software download");
addHelpInfo("OMCI.Activate_Software", "Activate_Software(omcc, meid): Activate the software");
addHelpInfo("OMCI.Commit_Software", "Commit_Software(omcc, meid): Commit the software");
addHelpInfo("OMCI.GetCurrentData", "GetCurrentData(omcc, ME, meid, attrs): Performs a get current data on the entity");
addHelpInfo("OMCI.Get_CurrentSoftware_Version", " Get_CurrentSoftware_Version(omcc): Retrieves the current software image running");
addHelpInfo("OMCI.GetEntity", "GetEntity(omcc, entity, n): Return the meid of the n-th entity available in the database");
addHelpInfo("OMCI.GetTCONT", "GetTCONT(omcc, n): Return the meid of the n-th T-CONT available in the database");
addHelpInfo("OMCI.GetUpPQ", "GetUpPQ(omcc, tcont, optional_prio): Return the meid of the Upstream Priority Queue object with meid equal to T-CONT meid available in the database, for the priority provided (if not set 0 is used)");
addHelpInfo("OMCI.GetDwPQ", "GetDwPQ(omcc, prio, uni, slot): Return the meid of the n-th Downstream Priority Queue object available in the database");
addHelpInfo("OMCI.GetDwPQ_RG", "GetDwPQ(omcc, prio, uni, slot): Return the meid of the n-th Downstream Priority Queue object available in the database, for ONU-RG");
addHelpInfo("OMCI.GetPPTPEthUni", "GetPPTPEthUni(omcc, n): Return the meid of the n-th PPTPEthUni object available in the database");
addHelpInfo("OMCI.GetVEIP", "GetVEIP(omcc, n): Return the meid of the n-th VEIP object available in the database");
addHelpInfo("OMCI.GetVirtualCardholder", "GetVirtualCardholder(omcc, n): Return the meid of the n-th Cardholder object available in the database");
addHelpInfo("OMCI.GetMEIDFromDb", "GetMEIDFromDb(omcc, ME, idx):  Get a specific MEID from the database");
addHelpInfo("OMCI.Request", "Request(omcc, req): Execute a SQL request on the internal database and return the result");
addHelpInfo("OMCI.BuildPMapper", "BuildPMapper(arr): Build the PBits Mapper object using array");
addHelpInfo("OMCI.BuildDSCPMapper", "BuildDSCPMapper(arr): Build the DSCP to PBits Mapper object using array");
addHelpInfo("OMCI.Test", "Test(omcc, entityType, entity, attrs): performs the test and returns the result");
addHelpInfo("OMCI.waitForAlarm", "waitForAlarm(omcc, entityType, entity, alarmType, timeOut, expectedSeqNb): wait for a given alarm, ignoring others. return true if successful. alarm may be a string (the alarm) or an array of strings, if several alarms are possible) ExpectedSeqNb is optional (if set to 0, no check is performed)");
