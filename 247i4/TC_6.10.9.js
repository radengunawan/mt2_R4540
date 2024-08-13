include('Config.js');
var verdict = true;

var ScriptParameters = LoadValue('ScriptParameters', undefined);

logInfo("###############################");
try {
    Evaluate('TC_6.10.9-unit.js', { alignTransitionOnWindows: true, ScriptParameters: ScriptParameters });
} catch (e) {
    logError("Software Download failed with aligned transition");
    verdict = false;
}

logInfo("###############################");
try {
    Evaluate('TC_6.10.9-unit.js', { alignTransitionOnWindows: false, ScriptParameters: ScriptParameters });
} catch (e) {
    logError("Software Download failed with non-aligned transition");
    verdict = false;
}

if (!verdict)
    testFailed("Software download has failed");

testPassed();