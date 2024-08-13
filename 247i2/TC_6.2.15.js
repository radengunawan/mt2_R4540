include("Config.js");

//Test case 6.2.15 Indicating drop precedence using p-bits downstream

/// Initialize Variables
var maxPackets = 98304;
var PacketSize = 1280 * 8;
var lossThresholdRatio = 0.5; // 50%
var portSpeedMbps = 100;
var numPacketsInStablePeriod = 73728;

var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var SPbits2 = 2;
var SPbits3 = 3;
var SPbits4 = 4;
var SPbits5 = 5;

/// Reset the emulator
reset();
/// Deactivate the ONU In case it is already activated
PLOAMMapper.DeactivateONU(ONUID);
sleep(1500);
/// ONU Activation
PLOAMMapper.ActivateAndRangeONU(ONUID, upstreamFEC, serialNumber);
sleep(200);
/// Create OMCC
PLOAMMapper.CreateOMCC(ONUID, OMCC);
sleep(200);

/// MIB Reset
OMCI.MIB_Reset(OMCC);
OMCI.MIB_Upload(OMCC);

/// Retrieve all needed attributes from the uploaded MIB
var TCONT1 = OMCI.GetTCONT(OMCC, 0);
var TCONT2 = OMCI.GetTCONT(OMCC, 1);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var UpPQ2 = OMCI.GetUpPQ(OMCC, TCONT2);
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);


/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });

//create GEM port GEM1 through GEM2
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });

//MaxQSize is the maximum queue size, i.e. any packet arriving after the queue reaches this size will be dropped
//MaxQSizeDiv2 is equal to MaxQSize divided by 2
var MaxDnUni1PQ1Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ1, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ1, { DropPrecColourMark: 5, PacketDropQThresh: { GreenMin: MaxDnUni1PQ1Size, GreenMax: MaxDnUni1PQ1Size, YellowMin: (MaxDnUni1PQ1Size >> 1), YellowMax: (MaxDnUni1PQ1Size >> 1) } });
var MaxDnUni1PQ2Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ2, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ2, { DropPrecColourMark: 5, PacketDropQThresh: { GreenMin: MaxDnUni1PQ2Size, GreenMax: MaxDnUni1PQ2Size, YellowMin: (MaxDnUni1PQ2Size >> 1), YellowMax: (MaxDnUni1PQ2Size >> 1) } });


var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//1 ANI side ports, 1 per VID
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });

//Since VID-mapping, make both p-bits point to same IWTP. All other pbit values get discarded due to null pointers in pbit mapper
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, { "P2Ptr": IWTP1, "P3Ptr": IWTP1, "P4Ptr": IWTP2, "P5Ptr": IWTP2 });

//UNI side port
/// Port Num set to 2 instead of 3 (Mike Confirmation is pending)
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 2, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

/// All frame recevied from Ethernet with Pbit2 has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, SPbits2, GEM1);
/// All frame recevied from Ethernet with Pbit3 has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, SPbits3, GEM1);
/// All frame recevied from Ethernet with Pbit4 has to be sent on GEM2 GEM Port
addTranslationEthToGpon(0xffff, SPbits4, GEM2);
/// All frame recevied from Ethernet with Pbit5 has to be sent on GEM2 GEM Port
addTranslationEthToGpon(0xffff, SPbits5, GEM2);

logInfo("Random values: SVID1=" + SVID1 + " ; SPbits2=" + SPbits2 + " ; SPbits3=" + SPbits3 + " ; SPbits4=" + SPbits4 + " ; SPbits5=" + SPbits5);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);

if (TrafficGenerator.activateAutomatisation) {
    var Tolerance = Tol_6_2_15;
    var LatencyTime = 2;
    testPassed("Starting traffics");
    var verdict = true;
    /// Connect to the TrafficGenerator
    TrafficGenerator.Connect();

    var MAC1 = 0x102233445501;
    var MAC2 = 0x202233445502;

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.2.15", [
                ["<SVID1>", SVID1, 3],
                ["<MAC1>", MAC1, 0xC],
                ["<MAC2>", MAC2, 0xC],
                ["<MAXPACKETS>", maxPackets, undefined, 10]
            ]);
    sleep(TrafficGenerator.delayBeforeTraffic);
	
	TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

    /// Force rate to R = 0.7E
    RateTot = 100; // 100Mbit/s
    var Rate = Math.round(RateTot * 0.7 * 1000000);
    logInfo("Rate : " + Rate + " bits/s");
    logInfo("Packet size: " + PacketSize + "bits");
    /// Wait for sending and receiving
    var WaitTime = Math.round(maxPackets / (Rate / PacketSize) + LatencyTime);
    logInfo("Test phase duration " + WaitTime + " ssecs");

    TrafficGenerator.SetBitRateForStream(0, 0, Rate);
    TrafficGenerator.SetBitRateForStream(0, 1, Rate);
    TrafficGenerator.SetBitRateForStream(0, 2, Rate);
    TrafficGenerator.SetBitRateForStream(0, 3, Rate);

    logInfo("Starting A and B streams");
    TrafficGenerator.EnableStreamOnPort(0, 0);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.DisableStreamOnPort(3, 0);
    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    testPassed("Running traffic (stream A & B) for " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0, [maxPackets, maxPackets, maxPackets, maxPackets]);

    /// Wait for sending and receiving
    sleep(WaitTime * 1000);
    logInfo("Stopping A and B streams");
    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    /// Get transmit statistics
    var nbOfPacketSentA = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 0);
    var nbOfPacketSentB = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 1);
    /// Get statistics for each received stream
    var nbOfRcvdStabB = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2);
    logInfo(" RcvdStabB: " + nbOfRcvdStabB);
    var nbOfRcvd1 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 1);
    var nbOfRcvd2 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 2);


    logInfo("Starting C and D streams");
    TrafficGenerator.DisableStreamOnPort(0, 0);
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    testPassed("Running traffic (stream C & D) for " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0, [maxPackets, maxPackets, maxPackets, maxPackets]);
    ///Wait for sending and receiving
    sleep(WaitTime * 1000);
    logInfo("Stopping C and D streams");
    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    /// Get transmit statistics
    var nbOfPacketSentC = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 2);
    var nbOfPacketSentD = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 3);
    /// Get statistics for each received stream
    var nbOfRcvdStabD = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3);
    logInfo(" RcvdStabD: " + nbOfRcvdStabD);
    var nbOfRcvd3 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 3);
    var nbOfRcvd4 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 4);

    logInfo("#########_______A*____|_____B____|||____C*____|____D______Source");
    logInfo("SENT TOT_____: ___" + nbOfPacketSentA + "___|__ " + nbOfPacketSentB + " __|||__ " + nbOfPacketSentC + " __|__ " + nbOfPacketSentD);
    logInfo("RECEIVED TOT_: ___" + nbOfRcvd1 + "___|__ " + nbOfRcvd2 + " __|||__ " + nbOfRcvd3 + " __|__ " + nbOfRcvd4 + "_____TID");
    logInfo("RCVD TOT %__: ___" + ((nbOfRcvd1 / nbOfPacketSentA) * 100).toFixed(2) + "% _|__ " + ((nbOfRcvd2 / nbOfPacketSentB) * 100).toFixed(2) + "% |||_ " + ((nbOfRcvd3 / nbOfPacketSentC) * 100).toFixed(2) + "% _|__ " + ((nbOfRcvd4 / nbOfPacketSentD) * 100).toFixed(2) + "% __ Filter");

    /// Check for the verdict
    if (nbOfRcvd2 >= nbOfPacketSentB - Tolerance) {
        logInfo("PASSED : All the packets from Frame Set B correctly received with tolerance: " + Tolerance + " frame(s)");
    } else {
        verdict = false;
        var nbframeslostB = nbOfPacketSentB - nbOfRcvd2;
        var lostpercB = ((nbframeslostB / nbOfPacketSentB) * 100).toFixed(2);
        logError("FAILED : " + nbframeslostB + " packets from Frame Set B lost (Tolerance is " + Tolerance + " ) : " + lostpercB + " %");
        if (nbOfRcvdStabB < numPacketsInStablePeriod - Tolerance) {
            verdict = false;
            var nbframeslostStabB = numPacketsInStablePeriod - nbOfRcvdStabB;
            var lostpercStabB = ((nbframeslostStabB / numPacketsInStablePeriod) * 100).toFixed(2);
            logError(nbframeslostStabB + " packets from Frame Set B lost (among " + numPacketsInStablePeriod + ") during stabilized state:" + lostpercStabB + " %");
        } else {
            logInfo("No packet Frame Set B lost during stabilized state");
        }
    }

    if (nbOfRcvd4 >= nbOfPacketSentD - Tolerance) {
        logInfo("PASSED : All the packets from Frame Set D correctly received with tolerance: " + Tolerance + " frame(s)");
    } else {
        verdict = false;
        var nbframeslostD = nbOfPacketSentD - nbOfRcvd4;
        var lostpercD = ((nbframeslostD / nbOfPacketSentD) * 100).toFixed(2);
        logError("FAILED : " + nbframeslostD + " packets from Frame Set D lost (Tolerance is " + Tolerance + " ) : " + lostpercD + " %");
        if (nbOfRcvdStabD < numPacketsInStablePeriod - Tolerance) {
            verdict = false;
            var nbframeslostStabD = numPacketsInStablePeriod - nbOfRcvdStabD;
            var lostpercStabD = ((nbframeslostStabD / numPacketsInStablePeriod) * 100).toFixed(2);
            logError(nbframeslostStabD + " packets from Frame Set D lost (among " + numPacketsInStablePeriod + ") during stabilized state:" + lostpercStabD + " %");
        } else {
            logInfo("No packet Frame Set D lost during stabilized state");
        }
    }


    if (nbOfRcvd1 == 0) {
        verdict = false;
        logError("FAILED : No packets from Frame Set A received");
    }
    if ((nbOfRcvd1 / nbOfPacketSentA) > lossThresholdRatio) {
        verdict = false;
        logError("FAILED: Not enough packets from Frame Set A discarded");
    }
    if (nbOfRcvd3 == 0) {
        verdict = false;
        logError("FAILED : Any packets from Frame Set C received");
    }
    if ((nbOfRcvd3 / nbOfPacketSentC) > lossThresholdRatio) {
        verdict = false;
        logError("FAILED: Not enough packets from Frame Set C discarded");
    }

    /// Check verdict for all streams
    TrafficGenerator.Disconnect();

    /// Check verdict
    if (verdict == false)
        testFailed("Failed on Drop precedence");
    else
        testPassedWithTraffic();
}

testPassed();
