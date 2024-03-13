var loggerName = "";
var nameHistory = [];

const STATUS = {
    OK: "+",
    ERROR: "-"
}

function print(...data) {
    print_(data);
}

function printOk(...data) {
    print_(data, STATUS.OK);
}

function printError(...data) {
    print_(data, STATUS.ERROR);
}

function print_(data, status = STATUS.OK) {
    var str = "[" + status + "][" + loggerName + "] ";
    for(var i = 0; i < data.length - 1; i++)
        str += data[i] + " ";
    if(data.length > 0)
        str += data[data.length-1];

    console.log(str);
}

function setLoggerName(name) {
    if(name in [undefined, null])
        return;

    nameHistory.push(loggerName);
    loggerName = name;
}

function restorLoggerName() {
    if(nameHistory.length == 0) {
        loggerName = "";
        return;
    }
    
    loggerName = nameHistory[nameHistory.length-1];
    nameHistory.splice(0, -1);
}

module.exports.print = print;
module.exports.printOk = printOk;
module.exports.printError = printError;
module.exports.setLoggerName = setLoggerName;
module.exports.restorLoggerName = restorLoggerName;
