////////////////////////////////////////////////////////////
/// Copyright (c) 2020, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

CSV = {
    /// separator by default is semicolon
    separator: ";",

    /// Parse a CSV file
    /// \param the path to CSV file
    /// \return the array of data
    parse: function(pathToCSV) {
        /// Try to load the file with the specified path
        var CSVFile = ArrayToString(readFile(PathToCSVFile));
        if (CSVFile == "") testFailed("Unable to load " + PathToCSVFile);
        logInfo("Loading data from file " + PathToCSVFile);
        var firstEndOfLine = 0;
        var secondEndOfLine = undefined;
        var resp = [];

        for (var i = 0; i < CSVFile.length; i++) {
            if (CSVFile[i] == "\n") {
                if ((secondEndOfLine == undefined) && (i != firstEndOfLine)) secondEndOfLine = i;
                if ((firstEndOfLine != undefined) && (secondEndOfLine != undefined)) {
                    var lineToParse = CSVFile.substring(firstEndOfLine, secondEndOfLine);
                    firstEndOfLine = ++secondEndOfLine;
                    secondEndOfLine = undefined;

                    var firstNbParse = 0;
                    var secondNbParse = undefined;

                    var data = [];

                    for (var x = 0; x < lineToParse.length; x++) {
                        if ((lineToParse[x] == this.separator) || (x == (lineToParse.length - 1))) {
                            if (x == (lineToParse.length - 1)) x = lineToParse.length;
                            if (secondNbParse == undefined) secondNbParse = x;
                            if (secondNbParse != undefined) {
                                data.push(lineToParse.substring(firstNbParse, secondNbParse));
                                firstNbParse = ++secondNbParse;
                                secondNbParse = undefined;
                            }
                        }
                    }
                    resp.push(data);
                }
            }
        }
        return resp;
    },

    /// Write a CSV file from a two-dimensional array in the specified path
    /// \param A two-dimensional array
    /// \param A string with the path wanted
    writeFile: function(CSVArray, pathToFile) {
        var CSVString = "";
        if (Array.isArray(CSVArray) && Array.isArray(CSVArray[0])) {
            for (var i = 0; i < CSVArray.length; i++) {
                for (var f = 0; f < CSVArray[i].length; f++) {
                    CSVString += CSVArray[i][f];
                    if ((CSVArray[i].length - 1) != f) CSVString += this.separator;
                }
                CSVString += "\n";
            }
            saveFile(pathToFile, CSVString);
        }
    },
}