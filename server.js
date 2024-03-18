const express = require('express');
const bodyParser = require('body-parser')
const logger = require('./logger');

const log = logger("Server");

const app = express();
app.use(express.json());

const VERSION = "1.0"

app.get("/version", (req, res) => {
    res.json({version: VERSION})
});

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
    res.status(404).json({error: "404"});
})

function send401(res) {
    res.status(401);
}

function sendError(type) {
    
}

function send(body) {

}

module.exports.start = (port=8100) => {
    app.listen(port, () => {
        log.print("Server started at localhost:" + port);
    });
};