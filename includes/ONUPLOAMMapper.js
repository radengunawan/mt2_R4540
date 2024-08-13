////////////////////////////////////////////////////////////
/// Copyright (c) 2021, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eONU-GPON ONU emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
include("ONUXPLOAM.js");

ONUPLOAMMapper = {
    PONProtocol: "XGPON",

    WaitForByONUIndex: function(timeOut_ms, ONU_index) {
        switch (this.PONProtocol) {
            case "XGPON":
            case "XGSPON":
                return ONUXPLOAM.WaitForByONUIndex(timeOut_ms, ONU_index);
            case "NGPON2":
                logError("Not implemented for  " + this.PONProtocol);
            case "GPON":
                logError("Not implemented for  " + this.PONProtocol);
            default:
                logError("No PON protocol defined " + this.PONProtocol);
        }
    }
};

ONUPLOAMMapper.PONProtocol = PLOAMMapper.PONProtocol;

addHelpInfo("ONUPLOAMMapper", "ONUPLOAMMapper: encapsulate PLOAM and XPLOAM, XGSPLOAM, NGPON2 functionnalities. PONProtocol member must be set to GPON, XGPON, XGSPON or NGPON2");
addHelpInfo("ONUPLOAMMapper.WaitForByONUIndex", "WaitForByONUIndex(timeOut_ms, ONU_index): Wait for any downstream PLOAM message for the given ONU index (256 for broadcast).");
