const express = require('express');
const bodyParser = require('body-parser')
const core = require('./taskflow_core')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0"
const BAD_CREDENTIALS = 0;


// -- WITHOUT TOKEN -- \\

app.get("/version", (req, res) => {
    res.json({version: VERSION})
});

app.post("/register", (req, res) => {
    if(!req.body["username"] || !req.body["password"] || !req.body["email"]) {
        send401(res);
        return;
    }
   
    var username = req.body["username"];
    var password = req.body["password"];
    var email    = req.body["email"];
    var result   = core.createAccount(username, password, email);
   
    send(res, {result: result});
});
   
app.post("/login", (req, res) => {
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
app.all("*", (req, res) => {
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
app.all("*", (req, res) => {
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