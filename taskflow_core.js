const logger = require('./logger');
const log = logger("Core");
const sql = require('./sql_connector');
const mailer = require('./mailer');
const uuid = require('uuid');
const sha = require('js-sha256')

const NO_USERNAME = -1;
const NO_PASSWORD = -2;
const NO_EMAIL = -3;
const USED_USERNAME = -4;
const USED_EMAIL = -5;
const MAIL_ERR = -6;
const TOO_MANY_RESULTS_ERR = -7;
const BAD_TOKEN = -8;
const BAD_PASSWORD = -9;
const BAD_ID = -10;


function cleanString(input) {
    return String(input).replace(/'/g, "''");
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

    var sqlQuery = `SELECT * FROM profile WHERE token = "${cleanToken}"`;

    if (sql.query(sqlQuery).length == 0)
        return false;
    
    return true;
}

function isRegisteredBoard(token, boardToken) {
    token = cleanString(token);
    boardToken = cleanString(boardToken);

    var id = getIdFromToken(token);
    if(id == undefined || id == "")
        return BAD_TOKEN;

    var boardToken = getBoardIdFromBoardToken(boardToken);
    if(boardToken == undefined || boardToken == "")
        return BAD_TOKEN;

    var result = sql.query(`SELECT * FROM board WHERE members_id LIKE '%:${id}:%' AND id = "${boardToken}"`);

    if(result.length == 0)
        return false;
    
    return true;
}


function getIdFromToken(token) {
    token = cleanString(token);
    
    var result = sql.query(`SELECT id FROM profile WHERE token = "${token}"`);
    if(result.length == 0)
        return undefined;
    return result[0]["id"];
}

function getBoardIdFromBoardToken(token) {
    token = cleanString(token);
    
    var result = sql.query(`SELECT id FROM board WHERE token = "${token}"`);
    if(result.length == 0)
        return undefined;
    return result[0]["id"];
}

function getTasksFromToken(token) {
    var cleanToken = cleanString(token);

    var sqlQuery = `SELECT task.id AS id, board.token AS board_token, title, description, deadline, priority, completed FROM task, profile, board WHERE task.owner_id = profile.id AND board.id = board_id AND profile.token = "${cleanToken}"`;
    return sql.query(sqlQuery);
}

function getTask(id) {
    id = cleanString(id);
    var result = sql.query(`SELECT title, description, deadline, priority, completed FROM task WHERE id = "${id}"`);
    if(result.length == 0)
        return {tile: undefined, description: undefined, deadline: undefined, priority: undefined, completed: undefined};
    return result[0];
}

function updateTaskState(id, completed) {
    id = cleanString(id);
    completed = cleanString(completed);

    var result = sql.query(`UPDATE task SET completed = "${completed}" WHERE id = "${id}"`);
    if(result.length == 0)
        return BAD_ID;

    return true;
}

function getTokenFromAccountInfo(username, password) {
    var cleanUsername = cleanString(username);
    var cleanPassword = cleanString(password)

    var sqlQuery = `SELECT token FROM profile WHERE username = "${cleanUsername}" AND password = "${hash(cleanPassword)}"`;
    var result = sql.query(sqlQuery);
    if(result.length == 0) {
        return false;
    }
    return result[0]["token"];
}

function getProfileInfoFromId(id) {
    var id = cleanString(id);

    var sqlQuery = `SELECT username, email FROM profile WHERE id = "${id}"`;
    var result = sql.query(sqlQuery);

    if(result)
        return result[0];

    return BAD;
}

function getProfileInfo(token) {
    var cleanToken = cleanString(token);

    var sqlQuery = `SELECT username, email FROM profile WHERE token = "${cleanToken}"`;
    var result = sql.query(sqlQuery);

    if(result)
        return result[0];

    return BAD_TOKEN;
}

function getBoards(token) {
    var token = cleanString(token);

    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return BAD_TOKEN;

    var result = sql.query(`SELECT name, token FROM board WHERE members_id LIKE '%:${ownerId}:%' OR id = 0`);
    
    return result;
}

function getBoard(token, boardToken) {
    var token = cleanString(token);

    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return [BAD_TOKEN, null, null];

    var result = sql.query(`SELECT name, members_id FROM board WHERE (members_id LIKE '%:${ownerId}:%' OR id = 0) AND token = "${boardToken}"`);
    if(result.length == 0)
        return [BAD_TOKEN, null, null];

    result = result[0];
    var mem = result["members_id"];
    mem = mem.split(':');

    var members = [];

    for(var i = 0; i < mem.length; i++) {
        if(mem[i] == "")
            continue;

        var infos = getProfileInfoFromId(mem[i]);
        if(infos == undefined)
            continue;

        members.push(infos["username"]);
    }
    
    return [true, result["name"], members];
}

function getBoardTasks(token, boardToken) {
    var boardToken = cleanString(boardToken);

    var boardId = getBoardIdFromBoardToken(boardToken);

    if(boardId == undefined) {
        return [BAD_TOKEN, null];
    }

    if(boardId == 0)
        var result = sql.query(`SELECT task.id, title, description, deadline, priority, completed FROM task, profile WHERE task.owner_id = profile.id AND profile.token = "${token}" AND task.board_id = 0`);
    else
        var result = sql.query(`SELECT task.id, title, description, deadline, priority, completed FROM task WHERE task.board_id = ${boardId}`);
    
    return [true, result];
}

function joinBoard(token, boardToken) {
    var token = cleanString(token);
    var boardToken = cleanString(boardToken);

    var registered = isRegisteredBoard(token, boardToken);

    if(registered == true)
        return true;
    else if(registered == BAD_TOKEN)
        return BAD_TOKEN;
    
    sql.query(`UPDATE board SET members_id = CONCAT((SELECT members_id FROM board WHERE token = "${boardToken}"), "${getIdFromToken(token)}:") WHERE token = "${boardToken}"`);
    return true;
}

function updateProfileInfo(token, username, email, currentPassword, newPassword) {
    token = cleanString(token);
    username = cleanString(username);
    email = cleanString(email);
    currentPassword = cleanString(currentPassword);
    newPassword = cleanString(newPassword);

    if(currentPassword != "" && newPassword != "") {
        var validPassword = sql.query(`SELECT * FROM profile WHERE password = "${hash(currentPassword)}" AND token = "${token}"`);
        if(validPassword.length == 0)
            return BAD_PASSWORD;
        sql.query(`UPDATE profile SET password = "${hash(newPassword)}" WHERE token = "${token}"`);

    }
    if(username != "")
        sql.query(`UPDATE profile SET username = "${username}" WHERE token = "${token}"`);
    
    if(email != "")
        if(email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
            sql.query(`UPDATE profile SET email = "${email}" WHERE token = "${token}"`);
        else
            return MAIL_ERR
    
    return true;
}

function addTask(title, description, priority, deadline, ownerToken, boardToken) {
    title = cleanString(title);
    description = cleanString(description);
    priority = cleanString(priority);
    deadline = cleanString(deadline);
    ownerToken = cleanString(ownerToken);
    boardToken = cleanString(boardToken);

    var ownerId = getIdFromToken(ownerToken);
    if(ownerId == undefined)
        return BAD_TOKEN;

    var boardId = getBoardIdFromBoardToken(boardToken);
    if(boardId == undefined)
        return BAD_TOKEN;

    if(deadline == "")
        sql.query(`INSERT INTO task (owner_id, board_id, title, description, priority) VALUES ("${ownerId}", "${boardId}", "${title}", "${description}", "${priority}")`)
    else
        sql.query(`INSERT INTO task (owner_id, board_id, title, description, deadline, priority) VALUES ("${ownerId}", "${boardId}", "${title}", "${description}", "${deadline}", "${priority}")`)

    return true;
}

function addBoard(title, ownerToken) {
    title = cleanString(title);
    ownerToken = cleanString(ownerToken);

    var ownerId = getIdFromToken(ownerToken);
    if(ownerId == undefined)
        return [BAD_TOKEN, null];

    var boardToken = generateToken();
    sql.query(`INSERT INTO board (name, members_id, token) VALUES ("${title}", ":${ownerId}:", "${boardToken}")`);
    return [true, boardToken];
}

function search(query, token) {
    query = cleanString(query);
    token = cleanString(token);

    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return [BAD_TOKEN, null, null];

    query = query.toLowerCase();

    var tasks = sql.query(`SELECT task.id AS id, board.token AS board_token, title, description, deadline, priority, completed FROM task, board WHERE board.id = task.board_id AND (LOWER(title) LIKE "%${query}%" OR LOWER(description) LIKE "%${query}%") AND (task.owner_id = "${ownerId}" OR board.members_id LIKE "%:${ownerId}:%")`)
    var boards = sql.query(`SELECT name, token FROM board WHERE LOWER(name) LIKE "%${query}%" AND (board.members_id LIKE "%:${ownerId}:%" OR board.id = 0)`)
    return [true, tasks, boards];
}

function getCodeMessage(code) {
    switch(code) {
        case NO_USERNAME:
            return "no username";
        case NO_PASSWORD:
            return "no password";
        case NO_EMAIL:
            return "no email";
        case USED_USERNAME:
            return "username already taken";
        case USED_EMAIL:
            return "email already registered";
        case MAIL_ERR:
            return "mail format invalid";
        case TOO_MANY_RESULTS_ERR:
            return "too many results";
        case BAD_TOKEN:
            return "bad token";
        case BAD_PASSWORD:
            return "bad password";
        case BAD_ID:
            return "bad id";

        case 1:
        case true:
            return "alright";
    }
    return "an error occurred";
}

module.exports.connect = sql.connect;
module.exports.connectMailer = mailer.connectGmail;

module.exports.connect = sql.connect;
module.exports.createAccount = createAccount;
module.exports.checkToken = checkToken;
module.exports.getTokenFromAccountInfo = getTokenFromAccountInfo;
module.exports.getTasksFromToken = getTasksFromToken;
module.exports.getTask = getTask;
module.exports.getProfileInfo = getProfileInfo;
module.exports.updateProfileInfo = updateProfileInfo;
module.exports.addTask = addTask;
module.exports.getBoards = getBoards;
module.exports.getBoard = getBoard;
module.exports.getBoardTasks = getBoardTasks;
module.exports.updateTaskState = updateTaskState;
module.exports.addBoard = addBoard;
module.exports.joinBoard = joinBoard;
module.exports.isRegisteredBoard = isRegisteredBoard;
module.exports.search = search;

module.exports.getCodeMessage = getCodeMessage;

module.exports.NO_USERNAME = NO_USERNAME;
module.exports.NO_PASSWORD = NO_PASSWORD;
module.exports.NO_EMAIL = NO_EMAIL;
module.exports.USED_USERNAME = USED_USERNAME;
module.exports.USED_EMAIL = USED_EMAIL;
module.exports.MAIL_ERR = MAIL_ERR;
module.exports.TOO_MANY_RESULTS_ERR = TOO_MANY_RESULTS_ERR;
module.exports.BAD_TOKEN = BAD_TOKEN;
