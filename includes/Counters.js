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
//Counters provided by the PON platform:
//--  0	: Error BIP COUNTER DOWN
//--  1	: Error BIP COUNTER UP
//--  2	: Error FEC COUNTER DOWN
//--  3	: Error FEC COUNTER UP
//--  4	: DYING GASP COUNTER
//--  5	: GHOST ALLOCATION COUNTER
//--  6	: DBRU COUNTER
//--  7	: INFO FIFO EMPTY
//--  8	: INFO FIFO DATA RESET
//--  9	: FIFO FULL ETHERNET + ONU RANGED INFO + DOWNSTREAM SYNCHRONIZED + DELTA VALID
//--  10: BURST PLOAMU ASK
//--  11: BURST ONU SENT

function MAXCOUNTERVALUE() {
    return 0x3FFFF; ///counters are on 18 bits (see readCounter documentation)
}

function substractCounter(first, second) {
    return (((second - first) + (MAXCOUNTERVALUE() + 1)) % (MAXCOUNTERVALUE() + 1));
}

function readDownstreamBIPErrorCounter() {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(0);
        sleep(10);
    }
    return count;
}

function readDownstreamFECErrorCounter() {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(2);
        sleep(10);
    }
    return count;
}

function readUpstreamBIPErrorCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(1, ONUID);
        sleep(10);
    }
    return count;
}

function readUpstreamFECErrorCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(3, ONUID);
        sleep(10);
    }
    return count;
}

function readDyingGaspCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(4, ONUID);
        sleep(10);
    }
    return count;
}

function readMissingAllocationsCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(5, ONUID);
        sleep(10);
    }
    return count;
}

function readDBRuCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(6, ONUID);
        sleep(10);
    }
    return count;
}

function readPLOAMuCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(10, ONUID);
        sleep(10);
    }
    return count;
}

function readBurstCounter(ONUID) {
    var count = undefined;

    while (count == undefined) {
        count = readCounter(11, ONUID);
        sleep(10);
    }
    return count;
}

addHelpInfo("readDownstreamBIPErrorCounter", "read the downstream BIP error counter");
addHelpInfo("readDownstreamFECErrorCounter", "read the downstream FEC error counter");
addHelpInfo("readUpstreamBIPErrorCounter", "read the upstream BIP error counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readUpstreamFECErrorCounter", "read the upstream FEC error counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readDyingGaspCounter", "read the dying Gasp counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readMissingAllocationsCounter", "read the dying Gasp counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readDBRuCounter", "read the DBRu counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readPLOAMuCounter", "read the PLOAMu counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("readBurstCounter", "read the Burst counter", ["[optional]ONUId"], ["ONUID. when not provided, cumulated counter for all ONUs"]);
addHelpInfo("substractCounter", "substract counter values, handling one wrap-around gracefully", ["value1", "value2"], ["first measured value", "second measured value"], "the substraction result");