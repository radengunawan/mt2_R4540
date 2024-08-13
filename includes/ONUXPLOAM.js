////////////////////////////////////////////////////////////
/// Copyright (c) 2021, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eONU-PON ONU emulator product.     ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

ONUXPLOAM = {

    WaitForByONUIndex: function(timeOut_ms, ONU_index) {
        return waitForXPLOAMByONUIndex(timeOut_ms, ONU_index);
    }

};

addHelpInfo("ONUXPLOAM.waitForByONUIndex", "WaitForByONUIndex(timeOut_ms, ONU_index): Wait for any downstream PLOAM message for the given ONU index (256 or empty for broadcast).");
