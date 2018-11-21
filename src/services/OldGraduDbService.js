const Promise = require('bluebird')

const logger = require('../util/logger')
const oracleKnex = require('../db/connection').getOracleKnex()
const knex = require('../db/connection').getKnex()

const GRADE_MAP = {
    Approbatur: '09. a',
    'Lubenter Approbatur': '08. lub',
    'Non Sine Laude Approbatur': '07. nsla',
    'Cum Laude Approbatur': '06. cl',
    'Magna Cum Laude Approbatur': '05. mcl',
    'Eximia Cum Laude Approbatur': '04. ecl',
    Laudatur: '03. l'
}

const createTransaction = () => new Promise(resolve => oracleKnex.transaction(resolve))
const getIdFromSequence = (trx, sequence) => trx.raw('select ??.NEXTVAL from dual', sequence)

module.exports.exportThesisToOldDb = async (thesisIds) => {
    const dataToExport = await getDataToExport(thesisIds)
    await Promise.each(dataToExport, exportThesisData)
}

const getDataToExport = async (thesisIds) => {
    const agreements = await agreementsToExport(thesisIds)
    const dataToExport = await Promise.map(agreements, getThesisDataToExport)

    return dataToExport
}

const agreementsToExport = async (thesisIds) => {
    const studyfieldsToExport = knex('studyfield')
        .select('studyfieldId')
        .whereIn('programmeId', [1, 5])

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
        graders,
        studyfield: agreement.studyfieldId
    }
}

const exportThesisData = async (thesisData) => {
    try {
        const trx = await createTransaction()
        const thesisRow = await getThesisRow(trx, thesisData)
        const mainGraderId = await getPersonId(trx, thesisData.graders[0])

        await updateIfMissing(trx, 'ARVOSANA', thesisRow, GRADE_MAP[thesisData.grade] || thesisData.grade)
        await updateIfMissing(trx, 'VAHVISTUSPVM', thesisRow, thesisData.councilMeeting)
        await updateRow(trx, 'TILA', thesisRow, '12. hyväksytty')
        await updateIfMissing(trx, 'VAHVISTAJALINJA', thesisRow, getStudyfield(thesisData))
        await updateIfMissing(trx, 'VALMISTELIJA', thesisRow, mainGraderId)
        await updateIfMissing(trx, 'VAHVISTAJA', thesisRow, mainGraderId)
        await updateGraderRow(trx, thesisRow, thesisData, mainGraderId)
        await updateGradingRow(trx, thesisRow, mainGraderId)

        await trx.commit()
        logger.info(`Exported thesis ${thesisData.title} to Oracle DB`)
    } catch (err) {
        logger.error(`Export for thesis ${thesisData.title} to Oracle DB has failed`)
        logger.error(err)
    }
}

const updateRow = (trx, field, thesisRow, value) => {
    const update = {}
    update[field] = value

    return trx('GRADU')
        .where('TUNNUS', thesisRow.TUNNUS)
        .update(update)
}

const updateIfMissing = async (trx, field, thesisRow, value) => {
    if (!thesisRow[field]) {
        await updateRow(trx, field, thesisRow, value)
    }
}

const getStudyfield = (thesisData) => {
    const studyfields = {
        1: 'oja',
        2: 'alko',
        3: 'haja',
        4: 'algbio'
    }

    return studyfields[thesisData.studyfield]
}

const getPersonId = async (trx, person) => {
    const dbPerson = await trx('OHJAAJA')
        .where('SUKUNIMI', person.lastname)
        .andWhere('ETUNIMI', person.firstname)
        .first()

    if (dbPerson) {
        return dbPerson.KTUNNUS
    }

    return insertPerson(trx, person)
}

const insertPerson = async (trx, person) => {
    const personId = await getIdFromSequence(trx, 'OTUNNUS')

    await trx('GRADU.OHJAAJA')
        .insert({
            KTUNNUS: personId[0].NEXTVAL,
            SUKUNIMI: person.lastname,
            ETUNIMI: person.firstname
        })

    return personId[0].NEXTVAL
}

const updateGraderRow = async (trx, thesisRow, thesisData, mainGraderId) => {
    const graderRow = await trx('OHJAUS')
        .where('GRADUTUNNUS', thesisRow.TUNNUS)
        .andWhere('OHJAAJATUNNUS', mainGraderId)
        .first()

    if (graderRow) {
        return graderRow
    }

    const gradingId = await getIdFromSequence(trx, 'OTUNNUS')

    return trx('OHJAUS')
        .insert({
            OTUNNUS: gradingId[0].NEXTVAL,
            GRADUTUNNUS: thesisRow.TUNNUS,
            OHJAAJATUNNUS: mainGraderId,
            ROOLI: 'pääohjaaja',
            PAATTYMISAIKA: thesisData.councilMeeting
        })
}

const updateGradingRow = async (trx, thesisRow, mainGraderId) => {
    const gradingRow = await trx('TARKASTUS')
        .where('GRADUTUNNUS', thesisRow.TUNNUS)
        .andWhere('VAIHE', 'gradu')
        .first()

    if (!gradingRow) {
        const gradingId = await getIdFromSequence(trx, 'OTUNNUS')

        await trx('TARKASTUS')
            .insert({
                TTUNNUS: gradingId[0].NEXTVAL,
                GRADUTUNNUS: thesisRow.GRADUTUNNUS,
                KIRJAAJA: mainGraderId,
                VAIHE: 'gradu',
                JATETTY_PVM: new Date(),
                TARKASTETTU_PVM: new Date(),
                TULOS: thesisRow.ARVOSANA
            })
    }
}

const getThesisRow = async (trx, thesisData) => {
    const thesisFromOldDb = await trx('GRADU')
        .where('TEKIJA', thesisData.author.studentNumber)
        .first()

    if (!thesisFromOldDb) {
        await insertNewThesisToDB(trx, thesisData)

        return trx('GRADU')
            .where('TEKIJA', thesisData.author.studentNumber)
            .first()
    }

    return thesisFromOldDb
}

const insertNewThesisToDB = async (trx, thesisData) => {
    const thesisId = await getIdFromSequence(trx, 'GTUNNUS')
    const thesisRow = {
        TUNNUS: thesisId[0].NEXTVAL,
        TEKIJA: thesisData.author.studentNumber,
        OTSAKE: thesisData.thesisTitle,
        TILA: '12. hyväksytty',
        KIRJAUSPVM: thesisData.councilMeeting
    }

    await trx('GRADU').insert(thesisRow)
}
