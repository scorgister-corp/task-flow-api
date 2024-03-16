const mysql = require('sync-mysql');
const env = require('./env')
const logger = require("./logger");
const log = logger("SQL Connector");

function connect() {
    var parsedFile = env.loadFile("./.env")

    var conn = new mysql({
        host: parsedFile["SQL_HOST"],
        user: parsedFile["SQL_USER"],
        password: parsedFile["SQL_PASSWORD"],
        database: parsedFile["SQL_DATABASE"]
    });
    
    log.print("Connection to database established");
    
    return conn;
}

function query(sql) {
    if(databaseConn == undefined)
        return;
    
    return databaseConn.query(sql);
}

var databaseConn = connect();

module.exports.query = query;