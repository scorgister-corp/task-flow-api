const STATUS = {
    oK: "+",
    ERROR: "-"
}

class Logger {
    
    constructor(loggerName) {
        this.setLoggerName(loggerName);
    }

    print(...data) {
        this.#print_(data);
    }
    
    printError(...data) {
        this.#print_(data, STATUS.ERROR);
    }

    #print_(data, status = STATUS.oK) {
        var str = "[" + status + "][" + this.getLoggerName() + "] ";
        for(var i = 0; i < data.length - 1; i++)
            str += data[i] + " ";
        if(data.length > 0)
            str += data[data.length-1];
    
        console.log(str);
    }

    getLoggerName() {
        return this.loggerName;
    }

    setLoggerName(name) {
        if(name in [undefined, null])
            name = module.filename.slice(module.filename.lastIndexOf("/") + 1);
    
        this.loggerName = name;
    }

}

function createLogger(name) {
    return new Logger(name);
}

module.exports = createLogger;
