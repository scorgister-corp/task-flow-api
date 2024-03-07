var loggerName = "";
var nameHistory = [];

function print(...data) {
    var str = "[" + loggerName + "] ";
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
module.exports.setLoggerName = setLoggerName;
module.exports.restorLoggerName = restorLoggerName;
