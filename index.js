const logger = require("./logger.js");
const server = require('./server.js')

const log = logger("Main");


function entryPoint() {
    server.start(8200);    
}

entryPoint();
