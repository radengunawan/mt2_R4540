////////////////////////////////////////////////////////////
/// CaptureRawTillPLOAMEvent.js                          ///
///   Functions to launch Raw Capture and stop on PLOAM  ///
///   event                                              ///
///                                                      ///
/// Copyright (c) 2021, MT2 SAS                          ///
/// All rights reserved.                                 ///
///                                                      ///
/// This script is provided by MT2 and is intended to be ///
/// used with the MT2 products.                          ///
///                                                      ///
/// For support contact: tech-support@mt2.fr             ///
///                                                      ///
////////////////////////////////////////////////////////////

include('Config.js');

function CaptureRawTillPLOAMEvent(eventString, onuId, timeOut, postEventDelay, outputFile) {
    var rawCapture = getRawCapture();

    rawCapture.pause();
    sleep(200);
    rawCapture.clear();
    sleep(200);

    ///Empty event queue
    resp = PLOAMMapper.waitFor(eventString, onuId, 0, 1);
    while (resp != undefined) {
        resp = PLOAMMapper.waitFor(eventString, onuId, 0, 1);
    }

    rawCapture.play();

    logInfo("Start wait");
    var resp = PLOAMMapper.waitFor(eventString, onuId, timeOut, 1);

    if (resp != undefined) {
        logInfo("Caught " + eventString + " event, keep capturing for " + postEventDelay + " msecs");
        sleep(postEventDelay);
        rawCapture.pause();
        sleep(500);
        if (undefined != outputFile)
            rawCapture.saveAs(outputFile);
        return true;
    }

    rawCapture.pause();
    logInfo("End wait: no catch");

    return false;
}

addHelpInfo("CaptureRawTillPLOAMEvent", "capture raw till a PLOAM event is caught", ["eventString", "onuId", "timeOut", "postEventDelay", "[optional]outputFile"], ["event name", "ONU ID", "time out for the wait (msec)", "duration to capture after the event is caught", "optional file to save the rawCapture"], "true if the event is captured");
