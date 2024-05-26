const express = require('express');
const handler = require('./handler')
const core = require('./taskflow_core')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0"
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
   
    send(res, {result: result});
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
   
    var name   = req.body["username"];
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

handlers.post("/add", (req, res) => {
    if(req.body["title"] == undefined || req.body["title"] == "" ||
        req.body["priority"] == undefined || req.body["priority"] == "" ||
        req.body["boardToken"] == undefined || req.body["boardToken"] == "") {
        send400(res);
        return;
    }

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
    
    //var code = core.addBoard(title, token);

    send(res, {success: code});
});

handlers.post("/search", (req, res) => {
    if(req.body["query"] == undefined) {
        send400(res);
        return;
    }
    var token = getTokenFromHeader(req);

    var query = req.body["query"];
    
    //var result = core.search(query, token);

    send(res, result);
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

    send(res, result);
});

handlers.post("/boardtasks", (req, res) => {
    if(req.body["token"] == undefined) {
        send400(res);
        return;
    }
    var token = getTokenFromHeader(req);
    var boardToken = req.body["token"];
    
    var result = core.getBoardTasks(token, boardToken);
    if(result == undefined) {
        send(res, {error: core.BAD_TOKEN, message: core.getCodeMessagecore.BAD_TOKEN});
        return;
    }

    send(res, result);
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