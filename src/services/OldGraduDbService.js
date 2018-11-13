const Promise = require('bluebird')
// const oracleKnex = require('../db/connection').getOracleKnex()
const knex = require('../db/connection').getKnex()

const agreementsToExport = async (thesisIds) => {
    const studyfieldsToExport = knex('studyfield')
        .select('studyfieldId')
        .whereIn('programmeId', [1, 5, 8])

    return knex('agreement')
        .where('studyfieldId', 'in', studyfieldsToExport)
        .andWhere('thesisId', 'in', thesisIds)
}

const getThesisDataToExport = async (agreement) => {
    const author = await knex('person').where('personId', agreement.authorId).first()
    const thesis = await knex('thesis').where('thesisId', agreement.thesisId).first()
    const councilMeeting = await knex('councilmeeting').where('councilmeetingId', thesis.councilmeetingId).first('date')
    const graders = await knex('agreementPerson')
        .where('agreementId', agreement.agreementId)
        .leftJoin('personWithRole', 'personWithRole.personId', 'agreementPerson.personRoleId')
        .leftJoin('person', 'person.personId', 'personWithRole.personId')
        .select(['firstname', 'lastname'])

    return {
        author,
        thesisTitle: thesis.title,
        grade: thesis.grade,
        councilMeeting: councilMeeting.date,
        graders
    }
}

module.exports.exportThesisToOldDb = async (thesisIds) => {
    const agreements = await agreementsToExport(thesisIds)
    const dataToExport = await Promise.map(agreements, getThesisDataToExport)

    return dataToExport
}
