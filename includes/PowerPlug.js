var HttpPowerPlug = {
    PowerOff: function(address, index) {
        var soc = new Socket();
        logInfo("Power Off Plug No " + index);
        soc.connectToHost(address, 80, 1000);
        soc.write("GET /hidden.htm?M0:O" + index + "=OFF HTTP/1.1\r\n");
        soc.write("Host: " + address + "\r\n");
        soc.write("User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0\r\n");
        soc.write("Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n");
        soc.write("Accept-Language: fr,fr-fr;q=0.8,en-us;q=0.5,en;q=0.3\r\n");
        soc.write("Accept-Encoding: gzip, deflate\r\n");
        soc.write("Connection: keep-alive\r\n");
        soc.write("\r\n\r\n");
        soc.disconnect();
    },

    PowerOn: function(address, index) {
        var soc = new Socket();
        logInfo("Power On Plug No " + index);
        soc.connectToHost(address, 80, 1000);
        soc.write("GET /hidden.htm?M0:O" + index + "=ON HTTP/1.1\r\n");
        soc.write("Host: " + address + "\r\n");
        soc.write("User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64; rv:28.0) Gecko/20100101 Firefox/28.0\r\n");
        soc.write("Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n");
        soc.write("Accept-Language: fr,fr-fr;q=0.8,en-us;q=0.5,en;q=0.3\r\n");
        soc.write("Accept-Encoding: gzip, deflate\r\n");
        soc.write("Connection: keep-alive\r\n");
        soc.write("\r\n");
        soc.disconnect();
    },
};

var EatonSshPowerPlug = {
    LOGIN : 'admin',
    PASSWORD : 'admin',
    SSH_PORT : 22,

    PowerOff: function(address, index) {
        var sshEaton = new SshClient();
        logInfo("Power OFF EATON (ssh " + address + ") plug No " + index);
        sshEaton.connect(address, this.SSH_PORT, this.LOGIN, this.PASSWORD, "");
        sshEaton.write("set PDU.OutletSystem.Outlet[" + index + "].DelayBeforeShutdown 0\r");
        sshEaton.disconnect();
    },

    PowerOn: function(address, index) {
        var sshEaton = new SshClient();
        logInfo("Power ON EATON (ssh " + address + ") plug No " + index);
        sshEaton.connect(address, this.SSH_PORT, this.LOGIN, this.PASSWORD, "");
        sshEaton.write("set PDU.OutletSystem.Outlet[" + index + "].DelayBeforeStartup 0\r");
        sshEaton.disconnect();
    },

};

var EatonTelnetPowerPlug = {
    LOGIN : 'admin',
    PASSWORD : 'admin',
    TELENET_PORT : 23,

    PowerOff: function(address, index) {
        var telenetEaton = new Socket();
        logInfo("Power OFF EATON (telnet " + address + ") plug No " + index);
        telenetEaton.connectToHost(address, 23);
        sleep(500);
        telenetEaton.write("admin\r");
        sleep(10);
        telenetEaton.write("admin\r");
        sleep(10);
        telenetEaton.write("set PDU.OutletSystem.Outlet[" + index + "].DelayBeforeShutdown 0\r");
        sleep(10);
        telenetEaton.disconnect();
        sleep(1000);
    },

    PowerOn: function(address, index) {
        var telenetEaton = new Socket();
        logInfo("Power ON EATON (telnet " + address + ") plug No " + index);
        telenetEaton.connectToHost(address, 23);
        sleep(500);
        telenetEaton.write("admin\r");
        sleep(10);
        telenetEaton.write("admin\r");
        sleep(10);
        telenetEaton.write("set PDU.OutletSystem.Outlet[" + index + "].DelayBeforeStartup 0\r");
        sleep(10);
        telenetEaton.disconnect();
        sleep(1000);
    },

};

var SerialPowerPlug = {
    PowerOff: function(address, speed, index) {
        var com = new SerialPort();
        logInfo("Power Off Plug No " + index);
        /// Open the serial port 
        com.open(address, speed);
        /// Wait for serial port establishment
        sleep(1000);
        /// Clear plug receive buffer
        com.write("\r\n");
        com.write("/P0" + index + "=0\r\n");
        com.close();
    },

    PowerOn: function(address, speed, index) {
        /// Reboot via Serial Port
        var com = new SerialPort();
        logInfo("Power On Plug No " + index);
        /// Open the serial port 
        com.open(address, speed);
        /// Wait for serial port establishment
        sleep(1000);
        /// Clear plug receive buffer
        com.write("\r\n");
        com.write("/P0" + index + "=1\r\n");
        com.close();
    },

};

var IpPowerPlug = {
    HTTP_POWER_PLUG_INDEX           : 1,
    EATON_SSH_POWER_PLUG_INDEX      : 2,
    EATON_TELNET_POWER_PLUG_INDEX   : 3,
    
    PowerOff: function(jsPowerPlugTypeIndex, address, plugIndex) {
        // logInfo("IP Powering OFF (" + address + ") plug No " + plugIndex);
        jsPowerPlugTypeAsInt = parseInt(jsPowerPlugTypeIndex);
        if(jsPowerPlugTypeAsInt === this.HTTP_POWER_PLUG_INDEX) {
            HttpPowerPlug.PowerOff(address, plugIndex);
        }
        else if(jsPowerPlugTypeAsInt === this.EATON_SSH_POWER_PLUG_INDEX) {
            EatonSshPowerPlug.PowerOff(address, plugIndex);
        }
        else if(jsPowerPlugTypeAsInt === this.EATON_TELNET_POWER_PLUG_INDEX) {
            EatonTelnetPowerPlug.PowerOff(address, plugIndex);
        }
        else{
            logError("invalid ip plug type index" + jsPowerPlugTypeIndex);
        }
    },

    PowerOn: function(jsPowerPlugTypeIndex, address, plugIndex) {
        // logInfo("IP Powering ON (" + address + ") plug No " + plugIndex);
        jsPowerPlugTypeAsInt = parseInt(jsPowerPlugTypeIndex);
        if(jsPowerPlugTypeAsInt === this.HTTP_POWER_PLUG_INDEX) {
            HttpPowerPlug.PowerOn(address, plugIndex);
        }
        else if(jsPowerPlugTypeAsInt === this.EATON_SSH_POWER_PLUG_INDEX) {
            EatonSshPowerPlug.PowerOn(address, plugIndex);
        }
        else if(jsPowerPlugTypeAsInt === this.EATON_TELNET_POWER_PLUG_INDEX) {
            EatonTelnetPowerPlug.PowerOn(address, plugIndex);
        }
        else{
            logError("invalid ip plug type index" + jsPowerPlugTypeIndex);
        }
    },

};



function PowerPlug(protocol, address, plugsNumber, speed) {
    this.protocol = protocol; /// out of "http", "eaton_telnet", "eaton_ssh" and "serial"
    this.address = address;
    this.speed = speed;
    this.plugsNumber = parseInt(plugsNumber);
    if (this.plugsNumber <= 0) this.plugsNumber = 4; /// default
}

PowerPlug.prototype.PowerOff = function(plugIndex) {
    logInfo("Power off plug " + plugIndex);
    if(this.protocol === "serial") {
        SerialPowerPlug.PowerOff(this.address, this.speed, plugIndex);
    }
    else if(this.protocol === "http") {
        HttpPowerPlug.PowerOff(this.address, plugIndex);
    }
    else if(this.protocol === "eaton_ssh") {
        EatonSshPowerPlug.PowerOff(this.address, plugIndex);
    }
    else if(this.protocol === "eaton_telnet") {
        EatonTelnetPowerPlug.PowerOff(this.address, plugIndex);
    }
    else {
        logError("invalid plug protocol" + this.protocol);
    }
}

PowerPlug.prototype.PowerOn = function(plugIndex) {
    logInfo("Power on plug " + plugIndex);
    if(this.protocol === "serial") {
        SerialPowerPlug.PowerOn(this.address, speed, plugIndex);
    }
    else if(this.protocol === "http") {
        HttpPowerPlug.PowerOn(this.address, plugIndex);
    }
    else if(this.protocol === "eaton_ssh") {
        EatonSshPowerPlug.PowerOn(this.address, plugIndex);
    }
    else if(this.protocol === "eaton_telnet") {
        EatonTelnetPowerPlug.PowerOn(this.address, plugIndex);
    }
    else {
        logError("invalid plug protocol " + this.protocol);
    }
}

addHelpInfo("PowerPlug", "PowerPlug(protocol, address, plugsNumber, speed): creates a new PowerPlug object");
addHelpInfo("PowerPlug.PowerOn", "PowerOn(plugIndex): powers on a plug");
addHelpInfo("PowerPlug.PowerOff", "PowerOff(plugIndex): powers off a plug");