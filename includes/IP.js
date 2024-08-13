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
IP = {
    /** Build a frame and encapsulate the payload
     */
    Build_Frame: function(dst_ip, src_ip, protocol, payload) {
        var frame = new Array();
        /// Add header
        frame = frame.concat(this.Build_PacketHeader(dst_ip, src_ip, protocol, payload.length));
        /// Add payload
        for (var i = 0; i < payload.length; ++i) frame.push(payload[i]);
        return frame;
    },

    Build_Frame_RouterAlert: function(dst_ip, src_ip, protocol, payload) {
        var frame = new Array();
        /// Add header
        frame = frame.concat(this.Build_PacketHeader_RouterAlert(dst_ip, src_ip, protocol, payload.length));
        /// Add payload
        for (var i = 0; i < payload.length; ++i) frame.push(payload[i]);
        return frame;
    },

    /** Parse an IP adress string and convert it into Array object containing the byte
     */
    Parse_IP_AddressString: function(ip_str) {
        /// Result
        var res = new Array();
        /// Index in string
        var idx = 0;
        /// For each MAC address byte
        for (var i = 0; i < 4; ++i) {
            /// Search separator
            var sep = ip_str.indexOf('.', idx);
            /// End of string
            if (sep == -1) sep = ip_str.length;
            /// Add the value
            res[i] = parseInt(ip_str.substr(idx, sep), 10);
            idx = sep + 1;
        }
        return res;
    },

    Parse_IP_Address: function(value) {
        if (typeof(value) == "string")
            return this.Parse_IP_AddressString(value);
        if (typeof(value) == "number") {
            return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
        }
        if (Array.isArray(value))
            return value;
        if ((typeof(value) == "object") && (value.valueAsArray != undefined))
            return value.valueAsArray;
        if ((typeof(value) == "object") && (value.length != undefined))
            ///assume this is of ByteArray typeof
            return value;

        return undefined;
    },

    /** Build the IP header according to the parameters and return an array containing the header
     */
    Build_PacketHeader: function(dst_ip, src_ip, protocol, payload_len) {
        /// Build the header
        var dstIpAddress = IPv4Address(dst_ip);
        var srcIpAddress = IPv4Address(src_ip);
        var header = new Array();
        header.push(0x45); /// Version + length
        header.push(0xC0); /// DSF
        /// Total Length
        header.push(((payload_len + 20) >> 16) & 0xff);
        header.push((payload_len + 20) & 0xff);
        /// Identification
        header.push(0xfa);
        header.push(0x16);
        /// Flags
        header.push(0x00);
        /// Fragment offset
        header.push(0x00);
        /// TTL
        header.push(0x01);
        /// Protocol
        header.push(protocol);
        /// Header Checksum
        header.push(0x00);
        header.push(0x00);
        /// Add Src address
        header = header.concat(srcIpAddress.ToArray());
        /// Add Dst address
        header = header.concat(dstIpAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(header);
        header[10] = (chksum >> 8) & 0xff;
        header[11] = (chksum) & 0xff;
        return header;
    },

    /** Build the IP header according to the parameters and return an array containing the header
     */
    Build_PacketHeader_RouterAlert: function(dst_ip, src_ip, protocol, payload_len) {
        /// Build the header
        var dstIpAddress = IPv4Address(dst_ip);
        var srcIpAddress = IPv4Address(src_ip);
        var header = new Array();
        header.push(0x46); /// Version + length
        header.push(0x00); /// DSF
        /// Total Length
        header.push(((payload_len + 24) >> 16) & 0xff);
        header.push((payload_len + 24) & 0xff);
        /// Identification
        header.push(0x00);
        header.push(0x00);
        /// Flags
        header.push(0x00);
        /// Fragment offset
        header.push(0x00);
        /// TTL
        header.push(0x01);
        /// Protocol
        header.push(protocol);
        /// Header Checksum
        header.push(0x00);
        header.push(0x00);
        /// Add Src address
        header = header.concat(srcIpAddress.ToArray());
        /// Add Dst address
        header = header.concat(dstIpAddress.ToArray());
        /// Add Options
        header.push(0x94);
        header.push(0x04);
        header.push(0x00);
        header.push(0x00);
        /// Update Checksum
        var chksum = this.HeaderChecksum(header);
        header[10] = (chksum >> 8) & 0xff;
        header[11] = (chksum) & 0xff;

        return header;
    },

    HeaderChecksum: function(data) {
        var acc = 0;
        var src;
        var len = data.length;
        var i = 0;
        while (len > 1) {
            src = data[i] << 8;
            i++;
            src |= data[i];
            i++;
            acc += src;
            len -= 2;
        }
        if (len > 0) {
            src = data[i];
            acc += src;
        }
        /// Add deferred carry bits
        acc = (acc >>> 16) + (acc & 0xffff);
        if ((acc & 0xffff0000) != 0) acc = (acc >>> 16) + (acc & 0xffff);
        return (~acc) & 0xffff;
    },

    MACAddressFromIP: function(ip) {
        ///Convenience function -- this is not derived from any standard
        ///globally unique unicast
        var IpAddress = IPv4Address(ip);
        var MAC = 0xC00000000000 + IpAddress.ToInt();

        return IEEE_802_1QAddress(MAC);
    },

};

function IPv4Address(value) {
    var rV = {
        valueAsArray: IP.Parse_IP_Address(value),

        ToInt: function() {
            return ((Math.pow(2, 24) * this.valueAsArray[0]) + (Math.pow(2, 16) * this.valueAsArray[1]) + (Math.pow(2, 8) * this.valueAsArray[2]) + this.valueAsArray[3]);
        },

        ToArray: function() {
            return this.valueAsArray;
        },

        ToString: function() {
            return "" + this.valueAsArray[0] + "." + this.valueAsArray[1] + "." + this.valueAsArray[2] + "." + this.valueAsArray[3];
        }
    };
    return rV;
};


addHelpInfo("IP", "Used to build IP frames");
addHelpInfo("IP.Build_Frame", "Build_Frame(dst_ip, src_ip, protocol, payload): build an IP frame");
addHelpInfo("IP.Build_Frame_RouterAlert", "Build_Frame_RouterAlert(dst_ip, src_ip, protocol, payload): build an IP frame with the RouterAlert option");
addHelpInfo("IP.Parse_IP_Address", "Parse_IP_Address(ip_str): parse a string IPv4 address into a int array");
addHelpInfo("IP.Build_PacketHeader", "Build_PacketHeader(dst_ip, src_ip, protocol, payload_len): Build a standard packet header, TTL=0x01, and checksum included");
addHelpInfo("IP.Build_PacketHeader_RouterAlert", "Build_PacketHeader_RouterAlert(dst_ip, src_ip, protocol, payload_len): Build a packet header with the Router Alert option, TTL=0x01, and checksum included");
addHelpInfo("IP.HeaderChecksum", "HeaderChecksum(headerArray): returns the IPv4 header checksum");
addHelpInfo("IP.MACAddressFromIP", "MACAddressFromIP(ip): convenience function to derive a MAC address from an IP address");
addHelpInfo("IPv4Address", "addHelpInfo(value): Create an IPv4 object from a string, an array or an int");