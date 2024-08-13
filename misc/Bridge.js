include("Config.js");

ONUID = 1;
OMCC = ONUID;

//Multi-interface bridge
//Untagged LAN traffic
//1 VLAN per port
//1 GEM port per pbit mask
var InitializationTable = {
    'OutputTPID': 0x8100,
    'portTable': [
        ///Each entry is a user port
        {
            'VID': 737, /// 1 VID per user port
            'GEMs': [
                ///GEMs, based on priority bits
                { 'id': 434, 'bw': 5, 'pbitsMask': 0xFF },
                ///Add more / pbits
            ]
        },
        ///Add more user ports
        {
            'VID': 942,
            'GEMs': [
                { 'id': 900, 'bw': 400, 'pbitsMask': 0xFF },
            ]
        }
    ],
    'MCASTGEM': 4095
};



/// Reset the emulator
reset();
/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID);
sleep(200);
/// Create OMCC
PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(500);

testPassed("ONU activated");

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

testPassed("MIB Uploaded");

/// Retrieve all needed attributes from the uploaded MIB
var TCONTIndex = 0;
var MCASTVIDList = [];
for (var portIndex = 0; portIndex < InitializationTable.portTable.length; portIndex++) {
    var port = InitializationTable.portTable[portIndex];
    port['TCONTs'] = [];
    port['UpPQs'] = [];
    for (var GEMIndex = 0; GEMIndex < port.GEMs.length; GEMIndex++) {
        if (port.GEMs[GEMIndex] != undefined) {
            var TCONT = OMCI.GetTCONT(OMCC, TCONTIndex);
            port['TCONTs'][TCONTIndex] = TCONT;
            port['UpPQs'][TCONTIndex] = OMCI.GetUpPQ(OMCC, TCONT);
            var allocId = port.GEMs[GEMIndex].id;
            PLOAMMapper.AssignAllocId(ONUID, allocId);
            bwmapAddEntry(ONUID, allocId, port.GEMs[GEMIndex].bw);
            OMCI.Set(OMCC, "T_CONT", TCONT, { "AllocId": allocId });
            TCONTIndex += 1;
        }
    }
    port['DwPQ'] = OMCI.GetDwPQ(OMCC, portIndex);
    port['OMCITP'] = OMCI.GetTerminationPoint(OMCC, portIndex);
    MCASTVIDList.push(port.VID);
}

// create a Broadcast GEM port GEM 2
var CTPMCAST = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { "PortId": InitializationTable['MCASTGEM'], "Direction": 2, "PQPointerDown": 65535 });

var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { "MaxGEMPayloadSize": 4095 });

//Create a bridge
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");

var IWTPMCAST = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTPMCAST, "InterworkingOpt": 6, "GALProfilePointer": 65535 });

var bridgePortNum = 0;

var BPCDMCAST = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": bridgePortNum, "TPtype": 5, "TPPointer": IWTPMCAST });
bridgePortNum += 1; ///must uniquely identify the bridge port
//Filter for Broadcast port
var TFMCAST = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { "meid": BPCDMCAST, "VLANFilterList": MCASTVIDList, "ForwardOpr": 23, "NumberOfEntries": MCASTVIDList.length });

TCONTIndex = 0;
for (var portIndex = 0; portIndex < InitializationTable.portTable.length; portIndex++) {
    var port = InitializationTable.portTable[portIndex];
    for (var GEMIndex = 0; GEMIndex < port.GEMs.length; GEMIndex++) {
        if (port.GEMs[GEMIndex] != undefined) {
            var CTP = OMCI.Create(OMCC, "GEM_Port_Network_CTP", {
                "PortId": port.GEMs[GEMIndex].id,
                "TCONTPointer": port['TCONTs'][TCONTIndex],
                "TMPointerUp": port['UpPQs'][TCONTIndex],
                "PQPointerDown": port['DwPQ']
            });
            TCONTIndex++;
            //Create a p-bit mapper for the bidirectional port
            var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");
            var IWTP = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { "GEMPortNetworkCTPPointer": CTP, "ServiceProfilePointer": PMAP, "GALProfilePointer": GAL });
            //ANI side ports
            var BPCD = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": bridgePortNum, "TPtype": 3, "TPPointer": PMAP });
            var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD, VLANFilterList: [port.VID], ForwardOpr: 16, NumberOfEntries: 1 });
            bridgePortNum += 1;
            ///IWTP
            var P_GEMTable = {};
            for (var mask = 0x01, idx = 0; idx < 8; idx = idx + 1, mask = mask << 1) {
                if (port.GEMs[GEMIndex].pbitsMask & mask)
                    P_GEMTable['P' + idx + 'Ptr'] = IWTP;
                addTranslationEthToGpon(port['VID'], idx, port.GEMs[GEMIndex].id);
            }
            OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, P_GEMTable);
            addTranslationGponToEth(port.GEMs[GEMIndex].id);
        }

    }
    //UNI side port
    var BPCDDown = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { "BridgeIDPointer": BSP, "PortNum": bridgePortNum, "TPtype": OMCI.GetTPType(OMCC), "TPPointer": port['OMCITP'] });
    bridgePortNum += 1;
    var EVTOCD = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": port['OMCITP'] });
    OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD, { "InputTPID": 0x8100, "OutputTPID": InitializationTable['OutputTPID'], "DownstreamMode": 0 });
    OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD, {
        "RcvFrameVLANTagOperTbl": {
            "FilterOuterPriority": 15,
            "FilterOuterVID": 4096,
            "FilterOuterTPID": 0,
            "FilterInnerPriority": 15,
            "FilterInnerVID": 4096,
            "FilterInnerTPID": 0,
            "FilterEtherType": 0,
            "TreatTagsToRemove": 0,
            "TreatOuterPriority": 15,
            "TreatOuterVID": 0,
            "TreatOuterTPID": 0,
            "TreatInnerPriority": 0,
            "TreatInnerVID": port.VID,
            "TreatInnerTPID": 6
        }
    });
    // Unlock the UNI so that it will produce alarms
    OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), port['OMCITP'], { AdminState: 0 });


}

testPassed();