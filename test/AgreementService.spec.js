import test from 'ava';
import sinon from 'sinon';
const knex = require('../connection');

const agreementService = require('../src/services/AgreementService');
const mockAgreements = require('../src/mockdata/MockAgreements');
const mockPrevAgreements = require('../src/mockdata/MockPrevAgreements');

test.before(async t => {
    await knex.schema.createTable('agreement', function (table) {
        table.increments('agreementId').primary();
        table.integer('authorId').unsigned();
        table.foreign('authorId').references('person.personId');
        table.integer('thesisId').unsigned();
        table.foreign('thesisId').references('thesis.thesisId');
        table.integer('responsibleSupervisorId').unsigned();
        table.foreign('responsibleSupervisorId').references('personRoleField.personRoleId');
        table.integer('studyFieldId').unsigned();
        table.foreign('studyFieldId').references('studyfield.studyfieldId');
        table.boolean('fake');
        table.integer('studentGradeGoal');
        table.string('studentWorkTime');
        table.string('supervisorWorkTime');
        table.string('intermediateGoal');
        table.string('meetingAgreement');
        table.string('other');
    });
    await knex.schema.createTable('previousagreements', function (table) {
        table.integer('agreementId');
        table.foreign('agreementId').references('agreement.agreementId')
        table.integer('previousAgreementId');
        table.foreign('previousAgreementId').references('agreement.agreementId')
        table.primary(['agreementId', 'previousAgreementId']);
    });
});

test.beforeEach(async t => {
    //knex.schema.dropTableIfExists('agreement');
    //let temp = knex.raw('SELECT * FROM agreement');
    await knex('agreement').del();
    await knex('agreement').insert(mockAgreements);
    await knex('previousagreements').del();
    await knex('previousagreements').insert(mockPrevAgreements);
});

test.serial('getAllAgreements returns list of right length ', async t => {
    let listOfAgreements = await agreementService.getAllAgreements();
    t.deepEqual(listOfAgreements.length, mockAgreements.length);
});

// test.serial('AgreementService returns an agreement by id correctly', async t => {
//     let id = '1';
//     let returnValue = await agreementService.getAgreementById(id);
//     console.log('returned' + returnValue);
//     let mockAgreement;
//     mockAgreements.map(agreement => {
//         if (agreement.agreementId === 1 || agreement.agreementId === '1') {
//             mockAgreement = agreement;
//         }
//     })
//     console.log('mock' + mockAgreement.agreementId);
// });

test.serial('saves previousAgreement and returns Id', async t => {
    const prevData = {
        agreementId: 2,
        previousAgreementId: 1
    };
    let agreementId = await agreementService.savePrevious(prevData);
    t.deepEqual(agreementId, prevData.agreementId);
});

test.serial('updateAgreement', async t => {
    const updatedAgreement = {
        agreementId: 1,
        authorId: 1,
        thesisId: 1,
        studyFieldId: 1,
        other: 'this agreement is updated'
    };
    let response = await agreementService.updateAgreement(updatedAgreement);
    t.deepEqual(response, undefined);
});

test.serial('saveNewAgreement call returns agreementId = 4', async t => {
    const testData = {
        authorId: 1,
        thesisId: 1,
        responsibleSupervisorId: 1,
        studyFieldId: 1,
        fake: 0
    };


    var temp = await agreementService.saveNewAgreement(testData);
    //console.log(temp);
    t.truthy(temp == 4);
    /*
    await knex('agreement')
    .returning('agreementId')
    .insert(testData)
    .then((agreementId) => {
        console.log( {text: 'New agreement saved to backend', agreementId: agreementId[0]});
        t.truthy(agreementId[0]==3)
      });
      */

});
