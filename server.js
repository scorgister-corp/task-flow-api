const express = require('express');
const handler = require('./handler')
const core = require('./taskflow_core')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0.2"
const BAD_CREDENTIALS = "bad credentials";

const handlers = handler(app, defaultMethodNotAllowedHandler);

// -- WITHOUT TOKEN -- \\

app.options("*", (req, res) => {
    send(res, {});
});

handlers.get("/version", (req, res) => {
    send(res, {version: VERSION});
});

handlers.post("/register", (req, res) => {
    if(req.body["username"] == undefined || req.body["password"] == undefined || req.body["email"] == undefined) {
        send400(res);
        return;
    }
   
    var username = req.body["username"];
    var password = req.body["password"];
    var email    = req.body["email"];
    var result   = core.createAccount(username, password, email);
   
    send(res, {code: result, message: core.getCodeMessage(result)});
});
   
handlers.post("/login", (req, res) => {
    if(req.body["username"] == undefined || req.body["password"] == undefined) {
        send400(res);
        return;
    }
   
    var username = req.body["username"];
    var password = req.body["password"];
   
    var result = core.getTokenFromAccountInfo(username, password);
    if(!result) {
        send(res, {connection: false, message: BAD_CREDENTIALS})
        return;
    }
   
    send(res, {connection: true, token: result});
});
   
handlers.post("/report", (req, res) => {
    if(req.body["name"] == undefined || req.body["email"] == undefined || req.body["msg"] == undefined) {
        send400(res);
        return;
    }
   
    var name   = req.body["name"];
    var email  = req.body["email"];
    var msg    = req.body["msg"];
    var result = core.report(name, email, msg);
   
    send(res, {success: result});
});
   

// verify token
handlers.all("*", (req, res, next) => {
    var token = getTokenFromHeader(req);
    if(!token) {
        send401(res);
        return;
    }
    if(!core.checkToken(token)) {
        send401(res);
        return;
    }
    
    next();
});

// ---- WITH TOKEN ---- \\

handlers.get("/auth", (req, res) => {
    send(res, {valid: true});
});

handlers.get("/tasks", (req, res) => {
    var token = getTokenFromHeader(req);

    var tasks = core.getTasksFromToken(token);
    if(tasks != undefined && tasks.length != 0)
        send(res, {tasks: tasks});
    else
        send(res, {tasks: []});
});

handlers.post("/task", (req, res) => {
    if(req.body["id"] == undefined || req.body["id"] == "") {
        send400(res);
        return;
    }

    var id = req.body["id"];
    var token = getTokenFromHeader(req);

    var task = core.getTask(id, token);
    
    send(res, task);
});

handlers.post("/task/update", (req, res) => {
    var token = getTokenFromHeader(req);
    if(req.body["id"] == undefined || req.body["id"] == "") {
        send400(res);
        return;
    }

    var id = req.body["id"];
    var title = req.body["title"];
    var description = req.body["description"];
    var priority = req.body["priority"];
    var deadline = req.body["deadline"];
    
    var code = core.updateTask(id, token, title, description, priority, deadline);
    send(res, {code: code, message: core.getCodeMessage(code)});
});

handlers.post("/task/update/state", (req, res) => {
    if(req.body["id"] == undefined || req.body["id"] == "" ||
        req.body["completed"] == undefined || req.body["completed"] == "") {
        
        send400(res);
        return;
    }

    var id = req.body["id"];
    var completed = req.body["completed"];

    var token = getTokenFromHeader(req);
    
    var code = core.updateTaskState(id, token, completed);
    send(res, {code: code, message: core.getCodeMessage(code)});
});

handlers.post("/add", (req, res) => {
    var token = getTokenFromHeader(req);

    var title = req.body["title"];
    var description = req.body["description"];
    var priority = req.body["priority"];
    var deadline = req.body["deadline"];
    var boardToken = req.body["boardToken"];
    
    var code = core.addTask(title, description, priority, deadline, token, boardToken);

    send(res, {code: code, message: core.getCodeMessage(code)});
});

handlers.post("/addboard", (req, res) => {
    if(req.body["title"] == undefined) {
        send400(res);
        return;
    }

    var token = getTokenFromHeader(req);
    var title = req.body["title"];
    
    var code = core.addBoard(title, token);

    send(res, {code: code[0], token: code[1], message: core.getCodeMessage(code[0])});
});

handlers.post("/search", (req, res) => {
    if(req.body["query"] == undefined) {
        send400(res);
        return;
    }
    var token = getTokenFromHeader(req);

    var query = req.body["query"];
    
    var result = core.search(query, token);

    send(res, {code: result[0], message: core.getCodeMessage(result[0]), tasks: result[1], boards: result[2]});
});

handlers.post("/board/leave", (req, res) => {
    if(req.body["token"] == undefined || req.body["token"] == "") {
        send400(res);
        return;
    }
    
    var token = getTokenFromHeader(req);
    var boardToken = req.body["token"];
    
    var result = core.leaveBoard(token, boardToken);

    send(res, {code: result, message: core.getCodeMessage(result)});
});

handlers.get("/boards", (req, res) => {
    var token = getTokenFromHeader(req);
    
    var result = core.getBoards(token);

    send(res, result);
});

handlers.post("/board", (req, res) => {
    if(req.body["token"] == undefined) {
        send400(res);
        return;
    }

    var token = getTokenFromHeader(req);
    var boardToken = req.body["token"];

    
    var result = core.getBoard(token, boardToken);
    if(result[0] == true)
        send(res, {name: result[1], members: result[2]});
    else
        send(res, {code: result[0], message: core.getCodeMessage(result[0])});
});

handlers.post("/boardtasks", (req, res) => {
    if(req.body["token"] == undefined) {
        send400(res);
        return;
    }

    var token = getTokenFromHeader(req);
    var boardToken = req.body["token"];
    
    var result = core.getBoardTasks(token, boardToken);
    if(result[0] != true) {
        send(res, {code: core.BAD_TOKEN, message: core.getCodeMessage(core.BAD_TOKEN)});
        return;
    }

    send(res, result[1]);
});

handlers.get("/profile/infos", (req, res) => {
    var infos = core.getProfileInfo(getTokenFromHeader(req));
    send(res, infos);
});

handlers.post("/profile/update", (req, res) => {
    var username = req.body["username"];
    var email = req.body["email"];
    var currentPassword = req.body["currentPassword"];
    var newPassword = req.body["newPassword"];

    var code = core.updateProfileInfo(getTokenFromHeader(req), username, email, currentPassword, newPassword);

    send(res, {code: code, message: core.getCodeMessage(code)});
});

handlers.post("/join", (req, res) => {
    if(req.body["token"] == undefined || req.body["token"] == "") {
        send400(res);
        return;
    }

    var boardToken = req.body["token"];
    var token = getTokenFromHeader(req);

    var result = core.joinBoard(token, boardToken);

    send(res, {code: result, message: core.getCodeMessage(result)});
});

handlers.post("/task/delete", (req, res) => {
    if(req.body["id"] == undefined || req.body["id"] == "") {
        send400(res);
        return;
    }
    var id = req.body["id"];

   var result = core.deleteTask(id);

    send(res, {code: result, message: core.getCodeMessage(result)});
});

// send 404
handlers.all("*", (req, res) => {
    send404(res);
})

function send400(res) {
    sendError(res, "Bad Request", 400);
}

function send401(res) {
    sendError(res, "Unauthorized", 401);
}

function send404(res) {
    sendError(res, "Not Found", 404);
}

function send405(res) {
    sendError(res, "Method Not Allowed", 405);
}

function sendError(res, msg, code) {
    send(res, {error: code, message: msg}, code);
}


function defaultMethodNotAllowedHandler(req, res) {
    send405(res);
}

function getTokenFromHeader(req) {
    return req.headers["x-application-auth"];
}

/**
 * 
 * @param {express.Response} res 
 * @param {JSON} body 
 * @param {int} code 
 */
function send(res, body, code=200) {
    res.status(code);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "*");
    res.json(body);
}

module.exports.start = (port=8100) => {
    // init database connection
    if(core.connect() === false) {
        log.printError("Error: closing the program [0]");
        return false;
    }

    if(core.connectMailer() === false) {
        log.printError("Error: closing the program [1]");
        return false;
    }
    
    app.listen(port, () => {
        log.print("Server started at localhost:" + port);
    });
    return true;
};