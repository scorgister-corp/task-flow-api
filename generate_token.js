const logger = require("./logger");
const env = require("./env");
const fs = require('fs');

const log = logger("Token Generator");

const CHAR_LIST = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TOKEN_LENGTH = 64;

function gen() {
    var ret = "";
    for(var i = 0; i < TOKEN_LENGTH; i++)
        ret += CHAR_LIST.at(Math.random() * (CHAR_LIST.length-1));
    
    return ret;
}

function genereteAndSavceNewToken() {
    let parsedFile = env.loadFile("./.env");

    parsedFile["ACCESS_TOKEN_SECRET"] = gen();
    log.print("Acess token successfully generated !");

    parsedFile["REFRESH_TOKEN_SECRET"] = gen();
    log.print("Refresh token successfully generated !");


    env.saveFile(parsedFile, "./.env");
    log.print("Tokens saved !");
}

genereteAndSavceNewToken();
