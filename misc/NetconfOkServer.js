include("Config.js");

function handleConnection(conn) {
    var message = conn.read(); ///non-blocking
    if (message != undefined) {
        logInfo("---------------------");
        logInfo("---------------------");
        logInfo("received new message:");
        logInfo("--------XML----------");
        logInfo(message.XML);
        logInfo("--------JSONML-------");
        logInfo(JSON.stringify(message.JSONML));
        logInfo("---------------------");
        if (message.JSONML[0] == "rpc") {
            logInfo("answering with ok");
            var replyObject = message.JSONML;
            replyObject[0] = "rpc-reply";
            replyObject[2] = ["ok"];
            conn.sendJSONML(replyObject);
        }
    }
}

var server = new NetconfServer( /*1, undefined, ['capabilities', ['capability', "urn:ietf:params:netconf:base:1.0"], ['capability', "urn:ietf:params:netconf:base:1.1"]]*/ );

var defaultRSAPath = "/home/login/.ssh/id_rsa"
var defaultPubKeys = []
var defaultUsers = [
    ["login", "password"]
];

if (global['RSAPath'] === undefined)
    RSAPath = defaultRSAPath;

if (global['pubKeys'] === undefined)
    pubKeys = defaultPubKeys;

if (global['users'] === undefined)
    users = defaultUsers;

testPassed("Starting Netconf Server");
server.start("0.0.0.0", 830, RSAPath, defaultPubKeys, users);

var conn = undefined;

testPassed("Waiting for connection");
while (conn === undefined) {
    conn = server.accept(); ///non-blocking
    sleep(100);
}

logInfo("Connection has been accepted");

sleep(1000);

testPassed("Looping waiting for message");

while (conn.connected()) {
    handleConnection(conn);
    sleep(100);
}

handleConnection(conn);

conn.stop();
server.stop();

testPassed();
