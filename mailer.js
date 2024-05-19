const env = require('./env');
const nodemailer = require("nodemailer");
const logger = require("./logger");
const log = logger("Mailer");

var transporter = undefined;

function connectGmail() {
    var parsedFile = env.loadFile("./.env")

    try {
        console.log(parsedFile["EMAIL_PASSWORD"]);
        transporter = nodemailer.createTransport({
            service: "Gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: true,
            auth: {
                user: parsedFile["EMAIL_ADDRESS"],
                pass: parsedFile["EMAIL_PASSWORD"]
            },
        });
    }catch(e) {
        log.printError("The connection to the mail server fails");
        return false;
    }

    log.print("The connection to the mail server has been established");
    return true;
}

/**
 * 
 * @param {String} from 
 * @param {String} to 
 * @param {String} subject 
 * @param {String} message 
 * @param {Function} callback 
 * @returns 
 */
function sendMail(from, to, subject, message, callback) {
    if(transporter == undefined)
        return false;

    transporter.sendMail(
        {
            from: from,
            to: to,
            subject: subject,
            text: message
        },
        (error, infos) => {
            if(error)
                log.printError("Sending email failed");
            else
                log.print("The email was sent successfully");

            callback(error, infos);
        }
    )

    return true;
}

module.exports.connectGmail = connectGmail;
module.exports.sendMail = sendMail;
