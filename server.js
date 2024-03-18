const express = require('express');
const bodyParser = require('body-parser')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0"


// -- WITHOUT TOKEN -- \\

app.get("/version", (req, res) => {
    res.json({version: VERSION})
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

app.post("/login", (req, res) => {
    console.log(!req.body["testee"]);
   if(!req.body["username"] || !req.body["password"]) {
        res.sendStatus(401);
        return;
    }

    var username = req.body["username"];
    var password = req.body["password"];

    // tenter la connection 
    res.json({connection: true, token: ""});
});

// send 404
app.all("*", (req, res) => {
    send404(res);
})

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

function send(res, body, code=200) {
    res.status(code);
    res.send(body);
}

module.exports.start = (port=8100) => {
    app.listen(port, () => {
        log.print("Server started at localhost:" + port);
    });
};