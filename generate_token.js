const logger = require("./logger");
const envfile = require("envfile");
const fs = require('fs');

const CHAR_LIST = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TOKEN_LENGTH = 64;

logger.setLoggerName("Token Generator");

function gen() {
    var ret = "";
    for(var i = 0; i < TOKEN_LENGTH; i++)
        ret += CHAR_LIST.at(Math.random() * (CHAR_LIST.length-1));
    
    return ret;
}

function genereteAndSavceNewToken() {
    let parsedFile = envfile.parse("./.env");
    parsedFile.ACCESS_TOKEN_SECRET = gen();
    logger.print("Acess token successfully generated !");
    parsedFile.REFRESH_TOKEN_SECRET = gen();
    logger.print("Refresh token successfully generated !");

    fs.writeFileSync('./.env', envfile.stringify(parsedFile));
    logger.print("Tokens saved !");
}

genereteAndSavceNewToken();

logger.restorLoggerName();