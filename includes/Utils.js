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

UtilsParameters = {
    /// Set to 1 to activate randomisation of Pbit/VID and GEM
    ParametersRandomisation: 1,
    /// User seed
    UserSeed: 0,
    /// Set to 1 to use a random seed generated from the script filename
    UseRandomSeedFromFilename: 1,
    /// Set to 1 to generate the random seed from all the script filename part
    UseRandomSeedWithAllFilenamePart: 1,
};

/** Test if the char is a digit
 */
function isDigit(character) {
    var c = character.charCodeAt();
    if (c == undefined) return false;
    if ((c >= 48) && (c <= 57)) return true;
    return false;
}

/** Get the random seed from the filename given
 * second parameter indicate if only the first part or the two part of the filename have to be taken into account
 */
function getSeedFromFilename(filename, useTwoPart) {
    var part = filename.split('_');
    /// Treat the first part
    if (part.length < 2) return 0;
    var seed1 = 0;
    var seed2 = 0;
    for (var i = 0; i < part[1].length; ++i) {
        if (isDigit(part[1][i])) {
            seed1 *= 10;
            seed1 += part[1][i].charCodeAt() - 48;
        }
    }
    /// Treat the second part
    if (useTwoPart && (part.length >= 4)) {
        for (var i = 0; i < part[2].length; ++i) {
            if (isDigit(part[2][i])) {
                seed2 *= 10;
                seed2 += part[2][i].charCodeAt() - 48;
            }
        }
        for (var i = 0; i < part[3].length; ++i) {
            if (isDigit(part[3][i])) {
                seed2 *= 10;
                seed2 += part[3][i].charCodeAt() - 48;
            }
        }
    }

    var seed = seed1 + seed2 * 1000;
    return (seed >> 31) + (seed & 0x7fffffff);
}

/** Seed the random number generator
 */
function RandomSeed(seed) {
    seedRandomNumber(seed);
}

/** Return an Randomly choosen Integer
 * \param low Lower value
 * \param high High value
 */
function RandomInteger(low, high) {
    return (UtilsParameters.ParametersRandomisation == 1) ? Math.floor(randomNumber() * (high - low + 1) + low) :
        ((high == 4094) || ((low == 0) && (high == 7))) ? Math.round(((high - low) / 2)) : Math.round(((high - low + 1) / 2) + low);
}

function RandomSeedFromFilename(seed) {
    /// Get all digit found in the filename
    var fseed = 0;
    var filename = currentScriptFilename();
    for (var i = 0; i < filename.length; ++i) {
        if (isDigit(filename[i])) fseed = (fseed * 10) + Number(filename[i]);
    }
    var s = fseed + seed;
    logInfo("Using seed number " + seed + " on file " + filename + ": generated seed number is: " + s);
    RandomSeed(s);
}

/** Return an Randomly choosen Integer (value is choosen to be not present in forbiddenValues array)
 * \param low Lower value
 * \param high High value
 */
function RandomIntegerExcept(low, high, forbiddenValues) {
    var bias = 0;
    var end = false;
    var res = undefined;
    while (end == false) {
        res = (((RandomInteger(low, high) + bias) - low) % (high - low + 1)) + low;
        if (forbiddenValues.indexOf(res) == -1) {
            end = true;
        }
        bias = bias + 1;
    }
    return res;
}
/** Return an Randomly choosen Integer (value is choosen to be not present in forbiddenValues array)
 * \param low Lower value
 * \param high High value
 */
function RandomIntegerExceptInterv(low, high, forbiddenValues, forbiddenIntervalsValues) {
    var bias = 0;
    var end1 = true;
    var end2 = false;
    var res = undefined;

    while (end2 == false || end1 == false) {
        res = (((RandomInteger(low, high) + bias) - low) % (high - low + 1)) + low;
        end1 = true;
        end2 = false;
        for (var i = 0; i < (forbiddenIntervalsValues.length - 1); i += 2) {
            if ((forbiddenIntervalsValues[i] < res) && (forbiddenIntervalsValues[i + 1] > res)) {
                end1 = false;
            }
        }
        if (forbiddenValues.indexOf(res) == -1) {
            end2 = true;
        }
        bias = bias + 1;
    }
    return res;
}
/** Return a Randomly generated unicast IPv4 address string
 */
function RandomIPv4Address() {
    var rV = "192.168.0.1";
    if (UtilsParameters.ParametersRandomisation) {
        rV = RandomInteger(1, 223).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString() + "." + RandomInteger(1, 250).toString();
    }
    return rV;
}

function RandomIPv4AddressExcept(forbiddenValues) {
    var end = false;
    var bias = 0;
    var res = "192.168.0.1";
    while (end == false) {
        res = RandomIPv4Address();
        if (bias != 0) {
            var resAsInt = IPv4Address(res).ToInt() + bias;
            res = IPv4Address(resAsInt).ToString();
        }
        if (forbiddenValues.indexOf(res) == -1) {
            end = true;
        }
        bias = bias + 1;
    }
    return res;
}

function RandomAdHoc2MulticastIPv4Address() {
    ///actually restrict addresses to Ad-Hoc Block 2
    var rV = "224.3.0.0";
    if (UtilsParameters.ParametersRandomisation) {
        rV = "224" + "." + RandomInteger(3, 4).toString() + "." + RandomInteger(0, 255).toString() + "." + RandomInteger(0, 255).toString();
    }
    return rV;
}

function RandomAdHoc2MulticastIPv4AddressExcept(forbiddenValues) {
    var end = false;
    var bias = 0;
    var res = "224.3.0.0";
    while (end == false) {
        res = RandomAdHoc2MulticastIPv4Address();
        if (bias != 0) {
            var resAsInt = IPv4Address(res).ToInt() + bias;
            res = IPv4Address(resAsInt).ToString();
        }
        if (forbiddenValues.indexOf(res) == -1) {
            end = true;
        }
        bias = bias + 1;
    }
    return res;
}

function RandomSSMMulticastIPv4Address() {
    var rV = "232.0.0.0";
    if (UtilsParameters.ParametersRandomisation) {
        rV = "232" + "." + RandomInteger(0, 255).toString() + "." + RandomInteger(0, 255).toString() + "." + RandomInteger(0, 255).toString();
    }
    return rV;
}

function RandomSSMMulticastIPv4AddressExcept(forbiddenValues) {
    var end = false;
    var res = "232.0.0.0";
    var bias = 0;
    while (end == false) {
        res = RandomSSMMulticastIPv4Address();
        if (bias != 0) {
            var resAsInt = IPv4Address(res).ToInt() + bias;
            res = IPv4Address(resAsInt).ToString();
        }
        if (forbiddenValues.indexOf(res) == -1) {
            end = true;
        }
        bias = bias + 1;
    }
    return res;
}

function RandomUnicastMACAddress() {
    var MAC = 0x102233445566;
    if (UtilsParameters.ParametersRandomisation) {
        // define exclusion interval for to exclude multicast
        // note that this would be much simpler if 64 bits operation were possible in js...
        var begin_inter1 = 1099511627776; // 01:00:00:00:00:00
        var end_inter1 = 2199023255551; // 01:FF:FF:FF:FF:FF

        var begin_inter2 = 3298534883328; // 03:00:00:00:00:00
        var end_inter2 = 4398046511103; // 03:FF:FF:FF:FF:FF

        var begin_inter3 = 5497558138880; // 05:00:00:00:00:00
        var end_inter3 = 6597069766655; // 05:FF:FF:FF:FF:FF

        var begin_inter4 = 7696581394432; // 07:00:00:00:00:00
        var end_inter4 = 8796093022207; // 07:FF:FF:FF:FF:FF

        var begin_inter5 = 9895604649984; // 09:00:00:00:00:00
        var end_inter5 = 10995116277759; // 09:FF:FF:FF:FF:FF

        var begin_inter6 = 12094627905536; // 0B:00:00:00:00:00
        var end_inter6 = 13194139533311; // 0B:FF:FF:FF:FF:FF

        var begin_inter7 = 14293651161088; // 0D:00:00:00:00:00
        var end_inter7 = 15393162788863; // 0D:FF:FF:FF:FF:FF

        //define exclusion interval to exclude locally admninistered
        //Note that this are contiguous to the multicast intervals defined above: we could merge them
        //(but we keep them separate for clarity)
        var begin_inter8 = 2199023255552; // 02:00:00:00:00:00
        var end_inter8 = 3298534883327; // 02:FF:FF:FF:FF:FF

        var begin_inter9 = 6597069766656; // 06:00:00:00:00:00
        var end_inter9 = 7696581394431; // 06:FF:FF:FF:FF:FF

        var begin_inter10 = 10995116277760; // 0A:00:00:00:00:00
        var end_inter10 = 12094627905535; // 0A:FF:FF:FF:FF:FF

        var begin_inter11 = 15393162788864; // 0E:00:00:00:00:00
        var end_inter11 = 16492674416639; // 0E:FF:FF:FF:FF:FF
        ///This is the last interval: we could reduce the whole range

        MAC = RandomIntegerExceptInterv(0, 16492674416639, [], [begin_inter1, end_inter1,
            begin_inter2, end_inter2,
            begin_inter3, end_inter3,
            begin_inter4, end_inter4,
            begin_inter5, end_inter5,
            begin_inter6, end_inter6,
            begin_inter7, end_inter7,
            begin_inter8, end_inter8,
            begin_inter9, end_inter9,
            begin_inter10, end_inter10,
            begin_inter11, end_inter11,
        ]);
    }
    return MAC;
}

function RandomUnicastMACAddressExcept(forbiddenValues) {
    var end = false;
    var MAC = undefined;
    var bias = 0;
    var res = 0;
    while (end == false) {
        res = RandomUnicastMACAddress() + bias;
        if (forbiddenValues.indexOf(res) == -1) {
            end = true;
        }
        bias += 0x000101010101;
    }
    return res;
}

function ArrayToString(arr) {
    var res = "";
    for (var i in arr) {
        if (arr[i] != 0) res += String.fromCharCode(arr[i]);
    }
    return res;
}

function ArrayByteCmp(arr1, arr2) {
    if (undefined === arr1.length) return -1;
    if (undefined === arr2.length) return -1;
    if (arr1.length != arr2.length) return (arr1.length - arr2.length);

    var i;
    for (i = 0; i < arr1.length; i++) {
        if ((arr1[i] & 0xff) != (arr2[i] & 0xff)) return -1;
    }
    return 0;
}

function Uint16To2Complement(value) {
    if (value & 0x8000) {
        value = value & 0x7fff;
        value = value - 32768;
    }
    return value;
}

function Uint8To2Complement(value) {
    if (value & 0x80) {
        value = value & 0x7f;
        value = value - 128;
    }
    return value;
}

function addTranslationEthToGponMapper(outerVid, outerPBit, outerTpid, innerVid, innerPbit, innerTpid, nbTagToRemove, gemPort) {
    if ("MT2GUI" == "MT2-Browser") {
        addTranslationEthToGponExt(outerVid, outerPBit, outerTpid, innerVid, innerPbit, innerTpid, nbTagToRemove, gemPort);
    } else {
        addTranslationEthToGpon(outerVid, outerPBit, gemPort);
    }
}

function ArrayToHex(entry) {
    var replacement = "";
    for (var j = 0; j < entry.length; j++) {
        replacement += entry[j].hex(2, 0);
    }
    return replacement;
}

function ArrayToInt(entry) {
    var res = 0;

    for (var j = 0; j < entry.length; j++) {
        res += entry[entry.length - j - 1] * Math.pow(2, j * 8);
    }
    return res;
}

function HexToArray(str) {
    var res = [];
    /// For each MAC address byte
    for (var i = 0; i < str.length; i += 2) {
        /// Add the value
        res.push(parseInt(str.substr(i, 2), 16));
    }
    return res;
}

function HexToInt(str) {
    var res = 0;
    /// For each MAC address byte
    for (var i = 0; i < str.length; i += 1) {
        /// Add the value
        res += parseInt(str[str.length - i - 1], 16) * Math.pow(2, i * 4);
    }
    return res;
}

function ExtractUnsigned64BitsFromArray(input, offset) {
    var res = 0;
    var shiftFactor = 256 * 256 * 256 * 256 * 256 * 256 * 256;
    while ((offset < input.length) && (shiftFactor >= 1)) {
        res += input[offset] * shiftFactor;
        offset++;
        shiftFactor /= 256;
    }
    return res;
}

function ExtractUnsigned32BitsFromArray(input, offset) {
    var res = 0;
    var shiftFactor = 256 * 256 * 256;
    while ((offset < input.length) && (shiftFactor >= 1)) {
        res += input[offset] * shiftFactor;
        offset++;
        shiftFactor /= 256;
    }
    return res;
}

function ExtractUnsigned16BitsFromArray(input, offset) {
    var res = 0;
    var shiftFactor = 256;
    while ((offset < input.length) && (shiftFactor >= 1)) {
        res += input[offset] * shiftFactor;
        offset++;
        shiftFactor /= 256;
    }
    return res;
}

function FormatStringToXML(input) {
    return input.replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function PrintAllAPIs() {
    logInfo("printing all built-in function help");
    logInfo("-----------------------------------");
    var helpString = help();
    var functions = helpString.split('\n');
    var fullHelpString = "";
    for (var i = 1; i < functions.length; i++) {
        var functionName = functions[i].trim();
        var functionHelp = help(functionName);
        logInfo(functionName + "\n" + functionHelp);
        logInfo("----------------------------------");
        fullHelpString += functionHelp;
        fullHelpString += '\n';
    }
    return fullHelpString;
}

addHelpInfo("ArrayByteCmp", "Byte comparison of 2 arrays", ["src", "dst"], ["first array", "second array"], "0 if equal");
addHelpInfo("ArrayToHex", "ArrayToHex(a): transform a byte array into a hex string");
addHelpInfo("ArrayToInt", "ArrayToHex(a): transform a byte array into an integer");
addHelpInfo("ExtractUnsigned64BitsFromArray", "extract a 64 bits unsigned integer from a byte array, at the provided offset", ["array", "offset"], ["source byte array", "byte offset into array"]);
addHelpInfo("ExtractUnsigned31BitsFromArray", "extract a 32 bits unsigned integer from a byte array, at the provided offset", ["array", "offset"], ["source byte array", "byte offset into array"]);
addHelpInfo("ExtractUnsigned16BitsFromArray", "extract a 16 bits unsigned integer from a byte array, at the provided offset", ["array", "offset"], ["source byte array", "byte offset into array"]);
addHelpInfo("HexToArray", "HexToArray(a): transform a hex string into an array");
addHelpInfo("HexToInt", "HexToInt(a): transform a hex string into an integer");
addHelpInfo("isDigit", "isDigit(c): Return true if the char c is a digit");
addHelpInfo("PrintAllAPIs", "printAllAPIs(): print all documented APIs to the log and return the concatenated help string");
addHelpInfo("RandomSeed", "RandomSeed(s): Set the random number generator seed to s");
addHelpInfo("RandomSeedFromFilename", "RandomSeedFromFilename(s): Set the random number generator seed to s and use the filename digit to modify the seed");
addHelpInfo("RandomInteger", "RandomInteger(low, high): Return a randomly choosen integer between low and high");
addHelpInfo("RandomIntegerExcept", "RandomIntegerExcept(low, high, forbiddenValues): Return a randomly choosen integer between low and high (value is choosen to be not present in forbiddenValues array)");
addHelpInfo("RandomIPv4Address", "RandomIPv4Address(): Return a Randomly generated IPv4 address string");
addHelpInfo("RandomUnicastMACAddress", "RandomUnicastMACAddress(): Return a Randomly generated unicast MAC address value");
addHelpInfo("RandomUnicastMACAddressExcept", "RandomUnicastMACAddressExcept(forbiddenValues): Return a Randomly generated unicast MAC address value, excluding the forbiddenValues");
addHelpInfo("Uint16To2Complement", "Uint16To2Complement(value): compute 2's complement value from field");