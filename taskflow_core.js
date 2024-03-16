const logger = require('./logger')
const log = logger("Core")
const sql = require('./sql_connector');

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
    if (!password)
        errCode =  NO_PASSWORD;
    if (!email)
        errCode =  NO_EMAIL;
    if (
        inc(["'", '"', "`", "{", "}", "[", "]", "(", ")", "|"], username)
        || inc(["'", '"', "`", "{", "}", "[", "]", "(", ")", "|"], password)
        || inc(["'", '"', "`", "{", "}", "[", "]", "(", ")", "|"], email)
    )
        verrCode =  SQL_ERR;
    if (sql.query(`SELECT COUNT(username) AS c FROM profile WHERE username = "${username}"`)[0]["c"] != 0)
        errCode =  USED_USERNAME;
    if (sql.query(`SELECT COUNT(email) AS c FROM profile WHERE email = "${email}"`)[0]["c"] != 0)
        errCode =  USED_EMAIL;
    if (!validateEmail(email))
        errCode =  MAIL_ERR;

    if (errCode != 0) {
        log.printError("Error with account creation: " + username + ", " + email);
        
        var tempCode = errCode;
        errCode = 0;

        return tempCode;
    }

    var sqlQuery = `INSERT INTO profile (username, password, email) VALUES (${username}, ${password}, ${email})`;
    
    log.print("Account creation success: " + username + ", " + email);

    return 0;
}

function inc(arr, str) {
    for(var i = 0; i < arr.length; i++)
        if(str.includes(arr[i]))
            return true;

    return false
    
}

const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

createAccount("aa", "bb", "a@a.com")