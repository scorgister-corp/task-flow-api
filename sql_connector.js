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
    
    try {
        conn.query(`SELECT verify FROM verify_connection`);
    } catch (error) {
        log.printError("Connection to database failed")
        return false;
    }

    log.print("Connection to database established");
    
    return conn;
}

function query(sql) {
    if(!databaseConn)
        return;
    
    try {
        return databaseConn.query(sql);
    }
    catch(err) {
        log.printError(err)
        return false
    }
}

var databaseConn = connect();

module.exports.query = query;
