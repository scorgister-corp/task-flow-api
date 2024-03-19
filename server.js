const express = require('express');
const handler = require('./handler')
const core = require('./taskflow_core')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0"
const BAD_CREDENTIALS = -1;

const handlers = handler(app, defaultMethodNotAllowedHandler);

// -- WITHOUT TOKEN -- \\

handlers.get("/version", (req, res) => {
    res.json({version: VERSION});
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
        send(res, {connection: false, error: BAD_CREDENTIALS})
        return;
    }
   
    send(res, {connection: true, token: result});
});
   


// verify token
handlers.all("*", (req, res) => {
    if(!req.headers["x-application-auth"]) {
        send401(res);
        return;
    }

    // vérifier le token 
    //si faux alors send 401
    req.next();
});

// ---- WITH TOKEN ---- \\



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
    sendError(res, "Not Found", 404)
}

function send405(res) {
    sendError(res, "Method Not Allowed", 405)
}

function sendError(res, msg, code) {
    send(res, {error: code, message: msg}, code);
}


function defaultMethodNotAllowedHandler(req, res) {
    send405(res);
}

/**
 * 
 * @param {express.Response} res 
 * @param {JSON} body 
 * @param {int} code 
 */
function send(res, body, code=200) {
    res.status(code);
    res.json(body);
}

module.exports.start = (port=8100) => {
    app.listen(port, () => {
        log.print("Server started at localhost:" + port);
    });
};