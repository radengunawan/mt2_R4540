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
include("IP.js");

IGMP = {

    addressAllocationRange: "SSM", //"Ad-Hoc2", //"SSM",
	///Leave delay
	leaveDelay : 26000, ///Default value 26 sec

    Build_Query: function(multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var payload = new Array();
        /// Type Membership query
        payload.push(0x11);
        payload.push(0x64); /// 10 sec to respond
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Reserved = 4 bits -	S = 1 bit - QRV = 3 bit
        /// (S for "Suppress Router-Side Processing"  /  QRV for "Querier's Robustness Variable") 
        payload.push(0x00);
        /// QQIC    
        payload.push(0x7d);
        /// Number of source
        payload.push(0x00);
        payload.push(0x00);
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
    },

    Build_GeneralQuery: function() {
        return this.Build_Query("0.0.0.0");
    },

    Build_Join: function(srcAddress, multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var sourceAddress = IPv4Address(srcAddress);
        var payload = new Array();
        /// Type Membership report
        payload.push(0x22);
        payload.push(0x00);
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        payload.push(0x00);
        payload.push(0x00);
        /// Number of records
        payload.push(0x00);
        payload.push(0x01);
        /// First Group record entry
        payload.push(0x05); /// Allow new sources
        payload.push(0x00); /// Aux data length
        payload.push(0x00);
        payload.push(0x01); /// Number of source
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Source address
        payload = payload.concat(sourceAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
    },

    Build_Leave: function(multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var payload = new Array();
        /// Type Membership report
        payload.push(0x22);
        payload.push(0x00);
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        payload.push(0x00);
        payload.push(0x00);
        /// Number of records
        payload.push(0x00);
        payload.push(0x01);
        /// First Group record entry
        payload.push(0x03); /// Change to include more
        payload.push(0x00); /// Aux data length
        payload.push(0x00);
        payload.push(0x00); /// Number of source
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
    },

    Build_MembershipReport_v2: function(multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var payload = new Array();
        /// Type Membership report
        payload.push(0x16);
        payload.push(0x00);
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
    },

    Build_Leave_v2: function(multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var payload = new Array();
        /// Type Leave
        payload.push(0x17);
        payload.push(0x00);
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
    },

    Build_MembershipReport_v1: function(multicastAddress) {
        var groupAddress = IPv4Address(multicastAddress);
        var payload = new Array();
        /// Type Membership report
        payload.push(0x12);
        payload.push(0x00);
        /// IGMP Header checksum
        payload.push(0x00);
        payload.push(0x00);
        /// Multicast Address
        payload = payload.concat(groupAddress.ToArray());
        /// Update Checksum
        var chksum = this.HeaderChecksum(payload);
        payload[2] = (chksum >> 8) & 0xff;
        payload[3] = (chksum) & 0xff;
        return payload;
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

    IP_ALL_SYSTEMS: function() {
        return IPv4Address("224.0.0.1");
    },
    MAC_ALL_SYSTEMS: function() {
        return IEEE_802_1QAddress(0x01005e000001);
    },

    IP_ALL_ROUTERS: function() {
        return IPv4Address("224.0.0.2");
    },
    MAC_ALL_ROUTERS: function() {
        return IEEE_802_1QAddress(0x01005e000002);
    },

    IP_IGMPv3_REPORT: function() {
        return IPv4Address("224.0.0.22");
    },
    MAC_IGMPv3_REPORT: function() {
        return IEEE_802_1QAddress(0x01005e000016);
    },
	
	LEAVE_DELAY: function() {
		return this.leaveDelay;
	},

    usedMulticastAddresses: [],

    GetUnusedMcastIPv4Address: function() {
        var res = "";
        if (this.addressAllocationRange == "SSM")
            res = RandomSSMMulticastIPv4AddressExcept(this.usedMulticastAddresses);
        else
            res = RandomAdHoc2MulticastIPv4AddressExcept(this.usedMulticastAddresses);
        this.usedMulticastAddresses.push(res);
        return IPv4Address(res);
    },

    GroupMACAddressFromIP: function(ip) {
        var IpAddress = IPv4Address(ip);
        var MAC = 0x01005e000000 + (IpAddress.ToInt() & 0x007FFFFF);

        return IEEE_802_1QAddress(MAC);
    },

    McastMACAddressFromIP: function(ip) {
        ///Convenience function -- this is not derived from any standard
        ///globaly unique multicast
        var IpAddress = IPv4Address(ip);
        var MAC = 0xD00000000000 + IpAddress.ToInt();

        return IEEE_802_1QAddress(MAC);
    }
};

addHelpInfo("IGMP", "Used to build IGMP frames");
addHelpInfo("IGMP.Build_Query", "Build_Query(groupAddress): Build an IGMPv3 Membership query for groupAddress");
addHelpInfo("IGMP.Build_GeneralQuery", "Build_GeneralQuery(): Build an IGMPv3 General Query");
addHelpInfo("IGMP.Build_Join", "Build_Join(srcAddress, multicastAddress): Build an IGMPv3 join (v3 Membership report");
addHelpInfo("IGMP.Build_Leave", "Build_Leave(multicastAddress): Build an IGMPv3 leave (v3 Membership report");
addHelpInfo("IGMP.Build_MembershipReport_v2", "Build_MembershipReport_v2(multicastAddress): Build an IGMPv2 Membership report");
addHelpInfo("IGMP.Build_Leave_v2", "Build_Leave_v2(multicastAddress): Build an IGMPv2 Leave");
addHelpInfo("IGMP.Build_MembershipReport_v1", "Build_MembershipReport_v1(multicastAddress): Build an IGMPv1 Membership report");
addHelpInfo("IGMP.HeaderChecksum", "HeaderChecksum(IGMPArray): Computes the IGMP checksum over the array and returns it");
addHelpInfo("IGMP.GetUnusedMcastIPv4Address", "GetUnusedMcastIPv4Address(): get a random multicast IP address");
addHelpInfo("IGMP.GroupMACAddressFromIP", "GroupMACAddressFromIP(ip): derives a group mac address from a group ip address");
addHelpInfo("IGMP.McastMACAddressFromIP", "McastMACAddressFromIP(ip): convenience function to derives a multicast mac address from an ip multicast address");