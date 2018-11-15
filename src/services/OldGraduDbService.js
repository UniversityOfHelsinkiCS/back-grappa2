const Promise = require('bluebird')

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
        graders,
        studyfield: agreement.studyfieldId
    }
}

module.exports.exportThesisToOldDb = async (thesisIds) => {
    const dataToExport = await getDataToExport(thesisIds)
    await exportThesisData(dataToExport[0])
}

const getDataToExport = async (thesisIds) => {
    const agreements = await agreementsToExport(thesisIds)
    const dataToExport = await Promise.map(agreements, getThesisDataToExport)

    return dataToExport
}

const exportThesisData = async (thesisData) => {
    try {
        const trx = await createTransaction()
        const thesisRow = await getThesisRow(trx, thesisData)
        const mainGrader = await getPersonId(trx, thesisData.graders[0])

        await updateIfMissing(trx, 'ARVOSANA', thesisRow, GRADE_MAP[thesisData.grade] || thesisData.grade)
        await updateIfMissing(trx, 'VAHVISTUSPVM', thesisRow, thesisData.councilMeeting)
        await updateRow(trx, 'TILA', thesisRow, '12. hyväksytty')
        await updateIfMissing(trx, 'VAHVISTAJALINJA', thesisRow, getStudyfield(thesisData))
        await updateIfMissing(trx, 'VALMISTELIJA', thesisRow, mainGrader)
        await updateIfMissing(trx, 'VAHVISTAJA', thesisRow, mainGrader)

        await trx.commit()
    } catch (err) {
        console.log(err)
    }
}

const updateRow = (trx, field, thesisRow, value) => {
    const update = {}
    update[field] = value

    return trx('GRADU.GRADU')
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
    const dbPerson = await trx('GRADU.OHJAAJA')
        .where('SUKUNIMI', person.lastname)
        .andWhere('ETUNIMI', person.firstname)
        .first()

    if (dbPerson) {
        return dbPerson.KTUNNUS
    }

    return insertPerson(trx, person)
}

const insertPerson = async (trx, person) => {
    const personId = await trx.raw('select GRADU.OTUNNUS.NEXTVAL from dual')

    await trx('GRADU.OHJAAJA')
        .insert({
            KTUNNUS: personId[0].NEXTVAL,
            SUKUNIMI: person.lastname,
            ETUNIMI: person.firstname
        })

    return personId[0].NEXTVAL
}

const getThesisRow = async (trx, thesisData) => {
    const thesisFromOldDb = await trx('GRADU.GRADU')
        .where('TEKIJA', thesisData.author.studentNumber)
        .first()

    if (!thesisFromOldDb) {
        await insertNewThesisToDB(trx, thesisData)

        return trx('GRADU.GRADU')
            .where('TEKIJA', thesisData.author.studentNumber)
            .first()
    }

    return thesisFromOldDb
}

const insertNewThesisToDB = async (trx, thesisData) => {
    const thesisId = await trx.raw('select GRADU.GTUNNUS.NEXTVAL from dual')
    const thesisRow = {
        TUNNUS: thesisId[0].NEXTVAL,
        TEKIJA: thesisData.author.studentNumber,
        OTSAKE: thesisData.thesisTitle,
        TILA: '12. hyväksytty',
        KIRJAUSPVM: thesisData.councilMeeting
    }

    await trx('GRADU.GRADU').insert(thesisRow)
}
