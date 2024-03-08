const logger = require("./logger.js");

function entryPoint() {
    logger.setLoggerName("TaskFlow");
    
    logger.print("Hello World!");
}

entryPoint();
