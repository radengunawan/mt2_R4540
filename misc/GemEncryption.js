include("Config.js");
include("IEEE_802_1Q.js");

//Test case 6.1.1
/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var AllocIdNb = GEM1;

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
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var DwPQ1 = OMCI.GetDwPQ(OMCC, 0);
var OMCITP = OMCI.GetTerminationPoint(OMCC, 0);

/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocIdNb, 50);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocIdNb);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocIdNb });

/// Send config
// Create GEM port GEM1
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DwPQ1 });
var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

// ANI side port
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP });
var TF = OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP, GALProfilePointer: GAL });
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP, { P0Ptr: IWTP1, P1Ptr: IWTP1, P2Ptr: IWTP1, P3Ptr: IWTP1, P4Ptr: IWTP1, P5Ptr: IWTP1, P6Ptr: IWTP1, P7Ptr: IWTP1 });

// UNI side port
var BPCD2 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { AssociationType: OMCI.GetTPAssociationType(OMCC), AssocMEPointer: OMCITP });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, DownstreamMode: 0 });

//Rewrite 3 default to drop unrecognized frames
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 14,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 14,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 3,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 15,
        TreatInnerVID: 4096,
        TreatInnerTPID: 0
    }
});

//Set the test specific tag rule												 												 
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, {
    RcvFrameVLANTagOperTbl: {
        FilterOuterPriority: 15,
        FilterOuterVID: 4096,
        FilterOuterTPID: 0,
        FilterInnerPriority: 15,
        FilterInnerVID: 4096,
        FilterInnerTPID: 0,
        FilterEtherType: 0,
        TreatTagsToRemove: 0,
        TreatOuterPriority: 15,
        TreatOuterVID: 0,
        TreatOuterTPID: 0,
        TreatInnerPriority: 0,
        TreatInnerVID: SVID1,
        TreatInnerTPID: 6
    }
});
// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP, { AdminState: 0 });

testPassed("MIB Configuration set");

/// All frame recevied from Ethernet has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, 0xff, GEM1);
/// All frame received from the GEM1 has to be replicated on OLT Ethernet port
addTranslationGponToEth(GEM1);

///set encryption on gem port
PLOAMMapper.ActivateEncryption(ONUID, GEM1);

logInfo("sleep");
sleep(20000);

logInfo("Random value: SVID1=" + SVID1);
logInfo("Random value: GEM1=" + GEM1);

testPassed("Starting traffics");

var MAC1 = RandomUnicastMACAddress();
var MAC2 = RandomUnicastMACAddressExcept([MAC1]);
var databuf = [];

for (var i=0;i<500;i++) databuf[i] =  i & 0xff; /// ramp pattern

var packet = IEEE_802_1Q.Build_STag_Frame(IEEE_802_1Q.MAC_To_String(MAC1), IEEE_802_1Q.MAC_To_String(MAC2), 0, SVID1, 0x800, IP.Build_Frame("192.168.3.1", "128.0.0.5", 0xff /* protocol */, databuf));

for (i=0;i<100;i++) {
	sendGemFrame(GEM1, packet);
	sleep(1);
}

testPassed();