const mysql = require('sync-mysql');
const logger = require("./logger");
const log = logger("SQL Connector");

function connect() {
    
    var conn = new mysql({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE
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