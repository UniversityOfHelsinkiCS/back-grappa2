const test = require('ava')
const oracleKnex = require('../../src/db/connection').getOracleKnex()

process.env.DB_SCHEMA = 'thesis_test'

const { initDb } = require('../utils')
const OldGraduDbService = require('../../src/services/OldGraduDbService')

test.before(async () => {
    await initDb()
    await oracleKnex('GRADU').where('OTSAKE', 'Hieno Gradu').delete()
    await oracleKnex('OHJAAJA').where('SUKUNIMI', 'CS-Hallinto').delete()
})

const thesisCount = () => oracleKnex('GRADU').count().first()

test('Export thesis that has no information on old system', async (t) => {
    const thesisRowsBefore = await thesisCount()

    await OldGraduDbService.exportThesisToOldDb([2])

    const thesisRowsAfter = await thesisCount()
    const person = await oracleKnex('OHJAAJA').where('SUKUNIMI', 'CS-Hallinto').first()

    t.is(thesisRowsAfter['COUNT(*)'], thesisRowsBefore['COUNT(*)'] + 1)
    t.not(person, undefined)
})
