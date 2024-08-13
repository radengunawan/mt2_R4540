include("Config.js");

//Test case 6.2.16 Indicating drop precedence using DEI downstream
var maxPackets = 98304;
var portSpeedMbps = 100;
var lossThresholdRatio = 0.5; // 50%
var numPacketsInStablePeriod = 73728;

/// Initialize Variables
var SVID1 = RandomInteger(1, 4094); /// SVID1 randomly chosen in range [1..4094]
var ONUID = 1;
var OMCC = ONUID;
var GEM1 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM1 randomly chosen in range [256..4094]
var GEM2 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM2 randomly chosen in range [256..4094]
var GEM3 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM3 randomly chosen in range [256..4094]
var GEM4 = PLOAMMapper.GetUnusedDataGEMPort(); /// GEM4 randomly chosen in range [256..4094]
var AllocId1 = GEM1;
var AllocId2 = GEM2;
var AllocId3 = GEM3;
var AllocId4 = GEM4;
var SPbits1 = RandomInteger(0, 7);
var SPbits2 = RandomIntegerExcept(0, 7, [SPbits1]);
var SPbits3 = RandomIntegerExcept(0, 7, [SPbits1, SPbits2]);
var SPbits4 = RandomIntegerExcept(0, 7, [SPbits1, SPbits2, SPbits3]);

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
var TCONT3 = OMCI.GetTCONT(OMCC, 2);
var TCONT4 = OMCI.GetTCONT(OMCC, 3);
var UpPQ1 = OMCI.GetUpPQ(OMCC, TCONT1);
var UpPQ2 = OMCI.GetUpPQ(OMCC, TCONT2);
var UpPQ3 = OMCI.GetUpPQ(OMCC, TCONT3);
var UpPQ4 = OMCI.GetUpPQ(OMCC, TCONT4);
var DnUni1PQ1 = OMCI.GetDwPQ(OMCC, 0);
var DnUni1PQ2 = OMCI.GetDwPQ(OMCC, 1);
var DnUni1PQ3 = OMCI.GetDwPQ(OMCC, 2);
var DnUni1PQ4 = OMCI.GetDwPQ(OMCC, 3);
var OMCITP1 = OMCI.GetTerminationPoint(OMCC, 0);

/// Send PLOAM Assign Alloc ID
PLOAMMapper.AssignAllocId(ONUID, AllocId1);
PLOAMMapper.AssignAllocId(ONUID, AllocId2);
PLOAMMapper.AssignAllocId(ONUID, AllocId3);
PLOAMMapper.AssignAllocId(ONUID, AllocId4);
/// Associate the T-CONT with the Alloc Id
OMCI.Set(OMCC, "T_CONT", TCONT1, { AllocId: AllocId1 });
OMCI.Set(OMCC, "T_CONT", TCONT2, { AllocId: AllocId2 });
OMCI.Set(OMCC, "T_CONT", TCONT3, { AllocId: AllocId3 });
OMCI.Set(OMCC, "T_CONT", TCONT4, { AllocId: AllocId4 });
/// Create BWMap entry for the ONU
bwmapAddEntry(ONUID, AllocId1, 10);
bwmapAddEntry(ONUID, AllocId2, 10);
bwmapAddEntry(ONUID, AllocId3, 10);
bwmapAddEntry(ONUID, AllocId4, 10);

//create GEM port GEM1 through GEM4
var CTP1 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM1, TCONTPointer: TCONT1, TMPointerUp: UpPQ1, PQPointerDown: DnUni1PQ1 });
var CTP2 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM2, TCONTPointer: TCONT2, TMPointerUp: UpPQ2, PQPointerDown: DnUni1PQ2 });
var CTP3 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM3, TCONTPointer: TCONT3, TMPointerUp: UpPQ3, PQPointerDown: DnUni1PQ3 });
var CTP4 = OMCI.Create(OMCC, "GEM_Port_Network_CTP", { PortId: GEM4, TCONTPointer: TCONT4, TMPointerUp: UpPQ4, PQPointerDown: DnUni1PQ4 });

//MaxQSize is the maximum queue size, i.e. any packet arriving after the queue reaches this size will be dropped
//MaxQSizeDiv2 is equal to MaxQSize divided by 2
var MaxDnUni1PQ1Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ1, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ1, { DropPrecColourMark: 2, PacketDropQThresh: { GreenMin: MaxDnUni1PQ1Size, GreenMax: MaxDnUni1PQ1Size, YellowMin: (MaxDnUni1PQ1Size >> 1), YellowMax: (MaxDnUni1PQ1Size >> 1) } });
var MaxDnUni1PQ2Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ2, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ2, { DropPrecColourMark: 2, PacketDropQThresh: { GreenMin: MaxDnUni1PQ2Size, GreenMax: MaxDnUni1PQ2Size, YellowMin: (MaxDnUni1PQ2Size >> 1), YellowMax: (MaxDnUni1PQ2Size >> 1) } });
var MaxDnUni1PQ3Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ3, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ3, { DropPrecColourMark: 2, PacketDropQThresh: { GreenMin: MaxDnUni1PQ3Size, GreenMax: MaxDnUni1PQ3Size, YellowMin: (MaxDnUni1PQ3Size >> 1), YellowMax: (MaxDnUni1PQ3Size >> 1) } });
var MaxDnUni1PQ4Size = OMCI.Get(OMCC, "Priority_Queue", DnUni1PQ4, { MaxQSize: 0 }).MaxQSize;
OMCI.Set(OMCC, "Priority_Queue", DnUni1PQ4, { DropPrecColourMark: 2, PacketDropQThresh: { GreenMin: MaxDnUni1PQ4Size, GreenMax: MaxDnUni1PQ4Size, YellowMin: (MaxDnUni1PQ4Size >> 1), YellowMax: (MaxDnUni1PQ4Size >> 1) } });


var GAL = OMCI.Create(OMCC, "GAL_Ethernet_Profile", { MaxGEMPayloadSize: 4095 });
var BSP = OMCI.Create(OMCC, "MAC_Bridge_Service_Profile");
var PMAP1 = OMCI.Create(OMCC, "Pbit_Mapper_Service_Profile");

//1 ANI side ports, 1 per VID
var BPCD1 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 1, TPtype: 3, TPPointer: PMAP1 });
OMCI.Create(OMCC, "VLAN_Tagging_Filter_Data", { meid: BPCD1, VLANFilterList: [SVID1], ForwardOpr: 16, NumberOfEntries: 1 });

//IWTPs for each GEM port
var IWTP1 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP1, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP2 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP2, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP3 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP3, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });
var IWTP4 = OMCI.Create(OMCC, "GEM_Interworking_Termination_Point", { GEMPortNetworkCTPPointer: CTP4, ServiceProfilePointer: PMAP1, GALProfilePointer: GAL });

//Since VID-mapping, make both p-bits point to same IWTP. All other pbit values get discarded due to null pointers in pbit mapper
OMCI.Set(OMCC, "Pbit_Mapper_Service_Profile", PMAP1, OMCI.BuildPMapper([
            [SPbits1, IWTP1],
            [SPbits2, IWTP2],
            [SPbits3, IWTP3],
            [SPbits4, IWTP4]
]));

//UNI side port
var BPCD3 = OMCI.Create(OMCC, "MAC_Bridge_Port_Configuration_Data", { BridgeIDPointer: BSP, PortNum: 3, TPtype: OMCI.GetTPType(OMCC), TPPointer: OMCITP1 });
var EVTOCD1 = OMCI.Create(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", { "AssociationType": OMCI.GetTPAssociationType(OMCC), "AssocMEPointer": OMCITP1 });
OMCI.Set(OMCC, "Ext_VLAN_Tagging_Opr_Config_Data", EVTOCD1, { InputTPID: 0x8100, OutputTPID: 0x88a8, "DownstreamMode": 0 });

// Unlock the UNI so that it will produce alarms
OMCI.Set(OMCC, OMCI.GetTerminationPointEntity(OMCC), OMCITP1, { AdminState: 0 });

/// All frame recevied from Ethernet with Pbit1 has to be sent on GEM1 GEM Port
addTranslationEthToGpon(0xffff, SPbits1, GEM1);
/// All frame recevied from Ethernet with Pbit2 has to be sent on GEM2 GEM Port
addTranslationEthToGpon(0xffff, SPbits2, GEM2);
/// All frame recevied from Ethernet with Pbit3 has to be sent on GEM3 GEM Port
addTranslationEthToGpon(0xffff, SPbits3, GEM3);
/// All frame recevied from Ethernet with Pbit4 has to be sent on GEM4 GEM Port
addTranslationEthToGpon(0xffff, SPbits4, GEM4);

logInfo("Random values: SVID1=" + SVID1 + " ; SPbits1=" + SPbits1 + " ; SPbits2=" + SPbits2 + " ; SPbits3=" + SPbits3 + " ; SPbits4=" + SPbits4);
logInfo("Random value: GEM1=" + GEM1);
logInfo("Random value: GEM2=" + GEM2);
logInfo("Random value: GEM3=" + GEM3);
logInfo("Random value: GEM4=" + GEM4);

if (TrafficGenerator.activateAutomatisation) {
    var Tolerance = Tol_6_2_16;
    var LatencyTime = 2;
    testPassed("Starting traffics");
    var verdict = true;
    /// Connect to the TrafficGenerator

    if (TrafficGenerator.driver == "STC")
        popup("Action", "Please configure the ONU LAN interface speed to 100M, then click OK.");

    TrafficGenerator.Connect();

    var MAC1 = 0x202233445501;
    var MAC2 = 0x102233445502;

    /// Create the TrafficGenerator config file from the TrafficGenerator template config file and start generation
    /// Replace CVID1 by the value formatted on 3 hex digit
    /// Create the TrafficGenerator config file from the TrafficGenerator template config file
    var struct = TrafficGenerator.SendTemplateConfig("6.2.16", [
                ["<SVID1>", SVID1, 3],
                ["<SPbits1>", SPbits1 << 1, 1],
                ["<SPbits2>", SPbits2 << 1, 1],
                ["<SPbits3>", SPbits3 << 1, 1],
                ["<SPbits4>", SPbits4 << 1, 1],
                ["<SPbits1DEI>", (SPbits1 << 1) | 0x01, 1],
                ["<SPbits2DEI>", (SPbits2 << 1) | 0x01, 1],
                ["<SPbits3DEI>", (SPbits3 << 1) | 0x01, 1],
                ["<SPbits4DEI>", (SPbits4 << 1) | 0x01, 1],
                ["<MAC1>", MAC1, 0xC],
                ["<MAC2>", MAC2, 0xC]
            ]);
    sleep(TrafficGenerator.delayBeforeTraffic);

    TrafficGenerator.SetPortSpeed(1, portSpeedMbps);

    /// Force rate to R = 0.7E
    RateTot = 100; // 100Mbit/s
    var Rate = Math.round(RateTot * 0.7 * 1000000);
    logInfo("Rate : " + Rate + " bits/s");
    var PacketSize = 1280 * 8;
    logInfo("Packet size: " + PacketSize + "bits");
    var WaitTime = Math.round(maxPackets / (Rate / PacketSize) + LatencyTime);
    logInfo("Traffic phase duration : " + WaitTime + " secs");

    TrafficGenerator.SetBitRateForStream(0, 0, Rate);
    TrafficGenerator.SetBitRateForStream(0, 1, Rate);
    TrafficGenerator.SetBitRateForStream(0, 2, Rate);
    TrafficGenerator.SetBitRateForStream(0, 3, Rate);
    TrafficGenerator.SetBitRateForStream(0, 4, Rate);
    TrafficGenerator.SetBitRateForStream(0, 5, Rate);
    TrafficGenerator.SetBitRateForStream(0, 6, Rate);
    TrafficGenerator.SetBitRateForStream(0, 7, Rate);

    logInfo("Starting A and B streams");
    /// Enable all streams
    TrafficGenerator.EnableStreamOnPort(0, 0);
    TrafficGenerator.EnableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(4, 0);
    TrafficGenerator.DisableStreamOnPort(5, 0);
    TrafficGenerator.DisableStreamOnPort(6, 0);
    TrafficGenerator.DisableStreamOnPort(7, 0);

    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    /// Wait for sending and receiving
    testPassed("Run traffic for (stream A & B) " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0);

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
    /// Enable all streams
    TrafficGenerator.DisableStreamOnPort(0, 0);
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.EnableStreamOnPort(2, 0);
    TrafficGenerator.EnableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(4, 0);
    TrafficGenerator.DisableStreamOnPort(5, 0);
    TrafficGenerator.DisableStreamOnPort(6, 0);
    TrafficGenerator.DisableStreamOnPort(7, 0);

    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    ///Wait for sending and receiving
    testPassed("Run traffic (C & D stream) for " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0);

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

    logInfo("Starting E and F streams");
    /// Enable all streams
    TrafficGenerator.DisableStreamOnPort(0, 0);
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.EnableStreamOnPort(4, 0);
    TrafficGenerator.EnableStreamOnPort(5, 0);
    TrafficGenerator.DisableStreamOnPort(6, 0);
    TrafficGenerator.DisableStreamOnPort(7, 0);

    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    testPassed("Run traffic (stream E & F) for " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0);
    ///Wait for sending and receiving
    sleep(WaitTime * 1000);

    logInfo("Stopping E and F streams");
    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    /// Get transmit statistics
    var nbOfPacketSentE = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 4);
    var nbOfPacketSentF = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 5);
    /// Get statistics for each received stream
    var nbOfRcvdStabF = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 2);
    logInfo(" RcvdStabF: " + nbOfRcvdStabF);
    var nbOfRcvd5 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 5);
    var nbOfRcvd6 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 6);

    logInfo("Starting G and H streams");
    /// Enable all streams
    TrafficGenerator.DisableStreamOnPort(0, 0);
    TrafficGenerator.DisableStreamOnPort(1, 0);
    TrafficGenerator.DisableStreamOnPort(2, 0);
    TrafficGenerator.DisableStreamOnPort(3, 0);
    TrafficGenerator.DisableStreamOnPort(4, 0);
    TrafficGenerator.DisableStreamOnPort(5, 0);
    TrafficGenerator.EnableStreamOnPort(6, 0);
    TrafficGenerator.EnableStreamOnPort(7, 0);

    /// Clear all stats
    TrafficGenerator.ClearTransmitStatsOnPort(0);
    TrafficGenerator.ClearTransmitStatsOnPort(1);
    TrafficGenerator.ClearReceiveStatsOnPort(0);
    TrafficGenerator.ClearReceiveStatsOnPort(1);

    sleep(TrafficGenerator.delayBeforeSend);

    testPassed("Run traffic for " + WaitTime + " secs");

    TrafficGenerator.StartTrafficOnPort(0);
    ///Wait for sending and receiving
    sleep(WaitTime * 1000);

    logInfo("Stopping G and H streams");
    TrafficGenerator.StopTrafficOnPort(0);

    sleep(TrafficGenerator.delayAfterSend);

    /// Get transmit statistics
    var nbOfPacketSentG = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 6);
    var nbOfPacketSentH = TrafficGenerator.GetTransmitStatsOnPortAndStream(0, 7);
    /// Get statistics for each received stream;
    var nbOfRcvdStabH = TrafficGenerator.GetReceivedStatsOnPortAndFilter(1, 3);
    logInfo(" RcvdStabH: " + nbOfRcvdStabH);
    var nbOfRcvd7 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 7);
    var nbOfRcvd8 = TrafficGenerator.GetReceivedStatsOnPortAndTID(1, 8);

    /// Check for the verdict concerning stream A,B,C and D
    logInfo("#########_______A*____|_____B____|||____C*____|____D______Source");
    logInfo("SENT TOT_____: ___" + nbOfPacketSentA + "___|__ " + nbOfPacketSentB + " __|||__ " + nbOfPacketSentC + " __|__ " + nbOfPacketSentD);
    logInfo("RECEIVED TOT_: ___" + nbOfRcvd1 + "___|__ " + nbOfRcvd2 + " __|||__ " + nbOfRcvd3 + " __|__ " + nbOfRcvd4 + "_____TID");
    logInfo("RCVD TOT %__: ___" + ((nbOfRcvd1 / nbOfPacketSentA) * 100).toFixed(2) + "% _|__ " + ((nbOfRcvd2 / nbOfPacketSentB) * 100).toFixed(2) + "% |||_ " + ((nbOfRcvd3 / nbOfPacketSentC) * 100).toFixed(2) + "% _|__ " + ((nbOfRcvd4 / nbOfPacketSentD) * 100).toFixed(2) + "% __ Filter");

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

    ///Check loss from low priority frames are (should be more than 30 %)
    var pcOfReceivedA = (nbOfRcvd1 / nbOfPacketSentA);
    var pcOfReceivedC = (nbOfRcvd3 / nbOfPacketSentC);

    if (nbOfRcvd1 == 0) {
        verdict = false;
        logError("FAILED : Any packets from Frame Set A received");
    } else if (pcOfReceivedA > lossThresholdRatio) {
        verdict = false;
        logError("FAILED : Not enough packets from Frame Set A are discarded");
    } else if (nbOfRcvd3 == 0) {
        verdict = false;
        logError("FAILED : Any packets from Frame Set C received");
    } else if (pcOfReceivedC > lossThresholdRatio) {
        verdict = false;
        logError("FAILED : Not enough packets from Frame Set C are discarded");
    } else {
        logInfo("PASSED: Some packets from Frame Set A and C received ");
    }

    /// Check for the verdict concerning stream E,F,G and H
    logInfo("#########_______E*____|_____F____|||____G*____|____H______Source");
    logInfo("SENT TOT_____: ___" + nbOfPacketSentE + "___|__ " + nbOfPacketSentF + " __|||__ " + nbOfPacketSentG + " __|__ " + nbOfPacketSentH);
    logInfo("RECEIVED TOT_: ___" + nbOfRcvd5 + "___|__ " + nbOfRcvd6 + " __|||__ " + nbOfRcvd7 + " __|__ " + nbOfRcvd8 + "_____TID");
    logInfo("RCVD TOT %__: ___" + ((nbOfRcvd5 / nbOfPacketSentE) * 100).toFixed(2) + "% _|__ " + ((nbOfRcvd6 / nbOfPacketSentF) * 100).toFixed(2) + "% |||_ " + ((nbOfRcvd7 / nbOfPacketSentG) * 100).toFixed(2) + "% __|__ " + ((nbOfRcvd8 / nbOfPacketSentH) * 100).toFixed(2) + "% __ Filter");

    /// Check for the verdic
    if (nbOfRcvd6 >= nbOfPacketSentF - Tolerance) {
        logInfo("PASSED : All the packets from Frame Set F correctly received with tolerance: " + Tolerance + " frame(s)");
    } else {
        verdict = false;
        var nbframeslostF = nbOfPacketSentF - nbOfRcvd6;
        var lostpercF = ((nbframeslostF / nbOfPacketSentF) * 100).toFixed(2);
        logError("FAILED : " + nbframeslostF + " packets from Frame Set F lost (Tolerance is " + Tolerance + " ) : " + lostpercF + " %");
        if (nbOfRcvdStabF < numPacketsInStablePeriod - Tolerance) {
            verdict = false;
            var nbframeslostStabF = numPacketsInStablePeriod - nbOfRcvdStabF;
            var lostpercStabF = ((nbframeslostStabF / numPacketsInStablePeriod) * 100).toFixed(2);
            logError(nbframeslostStabF + " packets from Frame Set F lost (among " + numPacketsInStablePeriod + ") during stabilized state:" + lostpercStabF + " %");
        } else {
            logInfo("No packet Frame Set F lost during stabilized state");
        }
    }

    if (nbOfRcvd8 >= nbOfPacketSentH - Tolerance) {
        logInfo("PASSED : All the packets from Frame Set H correctly received with tolerance: " + Tolerance + " frame(s)");
    } else {
        verdict = false;
        var nbframeslostH = nbOfPacketSentH - nbOfRcvd8;
        var lostpercH = ((nbframeslostH / nbOfPacketSentH) * 100).toFixed(2);
        logError("FAILED : " + nbframeslostH + " packets from Frame Set H lost (Tolerance is " + Tolerance + " ) : " + lostpercH + " %");
        if (nbOfRcvdStabH < numPacketsInStablePeriod - Tolerance) {
            verdict = false;
            var nbframeslostStabH = numPacketsInStablePeriod - nbOfRcvdStabH;
            var lostpercStabH = ((nbframeslostStabH / numPacketsInStablePeriod) * 100).toFixed(2);
            logError(nbframeslostStabH + " packets from Frame Set H lost (among " + numPacketsInStablePeriod + ") during stabilized state:" + lostpercStabH + " %");
        } else {
            logInfo("No packet Frame Set H lost during stabilized state");
        }
    }

    ///Check loss from low priority frames are (should be more than 30 %)
    var pcOfReceivedE = (nbOfRcvd5 / nbOfPacketSentE);
    var pcOfReceivedG = (nbOfRcvd7 / nbOfPacketSentG);

    if (nbOfRcvd5 == 0) {
        verdict = false;
        logError("FAILED :  Any packets from Frame Set E received");
    } else if (pcOfReceivedE > lossThresholdRatio) {
        verdict = false;
        logError("FAILED : Not enough packets from Frame Set E are discarded");
    } else if (nbOfRcvd7 == 0) {
        verdict = false;
        logError("FAILED :  Any packets from Frame Set G received");
    } else if (pcOfReceivedG > lossThresholdRatio) {
        verdict = false;
        logError("FAILED : Not enough packets from Frame Set G are discarded");
    } else {
        logInfo("PASSED:  Some packets from Frame Set E and G received ");
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
