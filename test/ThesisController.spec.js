import test from 'ava';
import sinon from 'sinon';

import router from '../src/routes/theses.js';
import app from '../index';

const reqres = require('reqres');
const request = require('supertest');

let req;
let res;
let thesisController;
let service;

test.beforeEach(async t => {
    req = reqres.req();
    res = reqres.res();
    service = require('../src/services/ThesisService');
    thesisController = require('../src/controllers/ThesisController');
});


test.cb('getThesisById', t => {
    const stub = sinon.stub(service, "getThesisById");
    req.params.id = 123;
    stub.returns({ test: "xoxo" });
    stub.withArgs(req.params.id).returns({ test: "ok" });
    thesisController.service = service;
    thesisController.getThesisById(req, res)
        .then(() => {
            t.is(stub.calledOnce, true, "thesisById is called once");
            t.is(stub.calledWith(req.params.id), true, "thesisById is called with correct id");
            t.is(res.status.calledWith(200), true, "thesisById returns status 200");
            t.is(res.json.calledWith({ test: "ok" }), true, "thesisById returns correct information");
            t.end();
        });
    service.getThesisById.restore();
});

test.cb('getAllTheses returns correct information', t => {
    const stub = sinon.stub(service, "getAllTheses");
    stub.returns({ test: "xoxo" });
    thesisController.service = service;
    thesisController.getAllTheses(req, res)
        .then(() => {
            t.is(stub.calledOnce, true, "getAllTheses is called once");
            t.is(res.status.calledWith(200), true, "getAllTheses returns status 200");
            t.is(res.json.calledWith({ test: "xoxo" }), true, "getAllTheses returns correct information");
            t.end();
        });
    service.getAllTheses.restore();
});

test.cb.only('saveAgreement returns 500 if there no database ', t => {
    const body ={
        thesisTitle: 'Annin Grady',
        urkund: 'http://',
        grade: 4,
        graderEval: 'Tarkastajien esittely',
        userId: 1
    };
    req.body = body;
    thesisController.saveThesis(req, res)
        .then(() => {
            console.log("RES THEN" + JSON.stringify(res));
            t.is(res.status.calledWith(500), true, "saveThesis returns status 500 if no database");
            t.end();
        });
});

test('when agreement is send to route, and body is correct, status is 200', async t => {
    const body ={
        title: 'Annin Grady',
        urkund: 'http://',
        grade: 4,
        graderEval: 'Tarkastajien esittely',
        userId: 1
    };
    req.body = body;

    const res = await request(app)
    .post('/theses', req)
    .send();

    t.is(res.status, 200);
});
