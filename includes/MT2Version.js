////////////////////////////////////////////////////////////
//// Copyright (c) 2017, MT2 SAS                          ///
///// All rights reserved.                                 ///
/////                                                      ///
///// This script is provided by MT2 and is intended to be ///
///// used with the MT2 eOLT-GPON OLT emulator product.    ///
/////                                                      ///
///// For support contact: tech-support@mt2.fr             ///
/////                                                      ///
//////////////////////////////////////////////////////////////

///// MT2 GUI
///// ////////////////////
var MT2GUI = "MT2-Browser"; // Valid values {"MT2-Browser", "eOLT-GUI"}
//var eOLTKernelRev = 2680; // Only useful for eeOLT-GUI
if (typeof getDeviceType !== typeof undefined) {
    MT2GUI = "MT2-Browser";
} else {
    MT2GUI = "eOLT-GUI";
    eOLTKernelRev = 2680;
}