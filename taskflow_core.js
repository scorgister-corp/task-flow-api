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
const NO_TITLE = -11;
const NO_PRIORITY = -12;

function generateToken() {
    return uuid.v4();
}

function hash(input) {
    return sha.sha256(input);
}

function createAccount(username, password, email) {
    var errCode = true;

    if(!username)
        errCode = NO_USERNAME;
    else if(!password)
        errCode =  NO_PASSWORD;
    else if(!email)
        errCode =  NO_EMAIL;
    else if(sql.query(`SELECT COUNT(username) AS c FROM profile WHERE username = ?`, [username])[0]["c"] != 0)
        errCode =  USED_USERNAME;
    else if(!email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
        errCode =  MAIL_ERR;
    else if(sql.query(`SELECT COUNT(email) AS c FROM profile WHERE email = ?`, [email])[0]["c"] != 0)
        errCode =  USED_EMAIL;

    if(errCode != true) {
        log.printError("Error " + errCode + " with account creation: " + username + ", " + email);

        return errCode;
    }

    sql.query(`INSERT INTO profile (username, password, email, token) VALUES (?, ?, ?, ?)`, [username, hash(password), email, generateToken()]);

    log.print("Account creation success: " + username + ", " + email);

    return true;
}

function isUserTaskAuthorize(taskId, userToken) {
    var ownerId = getIdFromToken(userToken);
    if(ownerId == undefined)
        return false;

    var res = sql.query(`SELECT COUNT(*) AS c FROM task, board WHERE (task.board_id = 0 AND board.id = task.board_id AND task.owner_id = ? AND task.id = ?) OR (task.board_id != 0 AND board.id = task.board_id AND task.id = ? AND board.members_id LIKE ?)`, [ownerId, taskId, taskId,  "%:" + ownerId + ":%"]);
    
    return res[0]["c"] >= 1;
}

function checkToken(token) {
    if(sql.query(`SELECT * FROM profile WHERE token = ?`, [token]).length == 0)
        return false;
    
    return true;
}

function isRegisteredBoard(token, boardToken) {
    var id = getIdFromToken(token);
    if(id == undefined || id == "")
        return BAD_TOKEN;

    var boardToken = getBoardIdFromBoardToken(boardToken);
    if(boardToken == undefined || boardToken == "")
        return BAD_TOKEN;

    var result = sql.query(`SELECT * FROM board WHERE members_id LIKE ? AND id = ?`, ["%:" + id + ":%", boardToken]);

    if(result.length == 0)
        return false;
    
    return true;
}


function getIdFromToken(token) {    
    var result = sql.query(`SELECT id FROM profile WHERE token = ?`, [token]);
    if(result.length == 0)
        return undefined;
    return result[0]["id"];
}

function getBoardIdFromBoardToken(token) {    
    var result = sql.query(`SELECT id FROM board WHERE token = ?`, [token]);
    if(result.length == 0)
        return undefined;
    return result[0]["id"];
}

function getTasksFromToken(token) {
    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return [];

    return sql.query(`SELECT task.id AS id, board.token AS board_token, title, description, deadline, priority, completed FROM task, board WHERE (board.id = 0 AND task.board_id = board.id AND task.owner_id = ?) OR (board.id != 0 AND task.board_id = board.id AND board.members_id LIKE ?)`, [ownerId, "%:" + ownerId + ":%"]);
}

function getTask(id, token) {
    if(!isUserTaskAuthorize(id, token))
        return {code: BAD_TOKEN, message: getCodeMessage(BAD_TOKEN)};
    
    var result = sql.query(`SELECT title, description, deadline, priority, completed FROM task WHERE id = ?`, [id]);
    if(result.length == 0)
        return {tile: undefined, description: undefined, deadline: undefined, priority: undefined, completed: undefined};

    return result[0];
}

function updateTaskState(id, token, completed) {
    if(!isUserTaskAuthorize(id, token))
        return BAD_TOKEN;

    var result = sql.query(`UPDATE task SET completed = ? WHERE id = ?`, [completed, id]);
    if(result.length == 0)
        return BAD_ID;

    return true;
}

function getTokenFromAccountInfo(username, password) {
    var result = sql.query(`SELECT token FROM profile WHERE username = ? AND password = ?`, [username, hash(password)]);
    if(result.length == 0)
        return false;

    return result[0]["token"];
}

function getProfileInfoFromId(id) {
    var result = sql.query(`SELECT username, email FROM profile WHERE id = ?`, [id]);
    if(result)
        return result[0];

    return BAD_ID;
}

function getProfileInfo(token) {
    var result = sql.query(`SELECT username, email FROM profile WHERE token = ?`, [token]);
    if(result)
        return result[0];

    return BAD_TOKEN;
}

function getBoards(token) {
    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return BAD_TOKEN;

    var result = sql.query(`SELECT name, token FROM board WHERE members_id LIKE ? OR id = 0`, ["%:" + ownerId + ":%"]);
    
    return result;
}

/**
 * 
 * @param {Array} boardToken 
 * @returns 
 */
function getBoardMembers(boardToken) {
    var result = sql.query(`SELECT members_id FROM board WHERE token = ?`, [boardToken]);
    if(result.length == 0)
        return [BAD_TOKEN, null, null];

    result = result[0];
    var mem = result["members_id"];
    mem = mem.split(':');

    var ret = [];
    for(var i = 0; i < mem.length; i++) {
        if(mem[i] == "")
            continue;

        ret.push(mem[i]);
    }

    return ret;
}

function getBoard(token, boardToken) {
    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return [BAD_TOKEN, null, null];

    var result = sql.query(`SELECT name, members_id FROM board WHERE (members_id LIKE ? OR id = 0) AND token =?`, ["%:" + ownerId + ":%", boardToken]);
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
    var boardId = getBoardIdFromBoardToken(boardToken);

    if(boardId == undefined) {
        return [BAD_TOKEN, null];
    }

    if(boardId == 0)
        var result = sql.query(`SELECT task.id, title, description, deadline, priority, completed FROM task, profile WHERE task.owner_id = profile.id AND profile.token = ? AND task.board_id = 0`, [token]);
    else
        var result = sql.query(`SELECT task.id, title, description, deadline, priority, completed FROM task WHERE task.board_id = ?`, [boardId]);
    
    return [true, result];
}

function joinBoard(token, boardToken) {
    var registered = isRegisteredBoard(token, boardToken);

    if(registered == true)
        return true;
    else if(registered == BAD_TOKEN)
        return BAD_TOKEN;
    
    sql.query(`UPDATE board SET members_id = CONCAT((SELECT members_id FROM board WHERE token = ?), ?) WHERE token = ?`, [boardToken, getIdFromToken(token) + ":", boardToken]);
    return true;
}

function updateProfileInfo(token, username, email, currentPassword, newPassword) {
    if(currentPassword != "" && newPassword != "") {
        var validPassword = sql.query(`SELECT * FROM profile WHERE password = ? AND token = ?`, [hash(currentPassword), token]);
        if(validPassword.length == 0)
            return BAD_PASSWORD;
        sql.query(`UPDATE profile SET password = ? WHERE token = ?`, [hash(newPassword), token]);

    }

    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return BAD_TOKEN;

    if(sql.query(`SELECT COUNT(username) AS c FROM profile WHERE username = ? AND id != ?`, [username, ownerId])[0]["c"] != 0)
        return USED_USERNAME;

    if(username != "")
        sql.query(`UPDATE profile SET username = ? WHERE token = ?`, [username, token]);
    else
        return NO_USERNAME;
    
    if(email != "")
        if(email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
            sql.query(`UPDATE profile SET email = ? WHERE token = ?`, [email, token]);
        else
            return MAIL_ERR
    
    return true;
}

function addTask(title, description, priority, deadline, ownerToken, boardToken) {
    if(title == undefined || title == "")
        return NO_TITLE;
    if(priority == undefined || priority == "")
        return NO_PRIORITY;
    if(boardToken == undefined || boardToken == "")
        return BAD_TOKEN;

    var ownerId = getIdFromToken(ownerToken);
    if(ownerId == undefined)
        return BAD_TOKEN;

    var boardId = getBoardIdFromBoardToken(boardToken);
    if(boardId == undefined)
        return BAD_TOKEN;

    if(deadline == "")
        sql.query(`INSERT INTO task (owner_id, board_id, title, description, priority) VALUES (?, ?, ?, ?, ?)`, [ownerId, boardId, title, description, priority]);
    else
        sql.query(`INSERT INTO task (owner_id, board_id, title, description, deadline, priority) VALUES (?, ?, ?, ?, ?, ?)`, [ownerId, boardId, title, description, deadline, priority])

    return true;
}

function updateTask(id, token, title, description, priority, deadline) {
    if(title == undefined || title == "")
        return NO_TITLE;
    if(priority == undefined || priority == "")
        return NO_PRIORITY;

    if(!isUserTaskAuthorize(id, token))
        return BAD_TOKEN;
    
    if(deadline == "")
        sql.query(`UPDATE task SET title = ?, description = ?, deadline = null, priority = ? WHERE id = ?`, [title, description, priority, id]);
    else
        sql.query(`UPDATE task SET title = ?, description = ?, deadline = ?, priority = ? WHERE id = ?`, [title, description, deadline, priority, id]);

    return true;
}

function addBoard(title, ownerToken) {
    var ownerId = getIdFromToken(ownerToken);
    if(ownerId == undefined)
        return [BAD_TOKEN, null];

    if(title == undefined || title == "")
        return [NO_TITLE, null]

    var boardToken = generateToken();
    sql.query(`INSERT INTO board (name, members_id, token) VALUES (?, ?, ?)`, [title, ":" + ownerId + ":", boardToken]);
    return [true, boardToken];
}

function search(query, token) {
    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return [BAD_TOKEN, null, null];

    query = query.toLowerCase();

    var tasks = sql.query(`SELECT task.id AS id, board.token AS board_token, title, description, deadline, priority, completed FROM task, board WHERE board.id = task.board_id AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) AND (task.owner_id = ? OR board.members_id LIKE ?)`, ["%" + query + "%", "%" + query + "%", ownerId, "%:" + ownerId + ":%"]);
    var boards = sql.query(`SELECT name, token FROM board WHERE LOWER(name) LIKE ? AND (board.members_id LIKE ? OR board.id = 0)`, ["%" + query + "%", "%:" + ownerId + ":%"]);
    return [true, tasks, boards];
}

function deleteTask(taskId) {
    sql.query(`DELETE FROM task WHERE id = ?`, [taskId]);
    return true;
}

function leaveBoard(token, boardToken) {
    var ownerId = getIdFromToken(token);
    if(ownerId == undefined)
        return BAD_TOKEN;

    var boardId = getBoardIdFromBoardToken(boardToken);
    if(boardId == undefined)
        return BAD_TOKEN;

    var members = getBoardMembers(boardToken);

    if(members.length <= 1) {
        sql.query(`DELETE FROM task WHERE board_id = ?`, [boardId]);

        sql.query(`DELETE FROM board WHERE token = ?`, [boardToken]);
        return true;
    }

    if(members.indexOf(ownerId.toString()) < 0)
        return BAD_TOKEN;

    var membersId = ":";
    for(var i = 0; i < members.length; i++) {
        if(members[i] == ownerId)
            continue;

        membersId += members[i] + ":"
    }
        
    sql.query(`UPDATE board SET members_id = ? WHERE token = ?`, [membersId, boardToken]);
    return true;
}

/**
 * 
 * @param {String} name 
 * @param {String} email 
 * @param {String} message 
 */
function report(name, email, message) {
    mailer.sendMail(email, "scorgister.corp@gmail.com", name + " would like to contact you", "MESSAGE FROM " + email.toUpperCase() + ":\n\n" + message, (error, infos) => {
        
    });
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
        case NO_TITLE:
            return "no title";

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
module.exports.deleteTask = deleteTask;
module.exports.leaveBoard = leaveBoard;
module.exports.updateTask = updateTask;
module.exports.report = report;
module.exports.isUserTaskAuthorize = isUserTaskAuthorize;


module.exports.getCodeMessage = getCodeMessage;

module.exports.NO_USERNAME = NO_USERNAME;
module.exports.NO_PASSWORD = NO_PASSWORD;
module.exports.NO_EMAIL = NO_EMAIL;
module.exports.USED_USERNAME = USED_USERNAME;
module.exports.USED_EMAIL = USED_EMAIL;
module.exports.MAIL_ERR = MAIL_ERR;
module.exports.TOO_MANY_RESULTS_ERR = TOO_MANY_RESULTS_ERR;
module.exports.BAD_TOKEN = BAD_TOKEN;
