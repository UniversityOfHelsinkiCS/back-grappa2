const nodemailer = require('nodemailer');

const smtp = () => ({
    from: "Grappa Robot <noreply@" + process.env.EMAIL_HOST + ">",
    host: "smtp." + process.env.EMAIL_HOST,
    port: 587,
    secure: false // false -> TLS, true -> SSL
});

const testSmtp = () => ({
    from: "Grabba Robot <" + process.env.TEST_MAIL + "@" + process.env.EMAIL_HOST + ">",
    host: "smtp." + process.env.EMAIL_HOST,
    port: 465,
    secure: true, // false -> TLS, true -> SSL
    auth: {
        user: process.env.TEST_MAIL + "@" + process.env.EMAIL_HOST,
        pass: process.env.MAIL_PSWD
    }
});

export async function sendEmail(to, subject, body, attachments) {
    console.log("sendEmail", to);
    var senderSettings = testSmtp();
    var transporter = nodemailer.createTransport(senderSettings);

    // if you don't want to spam people/yourself use this
    //if (process.env.NODE_ENV === "dev")
    //    return logMail(to, subject, body, attachments);

    const options = {
        from: senderSettings.from,
        to: to,
        subject: subject,
        text: body,
        attachments: attachments || []
    };

    console.log("mail options", options);

    return new Promise((resolve, reject) => {
        transporter.sendMail(options, (err, info) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(info);
            }
        });
    }).catch(err => {
            console.error("EmailSender sendEmail ERRORED:");
            console.error(err);
    });
}

const logMail = (to, subject, body, attachments) => {
    console.log("----------------");
    console.log(smtp());
    console.log(to);
    console.log(subject);
    console.log(body);
    console.log(attachments);
    console.log("----------------");
    return Promise.resolve();
}
