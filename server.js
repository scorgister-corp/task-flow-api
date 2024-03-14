const express = require('express');
const logger = require('./logger.js');

const log = logger("Server");

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const VERSION = "1.0"

app.get("/version", (req, res) => {
    res.json({version: VERSION})
});


// send 404
app.all("*", (req, res) => {
    res.status(404).json({error: "404"});
})

module.exports.start = (port=8100) => {
    app.listen(port, () => {
        log.print("Server started at localhost:" + port);
    });
};