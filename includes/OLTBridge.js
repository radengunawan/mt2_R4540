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

OLTBridge = {
    /** Reset the bridge status and remove all bridging rules
     */
    Reset_Rules: function() {
        delAllTranslationRules();
    },

    /** Create bridge of received frame from Ethernet to GEM Port
     * Send all frames with specified vid and priority to gemPort
     */
    Start_Bridge_Eth_To_GPON_VLAN_Priority: function(vid, priority, gemPort) {
        addTranslationEthToGpon(vid, priority, gemPort);
    },

    /** Create bridge of received frame from Ethernet to GEM Port
     * Send all frames with specified vid to gemPort (all priority)
     */
    Start_Bridge_Eth_To_GPON_VLAN: function(vid, gemPort) {
        addTranslationEthToGpon(vid, 0xff, gemPort);
    },

    /** Create bridge of received frame from Ethernet to GEM Port
     * Send all frames with specified vid and priority to gemPort
     */
    Start_Bridge_Eth_To_GPON: function(gemPort) {
        addTranslationEthToGpon(0xffff, 0xff, gemPort);
    },

    /** Create bridge of GEM Port received data to Ethernet port
     */
    Start_Bridge_GPON_To_Eth: function(gemPort) {
        addTranslationGponToEth(gemPort);
    },

    /** Start a bidirectionnal bridge between Ethernet and GEM Port
     */
    Start_Bidirectionnal_Bridge: function(vid, priority, gemPort) {
        var v;
        if (vid == "all") v = 0xffff;
        else v = vid;
        var p;
        if (priority == "all") p = 0xff;
        else p = priority;
        addTranslationEthToGpon(v, p, gemPort);
        addTranslationGponToEth(gemPort);
    }
};