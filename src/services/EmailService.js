const knex = require('../../connection');
const mailer = require('../util/mailer');
const templates = require('../util/emailTemplates');

export const agreementCreated = (data) => {
    console.log("agreementCreated", data);
    let body = templates.getEmailTemplate('createAgreement', data);
    console.log("template", body);
    if (!body) {
        console.log("no template");
        return;
    }
    getEmailAddressByPersonRoleFieldId(data.thesisSupervisorMain).then(address => {
        return mailer.sendEmail(address, 'New Agreement created', body);
    })
}

export const agreementUpdated = (data) => {
    console.log("agreementUpdated", data);
    let body = templates.getEmailTemplate('updateAgreement');
    //selvitä kuka lähetti
    //kova koodattu tässä vaiheessa
}

const getEmailAddressByPersonRoleFieldId = (id) => {
    console.log("getEmailAddressByPersonRoleFieldId");
    return knex.select('person.email').from('personRoleField')
        .join('person', 'personRoleField.personId', '=', 'person.personId')
        .where('personRoleField.personId', id)
        .then(to => { return to[0].email })
}
