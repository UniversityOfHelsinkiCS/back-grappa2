const Promise = require('bluebird')
const oracleKnex = require('../db/connection').getOracleKnex()
const knex = require('../db/connection').getKnex()

const gradeMap = {
    Approbatur: '09. a',
    'Lubenter Approbatur': '08. lub',
    'Non Sine Laude Approbatur': '07. nsla',
    'Cum Laude Approbatur': '06. cl',
    'Magna Cum Laude Approbatur': '05. mcl',
    'Eximia Cum Laude Approbatur': '04. ecl',
    Laudatur: '03. l'
}

const createTransaction = () => new Promise(resolve => oracleKnex.transaction(resolve))

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
    const dataToExport = await getDataToExport(thesisIds)

    console.log(dataToExport)
    await exportThesisData(dataToExport[0])
}

const getDataToExport = async (thesisIds) => {
    const agreements = await agreementsToExport(thesisIds)
    const dataToExport = await Promise.map(agreements, getThesisDataToExport)

    return dataToExport
}

const exportThesisData = async (thesisData) => {
    try {
        const thesisRow = await getThesisRow(thesisData)
        const trx = await createTransaction()

        await updateIfMissing(trx, 'ARVOSANA', thesisRow, gradeMap[thesisData.grade] || thesisData.grade)
        await updateIfMissing(trx, 'VAHVISTUSPVM', thesisRow, thesisData.councilMeeting)

        await trx.commit()
    } catch (err) {
        console.log(err)
    }
}

const updateIfMissing = async (trx, field, thesisRow, value) => {
    if (!thesisRow.ARVOSANA) {
        const update = {}
        update[field] = value

        await trx('GRADU.GRADU')
            .where('TUNNUS', thesisRow.TUNNUS)
            .update(update)
    }
}

const getThesisRow = async (thesisData) => {
    const thesisFromOldDb = await oracleKnex('GRADU.GRADU')
        .where('TEKIJA', thesisData.author.studentNumber)
        .first()

    if (!thesisFromOldDb) {
        await insertNewThesisToDB(thesisData)

        return oracleKnex('GRADU.GRADU')
            .where('TEKIJA', thesisData.author.studentNumber)
            .first()
    }

    return thesisFromOldDb
}

const insertNewThesisToDB = async (thesisData) => {
    const trx = await createTransaction()
    const thesisId = await trx.raw('select GRADU.GTUNNUS.NEXTVAL from dual')
    const thesisRow = {
        TUNNUS: thesisId[0].NEXTVAL,
        TEKIJA: thesisData.author.studentNumber,
        OTSAKE: thesisData.thesisTitle,
        TILA: '12. hyväksytty',
        KIRJAUSPVM: thesisData.councilMeeting
    }

    await trx('GRADU.GRADU').insert(thesisRow)
    await trx.commit()
}

module.exports.getDataToExport = getDataToExport
