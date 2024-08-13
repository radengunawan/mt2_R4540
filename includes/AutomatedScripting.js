////////////////////////////////////////////////////////////
/// Copyright (c) 2013, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
var ONUs = new Array();


function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function addEqDelay(onuId, eqDelay) {
    var unusedIndex = -1;
    var i;

    for (i = 0; i < ONUs.length; i++) {
        if (ONUs[i].id == onuId) {
            ONUs[i].eqDelay = eqDelay;
            return true;
        }
        if ((unusedIndex == -1) && (ONUs[i].VSSNValidity < 0) && (ONUs[i].id < 0)) {
            unusedIndex = i;
        }
    }
    if (unusedIndex == -1) {
        unusedIndex = i;
    }

    ONUs[unusedIndex].id = onuId;
    ONUs[unusedIndex].eqDelay = eqDelay;
    ONUs[unusedIndex].VSSNValidity = false;
    ONUs[unusedIndex].VSSN = {};

    return true;
}


function addONUByVSSN(VSSN) {
    var unusedIndex = -1;
    var i;
    for (i = 0; i < ONUs.length; i++) {
        if (ONUs[i].VSSNValidity && (arraysEqual(ONUs[i].VSSN, VSSN))) {
            return true;
        }
        if ((unusedIndex == -1) && (ONUs[i].VSSNValidity == false) && (ONUs[i].id < 0)) {
            unusedIndex = i;
        }
    }
    if (unusedIndex != -1) {
        ONUs[unusedIndex].id = -1;
        ONUs[unusedIndex].eqDelay = -1;
        ONUs[unusedIndex].VSSNValidity = true;
        ONUs[unusedIndex].VSSN = VSSN;
        return true;
    }
    var newONU = {
        id: -1,
        eqDelay: -1,
        VSSNValidity: true,
        VSSN: VSSN
    };
    ONUs.push(newONU);

    return true;
}

function FindFirstUnassignedONU() {
    for (i = 0; i < ONUs.length; i++) {
        if ((ONUs[i].VSSNValidity && ONUs[i].id < 0)) {
            return ONUs[i].VSSN;
        }
    }
    return;
}

function GetVSSN(onuId) {
    for (i = 0; i < ONUs.length; i++) {
        if (ONUs[i].id == onuId) {
            if (ONUs[i].VSSNValidity) return ONU.VSSN;
            else return;
        }
    }
    return;
}

function addONUId(VSSN, onuId) {
    var unusedIndex = -1;
    var i;
    for (i = 0; i < ONUs.length; i++) {
        if (ONUs[i].VSSNValidity && (arraysEqual(ONUs[i].VSSN, VSSN))) {
            ONUs[i].id = onuId;
            return true;
        }
        if ((unusedIndex == -1) && (ONUs[i].VSSNValidity == false) && (ONUs[i].id < 0)) {
            unusedIndex = i;
        }
    }
    if (unusedIndex != -1) {
        ONUs[unusedIndex].id = onuId;
        ONUs[unusedIndex].eqDelay = -1;
        ONUs[unusedIndex].VSSNValidity = true;
        ONUs[unusedIndex].VSSN = VSSN;
        return true;
    }
    var newONU = {
        id: onuId,
        eqDelay: -1,
        VSSNValidity: true,
        VSSN: VSSN
    };
    ONUs.push(newONU);

    return true;
}

function getEqDelay(onuId) {
    for (var i = 0; i < ONUs.length; i++) {
        if (ONUs[i].id == onuId) {
            return ONUs[i].eqDelay;
        }
    }
    return -1;
}

function clearONU(index) {
    ONUs[index].id = -1;
    ONUs[index].eqDelay = -1;
    ONUs[index].VSSNValidity = false;
    ONUs[index].VSSN = -1;
}

function clearAllONUs() {
    ONUs.length = 0;
}

function delONU(onuId) {
    for (var i = 0; i < ONUs.length; i++) {
        if (ONUs[i].id == onuId) {
            clearONU(i);
            return true;
        }
    }
    return false;
}

function delONUByVSSN(VSSN) {
    for (var i = 0; i < ONUs.length; i++) {
        if (ONUs[i].VSSNValidity && (arraysEqual(ONUs[i].VSSN, VSSN))) {
            clearONU(i);
            return true;
        }
    }
    return false;
}