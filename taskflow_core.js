const logger = require('./logger');
const log = logger("Core");
const sql = require('./sql_connector');
const uuid = require('uuid');

const SQL_ERR = 1
const NO_USERNAME = -1
const NO_PASSWORD = -2
const NO_EMAIL = -3
const USED_USERNAME = -4
const USED_EMAIL = -5
const MAIL_ERR = -6

var errCode = 0


function createAccount(username, password, email) {
    if (!username)
        errCode = NO_USERNAME;
    else if (!password)
        errCode =  NO_PASSWORD;
    else if (!email)
        errCode =  NO_EMAIL;
    else if (
        inc(["'", '"', "`", "{", "}", "[", "]", "(", ")", "|", " "], username)
        || inc(["'", '"', "`", "{", "}", "[", "]", "(", ")", "|", " "], email)
    )
        verrCode =  SQL_ERR;
    else if (sql.query(`SELECT COUNT(username) AS c FROM profile WHERE username = "${username}"`)[0]["c"] != 0)
        errCode =  USED_USERNAME;
    else if (sql.query(`SELECT COUNT(email) AS c FROM profile WHERE email = "${email}"`)[0]["c"] != 0)
        errCode =  USED_EMAIL;
    else if (!validateString(email, /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
        errCode =  MAIL_ERR;

    if (errCode != 0) {
        log.printError("Error " + errCode + " with account creation: " + username + ", " + email);
        
        var tempCode = errCode;
        errCode = 0;

        return tempCode;
    }

    var sqlQuery = `INSERT INTO profile (username, password, email, token) VALUES ("${username}", "${password}", "${email}", "${generateToken()}")`;
    sql.query(sqlQuery);

    log.print("Account creation success: " + username + ", " + email);

    return 0;
}

function getTasksFromToken(token) {
    var sqlQuerry = `SELECT group_id, title, deadline, priority, flag, status_id FROM task, connection WHERE task.owner_id = connection.profile_id AND connection.current_token = '${token.replace(/'/g, "''")}'`;
    return sql.query(sqlQuerry);
}

function getTokenFromAccountInfo(username, password) {
    var sqlQuerry = `SELECT token FROM profile WHERE username = "${username}" AND password = "${password}"`;
    var result = sql.query(sqlQuerry);
    if (result.length == 0) {
        return false;
    }
    return result[0]["token"];
}

function inc(arr, str) {
    for(var i = 0; i < arr.length; i++)
        if(str.includes(arr[i]))
            return true;

    return false
}

function validateString(str, re) {
    return String(str).toLowerCase().match(re);
}

function generateToken() {
    return uuid.v4();
}

module.exports.createAccount = createAccount;
module.exports.getTasksFromToken = getTasksFromToken;
module.exports.getTokenFromAccountInfo = getTokenFromAccountInfo;
module.exports.SQL_ERR = SQL_ERR;
module.exports.NO_EMAIL = NO_EMAIL;
module.exports.NO_PASSWORD = NO_PASSWORD;
module.exports.NO_USERNAME = NO_USERNAME;
module.exports.USED_EMAIL = USED_EMAIL;
module.exports.USED_USERNAME = USED_USERNAME;
module.exports.MAIL_ERR = MAIL_ERR;