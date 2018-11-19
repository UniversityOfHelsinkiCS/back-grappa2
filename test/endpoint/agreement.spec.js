import test from 'ava'

process.env.DB_SCHEMA = 'agreement_test'

const { initDb, makeTestApp } = require('../utils')

const request = require('supertest')
const agreement = require('../../src/routes/agreements')

const makeApp = async userId => makeTestApp('/agreements', userId, agreement)

test.before(async () => {
    await initDb()
})

test('agreements get should also return attachments', async (t) => {
    t.plan(3)
    const res = await request(await makeApp(10))
        .get('/agreements')
    t.is(res.status, 200)
    const { agreements, attachments } = res.body
    t.is(agreements.length, 1)
    t.is(attachments.length, 1)
})

const assertStudiesComplete = async (t, app, expected) => {
    const res = await request(app).get('/agreements')
    const { agreements } = res.body
    const testAgreement = agreements[0]

    t.is(testAgreement.studiesComplete, expected)

    return testAgreement
}

test('student can mark studies as completed', async (t) => {
    t.plan(3)
    const app = await makeApp(10)
    const testAgreement = await assertStudiesComplete(t, app, false)

    testAgreement.studiesComplete = true

    const updateResponse = await request(app)
        .put(`/agreements/${testAgreement.agreementId}`)
        .send({ studiesComplete: true })

    t.is(updateResponse.status, 204)

    await assertStudiesComplete(t, app, true)
})
