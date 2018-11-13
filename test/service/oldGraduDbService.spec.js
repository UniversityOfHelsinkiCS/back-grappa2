const test = require('ava')

process.env.DB_SCHEMA = 'thesis_test'

const { initDb } = require('../utils')
const OldGraduDbService = require('../../src/services/OldGraduDbService')

test.before(async () => {
    await initDb()
})

test('Fetch agreements for theses', async (t) => {
    const agreements = await OldGraduDbService.exportThesisToOldDb([2])

    console.log(agreements)
    t.is(agreements.length, 1)
})
