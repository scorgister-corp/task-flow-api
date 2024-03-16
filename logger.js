const STATUS = {
    oK: "+",
    ERROR: "-"
}

class Logger {
    
    constructor(loggerName) {
        this.setLoggerName(loggerName);
    }

    print(data) {
        this.#print_(data);
    }
    
    printError(data) {
        this.#print_(data, STATUS.ERROR);
    }

    #print_(data, status = STATUS.oK) {
        var str = "[" + status + "][" + this.getLoggerName() + "] ";
        
        console.log(str, data);
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
