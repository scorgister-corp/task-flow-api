const logger = require('./logger');
const log = logger("Core");
const sql = require('./sql_connector');
const uuid = require('uuid');
const sha = require('js-sha256')

const NO_USERNAME = -1
const NO_PASSWORD = -2
const NO_EMAIL = -3
const USED_USERNAME = -4
const USED_EMAIL = -5
const MAIL_ERR = -6
const TOO_MANY_RESULTS_ERR = -7

var errCode = 0


function cleanString(input) {
    return String(input).toLowerCase().replace(/'/g, "''");
}

function generateToken() {
    return uuid.v4();
}

function hash(input) {
    return cleanString(sha.sha256(input));
}

function createAccount(username, password, email) {
    var cleanUsername = cleanString(username);
    var cleanPassword = cleanString(password);
    var cleanEmail = cleanString(email);
    if (!cleanUsername)
        errCode = NO_USERNAME;
    else if (!password)
        errCode =  NO_PASSWORD;
    else if (!cleanEmail)
        errCode =  NO_EMAIL;
    else if (sql.query(`SELECT COUNT(username) AS c FROM profile WHERE username = "${cleanUsername}"`)[0]["c"] != 0)
        errCode =  USED_USERNAME;
    else if (!cleanEmail.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
        errCode =  MAIL_ERR;
    else if (sql.query(`SELECT COUNT(email) AS c FROM profile WHERE email = "${cleanEmail}"`)[0]["c"] != 0)
        errCode =  USED_EMAIL;

    if (errCode != 0) {
        log.printError("Error " + errCode + " with account creation: " + cleanUsername + ", " + cleanEmail);
        
        var tempCode = errCode;
        errCode = 0;

        return tempCode;
    }

    var sqlQuery = `INSERT INTO profile (username, password, email, token) VALUES ("${cleanUsername}", "${hash(cleanPassword)}", "${cleanEmail}", "${generateToken()}")`;
    sql.query(sqlQuery);

    log.print("Account creation success: " + cleanUsername + ", " + cleanEmail);

    return 0;
}

function checkToken(token) {
    var cleanToken = cleanString(token);

    var sqlQuerry = `SELECT * FROM profile WHERE token = "${cleanToken}"`;

    if (sql.query(sqlQuerry).length == 0)
        return false;
    
    return true;
}

function getTokenFromAccountInfo(username, password) {
    var cleanUsername = cleanString(username);
    var cleanPassword = cleanString(password)

    var sqlQuerry = `SELECT token FROM profile WHERE username = "${cleanUsername}" AND password = "${hash(cleanPassword)}"`;
    var result = sql.query(sqlQuerry);
    if (result.length == 0) {
        return false;
    }
    return result[0]["token"];
}

function getTasksFromToken(token) {
    var cleanToken = cleanString(token);

    var sqlQuerry = `SELECT group_id, title, deadline, priority, flag, status_id FROM task, profile WHERE task.owner_id = profile.id AND profile.token = '${cleanToken}'`;
    return sql.query(sqlQuerry);
}


module.exports.connect = sql.connect;

module.exports.createAccount = createAccount;
module.exports.checkToken = checkToken;
module.exports.getTokenFromAccountInfo = getTokenFromAccountInfo;
module.exports.getTasksFromToken = getTasksFromToken;

module.exports.NO_USERNAME = NO_USERNAME;
module.exports.NO_PASSWORD = NO_PASSWORD;
module.exports.NO_EMAIL = NO_EMAIL;
module.exports.USED_USERNAME = USED_USERNAME;
module.exports.USED_EMAIL = USED_EMAIL;
module.exports.MAIL_ERR = MAIL_ERR;
module.exports.TOO_MANY_RESULTS_ERR = TOO_MANY_RESULTS_ERR;
