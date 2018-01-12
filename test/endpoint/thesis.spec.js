import test from 'ava';
import sinon from 'sinon';
import { createPerson } from '../utils';

const request = require('supertest');
const express = require('express');
const theses = require('../../src/routes/theses');
const knex = require('../../src/db/connection');

const makeApp = (userId) => {
    const app = express();
    app.use('/theses', (req, res, next) => {
        req.session = {};
        req.session.user_id = userId;
        next();
    }, theses);
    return app;
};

test.before(async t => {
    await knex.migrate.latest();
    await knex.seed.run();
});

const thesisForm = {
    id: undefined,
    authorFirstname: 'Etunimi',
    authorLastname: 'Sukunimi',
    authorEmail: 'Email',
    title: 'Annin Grady',
    urkund: 'https://',
    grade: '4',
    graders: [{
        address: 'Intiankatu',
        email: 'thomas@tarkastaja.com',
        firstname: 'Thomas',
        isRetired: 0,
        lastname: 'CS-Tarkastaja',
        major: 'mathematics',
        personId: 5,
        phone: '050 1234567',
        shibbolethId: 'thomastarkastajashibboId',
        studentNumber: '876548321',
        title: ''
    }],
    graderEval: 'Tarkastajien esittely',
    studyfieldId: 2,
    councilmeetingId: 1,
    printDone: false,
    thesisEmails: {
        graderEvalReminder: 3,
        printReminder: 2
    }
};

const thesisWithId = {
    councilmeetingId: 1,
    title: 'Annin Grady',
    urkund: 'https://',
    grade: '4',
    graderEval: 'Tarkastajien esittely',
    printDone: 0
};

const person = {
    shibbolethId: null,
    firstname: 'Etunimi',
    lastname: 'Sukunimi',
    email: 'Email',
    title: null,
    isRetired: null,
    studentNumber: null,
    address: null,
    phone: null,
    major: null
};

const fakeAgreement = {
    responsibleSupervisorId: null,
    studyfieldId: thesisForm.studyfieldId,
    fake: 1,
    startDate: null,
    completionEta: null,
    performancePlace: null,
    studentGradeGoal: null,
    studentWorkTime: null,
    supervisorWorkTime: null,
    intermediateGoal: null,
    meetingAgreement: null,
    other: null,
    whoNext: null
};

test('thesisForm post & creates id without attachment', async t => {
    t.plan(6);
    const res = await request(makeApp(1))
        .post('/theses')
        .field('json', JSON.stringify(thesisForm));
    t.is(res.status, 200);
    let thesis = res.body.thesis;
    let author = res.body.author;
    let agreement = res.body.agreement;
    // Check the linking is right
    t.is(thesis.thesisId, agreement.thesisId);
    t.is(agreement.authorId, author.personId);
    delete thesis.thesisId;
    delete author.personId;
    delete agreement.agreementId;
    delete agreement.thesisId;
    delete agreement.authorId;
    // Check the contents are right
    t.deepEqual(thesis, thesisWithId, 'Thesis is correct');
    t.deepEqual(author, person, 'Author person is correct');
    t.deepEqual(agreement, fakeAgreement, 'Agreement is correct');
});

test.skip('thesis get all', async t => {
    t.plan(2);
    const app = makeApp(1);
    const res = await request(app)
        .get('/theses');
    t.is(res.status, 200);
    const theses = res.body;
    t.is(theses.length, 4); // TODO: Fix this, fails if this spec file is run alone
});

const attachment = {
    filename: null, // Saving to memory has no filename
    mimetype: 'application/octet-stream',
    savedOnDisk: 1,
    label: 'otherFile',
    originalname: 'LICENSE'
};

test('thesisForm post & creates id with attachment', async t => {
    t.plan(8);
    const res = await request(makeApp(1))
        .post('/theses')
        .field('json', JSON.stringify(thesisForm))
        .attach('otherFile', './LICENSE');
    t.is(res.status, 200);
    let thesis = res.body.thesis;
    let author = res.body.author;
    let agreement = res.body.agreement;
    let attachments = res.body.attachments;
    // Check the linking is right
    t.is(thesis.thesisId, agreement.thesisId);
    t.is(agreement.authorId, author.personId);
    t.is(attachments[0].agreementId, agreement.agreementId);
    delete thesis.thesisId;
    delete author.personId;
    delete attachments[0].attachmentId;
    delete agreement.agreementId;

    delete agreement.thesisId;
    delete agreement.authorId;
    delete attachments[0].agreementId;
    // Check the contents are right
    t.deepEqual(thesis, thesisWithId, 'Thesis is correct');
    t.deepEqual(author, person, 'Author person is correct');
    t.deepEqual(agreement, fakeAgreement, 'Agreement is correct');
    t.deepEqual(attachments[0], attachment, 'Attachments are correct');
});

test('thesisForm post sends emails', async t => {
    const mailer = require('../../src/util/mailer');
    const mailSpy = sinon.spy(mailer, 'sendEmail');
    const form = Object.assign({}, thesisForm);

    form.authorEmail = 'emailTest@example.com';
    form.studyfieldId = 1;

    await request(makeApp(1))
        .post('/theses')
        .field('json', JSON.stringify(form));

    t.true(mailSpy.calledWith(form.authorEmail));
    t.true(mailSpy.calledWith('victoria@vastuuproffa.com'));
    t.true(mailSpy.calledWith('erkki@erikoistapaus.com'));
});

test('author can see own thesis', async t => {
    const title = 'My own thesis';
    const personId = await createPerson();
    const thesis = await knex('thesis').insert({ title }).returning('theisId');
    await knex('agreement').insert({ authorId: personId, thesisId: thesis[0] }).returning('agreementId');

    const res = await request(makeApp(personId)).get('/theses');

    t.is(res.body.length, 1);
    t.is(res.body[0].title, title);
});

test('grader can see thesis', async t => {
    const title = 'Thesis to grade';
    const personId = await createPerson();

    const role = await knex('personWithRole').insert({ personId, roleId: 5 }).returning('personRoleId');
    const thesis = await knex('thesis').insert({ title }).returning('theisId');
    const agreement = await knex('agreement').insert({ thesisId: thesis[0] }).returning('agreementId');
    await knex('agreementPerson').insert({ agreementId: agreement[0], personRoleId: role[0] });

    const res = await request(makeApp(personId)).get('/theses');

    t.is(res.body.length, 1);
    t.is(res.body[0].title, title);
});
