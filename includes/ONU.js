////////////////////////////////////////////////////////////
// Copyright (c) 2015, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

/// ONU specific settings ///
/////////////////////////////

logInfo("////////////////////////");
logInfo("///ONUs configuration///");

/// ONUOMCIs[omcc].type
/// values: "L2", "RG"
defaultONUType = "L2";
upstreamFEC = 0;
serialNumber = [];

/// Struct for ONU description
function ONU(serialNumber, ONUID, FEC) {
    if ((serialNumber != undefined) && ('string' === typeof(serialNumber))) {
        this.serialNumber = HexToArray(serialNumber);
    } else if ((serialNumber != undefined) && ('length' in serialNumber) && (serialNumber.length >= 8)){
        this.serialNumber = serialNumber;
    } else {
        this.serialNumber = undefined;
    }

    this.ONUID = ONUID;

    if (FEC == undefined) {
        this.FEC = false;
    } else {
        this.FEC = FEC;
    }

    this.state = "O2";

    this.testResult = [];
}

var ONUOMCIs = {};
//Default configuration is L2, using PPTPEthUni ordered by MEID
//For each OMCC a on standard configuration may be forced (it overwrites the default):
//ONUOMCIs[omcc].type = "L2";//"RG";
// if RG, the VEIP is used by default and chosen by ascending MEID
// in both RG and L2 type, the OMCI termination entity may be forced by setting ONUOMCIs[omcc].OMCITP (entity name)
// if the VEIP/PPTPEthernUni to use are not ordered by MEID, they can be accessed alternatively by using the
// slot-port mechanism (meid = slot << 8 | port and defining the corresponding array, as shown below
// ONUOMCIs[1] =  {type:"RG"};
// ONUOMCIs[1].VEIPs =[];
// ONUOMCIs[1].VEIPs[0] = {slot:0x0a, port: 0x05};

function GetONUType(omcc) {
    if (ONUOMCIs == undefined) {
        logInfo("ONUOMCIs undefined, using default type for OMCC " + omcc + ": " + defaultONUType);
        return defaultONUType;
    }
    if (ONUOMCIs[omcc] == undefined) {
        logInfo("No OMCI conf defined for OMCC " + omcc + ", using default type " + defaultONUType);
        return defaultONUType;
    }
    if (ONUOMCIs[omcc].type == undefined) {
        logInfo("Type undefined for OMCC " + omcc + ", using default type " + defaultONUType);
        return defaultONUType;
    }
    return ONUOMCIs[omcc].type;
}

/// ONU OMCI Termination point entity
/// Undefined means derived from type:
/// L2=>"PPTPEthernetUni"
/// RG=>"VEIP"
defaultOMCITerminationPoint = "PPTPEthernetUni";

function GetOMCITerminationPoint(omcc) {
    if (ONUOMCIs == undefined) {
        logInfo("ONUOMCIs undefined, using default OMCI Termination Point for OMCC " + omcc + ": " + defaultOMCITerminationPoint);
        return defaultOMCITerminationPoint;
    }
    if (ONUOMCIs[omcc] == undefined) {
        logInfo("No OMCI conf defined for OMCC " + omcc + ", using default OMCI Termination Point " + defaultOMCITerminationPoint);
        return defaultOMCITerminationPoint;
    }

    if (ONUOMCIs[omcc].OMCITP != undefined) return ONUOMCIs[omcc].OMCITP;
    if (ONUOMCIs[omcc].type == "RG") {
        return "VEIP";
    }

    return defaultOMCITerminationPoint;
}

function GetDownstreamPQAttachedEntity(omcc) {
    if (ONUOMCIs == undefined) {
        return GetOMCITerminationPoint(omcc);
    }
    if (ONUOMCIs[omcc] == undefined) {
        return GetOMCITerminationPoint(omcc);
    }

    if (ONUOMCIs[omcc].DownstreamPQAttachedEntity != undefined) return ONUOMCIs[omcc].DownstreamPQAttachedEntity;

    return GetOMCITerminationPoint(omcc);
}

function GetPPTPEthUniMeid(omcc, n) {
    if ((ONUOMCIs != undefined) && (ONUOMCIs[omcc] != undefined) && (ONUOMCIs[omcc].PPTPEthUnis != undefined) && (ONUOMCIs[omcc].PPTPEthUnis.length > n)) {
        return (((ONUOMCIs[omcc].PPTPEthUnis[n].slot << 8) | ONUOMCIs[omcc].PPTPEthUnis[n].port) & 0x0000ffff);
    }
    return undefined;
}

function GetVEIPMeid(omcc, n) {
    if ((ONUOMCIs != undefined) && (ONUOMCIs[omcc] != undefined) && (ONUOMCIs[omcc].VEIPs != undefined) && (ONUOMCIs[omcc].VEIPs.length > n)) {
        return (((ONUOMCIs[omcc].VEIPs[n].slot << 8) | ONUOMCIs[omcc].VEIPs[n].port) & 0x0000ffff);
    }
    return undefined;
}

function PrintOMCCConfiguration(omcc) {
    if ((ONUOMCIs != undefined) && (ONUOMCIs[omcc] != undefined)) {
        logInfo("configuration for OMCC " + omcc);
        var type = GetONUType(omcc);
        var OMCITP = GetOMCITerminationPoint(omcc);
        var DsPQEntity = GetDownstreamPQAttachedEntity(omcc);
        logInfo(" ONUType: " + type);
        logInfo(" OMCI Termination point: " + OMCITP);
        logInfo(" Downstream PQ Attached Entity: " + DsPQEntity);
        /// PPTPEthUnis definition
        /// PPTPEthUnis is an array of Object PPTPEthUni
        /// PPTPEthUni
        ///   .slot
        ///   .port
        if ((ONUOMCIs[omcc].PPTPEthUnis == undefined) || (ONUOMCIs[omcc].PPTPEthUnis.length == 0)) {
            logInfo(" PPTPEthUnis: default policy");
        } else {
            for (var i = 0; i < ONUOMCIs[omcc].PPTPEthUnis.length; i++) {
                logInfo("   PPTPEthUni No " + i + ":");
                if (ONUOMCIs[omcc].PPTPEthUnis[i].slot != undefined)
                    logInfo("	     .slot: " + ONUOMCIs[omcc].PPTPEthUnis[i].slot);
                else
                    logWarning("       .slot: " + ONUOMCIs[omcc].PPTPEthUnis[i].slot);
                if (ONU.PPTPEthUnis[i].port != undefined)
                    logInfo("       .port: " + ONUOMCIs[omcc].PPTPEthUnis[i].port);
                else
                    logWarning("       .port: " + ONUOMCIs[omcc].PPTPEthUnis[i].port);
            }
        }

        /// VEIPs definition
        /// VEIPs is an array of Object VEIP
        /// VEIP
        ///   .slot
        ///   .port
        if ((ONUOMCIs[omcc].VEIPs == undefined) || (ONUOMCIs[omcc].VEIPs.length == 0)) {
            logInfo(" VEIPs: default policy");
        } else {
            for (var i = 0; i < ONUOMCIs[omcc].VEIPs.length; i++) {
                logInfo(" VEIP No " + i + ":");
                if (ONUOMCIs[omcc].VEIPs[i].slot != undefined)
                    logInfo("       .slot: " + ONUOMCIs[omcc].VEIPs[i].slot);
                else
                    logWarning("       .slot: " + ONUOMCIs[omcc].VEIPs[i].slot);
                if (ONUOMCIs[omcc].VEIPs[i].port != undefined)
                    logInfo("       .port: " + ONUOMCIs[omcc].VEIPs[i].port);
                else
                    logWarning("       .port: " + ONUOMCIs[omcc].VEIPs[i].port);
            }
        }
    }
}

if (ONUOMCIs != undefined) {
    var OMCCs = Object.keys(ONUOMCIs);
    for (var j = 0; j < OMCCs.length; j++) {
        PrintOMCCConfiguration(OMCCs[j]);
    }
} else {
    logInfo("No ONU OMCI defined: use default configuration for all");
    PrintOMCCConfiguration(0);
}