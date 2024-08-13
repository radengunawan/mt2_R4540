////////////////////////////////////////////////////////////
/// Copyright (c) 2014, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 eOLT-GPON OLT emulator product.    ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////
PPPoE = {

    AppendHeader: function(frame, code, sessionId, len) {
        frame.push(0x11);
        frame.push(code);
        frame.push((sessionId >> 8) & 0xff);
        frame.push((sessionId & 0xff));
        frame.push((len >> 8) & 0xff);
        frame.push((len & 0xff));

        return frame;
    },

    Build_PADI: function(serviceTag, extraTagsArray) {
        var frame = new Array();

        var serviceTagLength = 0;
        if (serviceTag !== undefined) {
            serviceTagLength = serviceTag.length;
        }
        var extraTagsArrayLength = 0;
        if (extraTagsArray !== undefined) {
            extraTagsArrayLength = extraTagsArray.length;
        }

        PPPoE.AppendHeader(frame, 0x09, 0x0000, 4 + serviceTagLength + extraTagsArrayLength);
        if (serviceTagLength > 0) {
            frame.push(0x01);
            frame.push(0x01);
            frame.push((serviceTagLength >> 8) & 0xff);
            frame.push((serviceTagLength & 0xff));
            for (var i = 0; i < serviceTagLength; i++) {
                frame.push(serviceTag.charCodeAt(i));
            }
        }
        if (extraTagsArrayLength > 0) {
            frame = frame.concat(extraTagsArray);
        }

        return frame;
    },

    Build_PADO: function(ACName, serviceTag, extraTagsArray) {
        var frame = new Array();
        var serviceTagLength = 0;
        if (serviceTag !== undefined) {
            serviceTagLength = serviceTag.length;
        }
        var extraTagsArrayLength = 0;
        if (extraTagsArray !== undefined) {
            extraTagsArrayLength = extraTagsArray.length;
        }
        PPPoE.AppendHeader(frame, 0x07, 0x0000, 4 + serviceTagLength + 4 + ACName.length + extraTagsArrayLength);
        if (ACName.length > 0) {
            frame.push(0x01);
            frame.push(0x02);
            frame.push((ACName.length >> 8) & 0xff);
            frame.push((ACName.length & 0xff));
            for (var i = 0; i < ACName.length; i++) {
                frame.push(ACName.charCodeAt(i));
            }
        }
        if (serviceTagLength > 0) {
            frame.push(0x01);
            frame.push(0x01);
            frame.push((serviceTagLength >> 8) & 0xff);
            frame.push((serviceTagLength & 0xff));
            for (var i = 0; i < serviceTagLength; i++) {
                frame.push(serviceTag.charCodeAt(i));
            }
        }
        if (extraTagsArrayLength > 0) {
            frame = frame.concat(extraTagsArray);
        }

        return frame;
    },

    CreateCircuitId: function(accessNodeId, onuId, Vlan) {
        var circuitId = accessNodeId + " " + onuId;
        if (Vlan) circuitId += ":" + Vlan;

        return circuitId;
    },

    AppendOption82Tag: function(frame, agentRemoteId, accessNodeId, onuId, Vlan) {
        var circuitId = PPPoE.CreateCircuitId(accessNodeId, onuId, Vlan);

        frame.push(0x01);
        frame.push(0x05); //vendor specific tag
        var len = 4 + 2 + circuitId.length + 2 + agentRemoteId.length;
        frame.push((len >> 8) & 0xff);
        frame.push(len & 0xff); //length
        frame.push(0x00);
        frame.push(0x00);
        frame.push(0x0D);
        frame.push(0xE9); //BBF IANA
        frame.push(0x01);
        frame.push(circuitId.length);
        for (var i = 0; i < circuitId.length; i++) frame.push(circuitId.charCodeAt(i));
        frame.push(0x02);
        frame.push(agentRemoteId.length);
        for (var i = 0; i < agentRemoteId.length; i++) frame.push(agentRemoteId.charCodeAt(i));

        PPPoE.SetLength(frame, (PPPoE.GetLength(frame) + len + 4));
        return frame;
    },

    GetLength: function(frame) {
        return (((frame[4] & 0x00ff) << 8) + (frame[4] & 0x00ff));
    },

    SetLength: function(frame, len) {
        frame[4] = ((len >> 8) & 0xff);
        frame[5] = ((len & 0xff));
    }

};