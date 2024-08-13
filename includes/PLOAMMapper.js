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
include("PLOAM.js");
include("XPLOAM.js");
include("NGPLOAM.js");

PLOAMMapper = {
    PONProtocol: "GPON",

    ReadProtocolFromDevice: function () {
        if (MT2GUI != "eOLT-GUI") {
            switch (getDeviceType()) {
            case "eOLT-GPON":
            case "eONU-GPON":
            case "NIVA-GPON":
                return "GPON";

            case "eOLT-XGPON":
            case "eONU-XGPON":
            case "NIVA-XGPON":
                return "XGPON";

            case "eOLT-XGSPON":
            case "eONU-XGSPON":
            case "NIVA-XGSPON":
                return "XGSPON";

            case "eOLT-NGPON2":
            case "eONU-NGPON2":
            case "NIVA-NGPON2":
                return "NGPON2";

            default:
                testFailed("Unknown device type " + getDeviceType());
            }
        }
		return "GPON";
    },

	Protocol: function() {
		return this.PONProtocol;
	},

    DiscoverONU: function (serialNumber) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.DiscoverONU(serialNumber, this.PONProtocol, undefined);
        case "NGPON2":
            return NGPLOAM.DiscoverONU(serialNumber, undefined, undefined, undefined);
        case "GPON":
            return PLOAM.DiscoverONU(serialNumber);
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    ActivateAndRangeONU: function(onuId, fec, serialNumber) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.ActivateAndRangeONU(onuId, fec, this.PONProtocol, serialNumber);
        case "NGPON2":
            return NGPLOAM.ActivateAndRangeONU(onuId, undefined, undefined, fec, serialNumber);
        case "GPON":
            return PLOAM.ActivateAndRangeONU(onuId, fec, serialNumber);
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    ActivateAndRangeONUForSerialNumber: function(onuId, serialNumber) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.ActivateAndRangeONU(onuId, 0, this.PONProtocol, serialNumber);
            return;
        case "NGPON2":
            NGPLOAM.ActivateAndRangeONU(onuId, undefined, undefined, 0, serialNumber);
            return;
        case "GPON":
            PLOAM.ActivateAndRangeONUForSerialNumber(onuId, serialNumber);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    DeactivateONU: function(onuId) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.DeactivateONU(onuId);
            return;
        case "NGPON2":
            NGPLOAM.DeactivateONU(onuId);
            return;
        case "GPON":
            PLOAM.DeactivateONU(onuId);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    AssignAllocId: function(onuId, allocid) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.AssignAllocId(onuId, allocid);
            return;
        case "NGPON2":
            NGPLOAM.AssignAllocId(onuId, allocid);
            return;
        case "GPON":
            PLOAM.AssignAllocId(onuId, allocid);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    CreateOMCC: function(onuId, OMCC) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.CreateOMCC(onuId, OMCC);
            return;
        case "NGPON2":
            NGPLOAM.CreateOMCC(onuId, OMCC);
            return;
        case "GPON":
            PLOAM.CreateOMCC(onuId, OMCC);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    GetUnusedDataGEMPort: function() {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.GetUnusedDataGEMPort(this.PONProtocol);
        case "NGPON2":
            return NGPLOAM.GetUnusedDataGEMPort(this.PONProtocol);
        case "GPON":
            return PLOAM.GetUnusedDataGEMPort();
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
        return undefined;
    },

    ReserveDataGEMPort: function(GEMPort) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.ReserveDataGEMPort(GEMPort);
        case "NGPON2":
            return NGPLOAM.ReserveDataGEMPort(GEMPort);
        case "GPON":
            return PLOAM.ReserveDataGEMPort(GEMPort);
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
        return undefined;
    },

    ActivateEncryption: function(onuId, portId, keyIndex) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.ActivateEncryption(onuId, portId, keyIndex);
            return;
        case "NGPON2":
            NGPLOAM.ActivateEncryption(onuId, portId, keyIndex);
            return;
        case "GPON":
            PLOAM.ActivateEncryption(onuId, portId);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    DeactivateEncryption: function(onuId, portId) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            XPLOAM.DeactivateEncryption(onuId, portId);
            return;
        case "NGPON2":
            NGPLOAM.DeactivateEncryption(onuId, portId);
            return;
        case "GPON":
            PLOAM.DeactivateEncryption(onuId, portId);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    GetPassword: function(onuId) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.GetPassword(onuId);
        case "NGPON2":
            return NGPLOAM.GetPassword(onuId);
        case "GPON":
            return PLOAM.GetPassword(onuId);
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },

    waitFor: function(message, onuId, timeOut, nb) {
        switch (this.PONProtocol) {
        case "XGPON":
        case "XGSPON":
            return XPLOAM.waitFor(message, onuId, timeOut, nb);
        case "NGPON2":
            return NGPLOAM.waitFor(message, onuId, timeOut, nb);
        case "GPON":
            return PLOAM.waitFor(message, onuId, timeOut, nb);
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }
    },
	
	GetDefaultBWMapUnitInBytes: function () { ///Must define a function based on ONU ranging to handle multi-rate
		switch (this.PONProtocol) {
        case "XGPON":
			return 4;
        case "XGSPON":
            return 16;
        case "NGPON2":
            return 16;
        case "GPON":
            return 1;
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }	
	},
	
	GetDefaultFrameSizeInBytes: function() {
		switch (this.PONProtocol) {
        case "XGPON":
			return 38880;
        case "XGSPON":
            return 135432;
        case "NGPON2":
            return 135432;
        case "GPON":
            return 19440;
            return;
        default:
            logError("No PON protocol defined " + this.PONProtocol);
        }	
	}
};

PLOAMMapper.PONProtocol = PLOAMMapper.ReadProtocolFromDevice();

addHelpInfo("PLOAMMapper", "PLOAMMapper: encapsulate PLOAM and XPLOAM functionnalities. PONProtocol member must be set to GPON or XGPON or XGSPON or NGPON2");
addHelpInfo("PLOAMMapper.ActivateAndRangeONU", "ActivateAndRangeONU(onuId, fec): Activate And Range a new ONU using the specified onuId");
addHelpInfo("PLOAMMapper.ActivateEncryption", "ActivateEncryption(onuId, portId): Activate the encryption of the specified portId");
addHelpInfo("PLOAMMapper.AssignAllocId", "AssignAllocId(onuId, allocid): Assign Alloc ID allocid to the specified onuId");
addHelpInfo("PLOAMMapper.CreateOMCC", "CreateOMCC(onuId, omcc): Create a specific OMCC for the specified onuId");
addHelpInfo("PLOAMMapper.DeactivateEncryption", "DeactivateEncryption(onuId, portId): Deactivate the encryption of the specified portId");
addHelpInfo("PLOAMMapper.DeactivateONU", "DeactivateONU(onuId): Deactivate the ONU with specified onuId");
addHelpInfo("PLOAMMapper.GetDefaultBWMapUnitInBytes", "Get the default number of bytes per BWMap unit for the object. In case of multi-rate support, actual ONU must bé checked", [], [], "The number of bytes");
addHelpInfo("PLOAMMapper.GetDefaultFrameSizeInBytes", "Get the default frame size for the object. In case of multi-rate support, actual ONU must bé checked", [], [], "The number of bytes");
addHelpInfo("PLOAMMapper.GetPassword", "GetPassword(onuId): Ask and return the Password of the specified ONU");
addHelpInfo("PLOAMMapper.GetUnusedDataGEMPort", "GetUnusedDataGEMPort(): gets an unused data gem port value, and reserves it");
addHelpInfo("PLOAMMapper.Protocol", "Retrieve the protocol. This may be different from ReadProtocolFromDevice as it can be forced.", [], [], "PON protocol string id");
addHelpInfo("PLOAMMapper.ReadProtocolFromDevice", "Read PON protocol from PON Platform", [], [], "PON protocol string id");
addHelpInfo("PLOAMMapper.ReserveDataGEMPort", "ReserveDataGEMPort(GEMPort): reserves the GEM port, if available. returns the GEM port if successful, undefined otherwise");
addHelpInfo("PLOAMMapper.waitFor", "waitFor: function(message, onuId, timeOut): wait for a specific PLOAM message");