const test = require('ava')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const sinon = require('sinon')
const fs = require('fs')
const { ETHESIS_BASE_URL } = require('../../src/util/config')
const { checkAndUploadPendingTheses } = require('../../src/services/EthesisUploadService')
const thesisService = require('../../src/services/ThesisService')
const agreementService = require('../../src/services/AgreementService')
const ethesisMetadataService = require('../../src/services/EthesisMetadataService')
const {
    generateTestEthesisMetadataXml,
    TEST_THESIS_ID,
    TEST_THESIS_TITLE,
    TEST_STUDYFIELD,
    TEST_FACULTY,
    TEST_NEW_DEGREE_PROGRAM,
    TEST_THESIS_FILE_NAME
} = require('../utils')

const mock = new MockAdapter(axios)
const sandbox = sinon.createSandbox()

const TEST_THESIS_LIST = [
    { thesisId: TEST_THESIS_ID, title: TEST_THESIS_TITLE }
]

const TEST_THESIS_METADATA = [
    {
        thesisId: TEST_THESIS_ID,
        firstname: 'test',
        lastname: 'student',
        studyfield: TEST_STUDYFIELD,
        programme: TEST_NEW_DEGREE_PROGRAM,
        faculty: TEST_FACULTY,
        filename: TEST_THESIS_FILE_NAME
    }
]

const stubUploadThesis = (response, status = 200) => {
    mock.onPost(`${ETHESIS_BASE_URL}/ethesis-sword/deposit/123456789/13`)
        .reply(status, response)
}

const stubGetThesisMetadataByIds = (result) => {
    sandbox.stub(agreementService, 'getThesisMetadataByIds')
        .returns(result)
}

const stubGetPendingEthesisUploads = (result) => {
    sandbox.stub(thesisService, 'getPendingEthesisUploads')
        .returns(result)
}

const stubGenerateEthesisMetadataXml = () => {
    const expectedXml = generateTestEthesisMetadataXml()
    sandbox.stub(ethesisMetadataService, 'generateMetadataXml')
        .returns(expectedXml)
}

const stubThesisFileRead = () => {
    sandbox.stub(fs, 'readFileSync').returns('fakeContent')
}

test.beforeEach(() => {
    mock.reset()
})

test.afterEach(() => {
    sandbox.restore()
})

test.serial('that setSentToEthesis is called with thesis id after successful uploadThesis call', async (t) => {
    stubGetPendingEthesisUploads(TEST_THESIS_LIST)
    stubGetThesisMetadataByIds(TEST_THESIS_METADATA)
    stubGenerateEthesisMetadataXml()
    stubUploadThesis('response')
    stubThesisFileRead()
    sandbox.stub(thesisService, 'setSentToEthesis')

    await checkAndUploadPendingTheses()

    const callArgs = thesisService.setSentToEthesis.getCall(0).args[0]

    t.is(callArgs, TEST_THESIS_ID)
})

test.serial('that setSentToEthesis is not called after unsuccessful uploadThesis call', async (t) => {
    stubGetPendingEthesisUploads(TEST_THESIS_LIST)
    stubGetThesisMetadataByIds(TEST_THESIS_METADATA)
    stubGenerateEthesisMetadataXml()
    stubUploadThesis('error', 500)
    const spy = sandbox.spy(thesisService, 'setSentToEthesis')

    await checkAndUploadPendingTheses()

    t.is(spy.callCount, 0)
})

test.serial('that generateMetadataXml is not called with non-existing thesis file', async (t) => {
    stubGetPendingEthesisUploads(TEST_THESIS_LIST)
    stubGetThesisMetadataByIds(TEST_THESIS_METADATA)
    sandbox.stub(fs, 'readFileSync').throws(new Error('file not found'))
    const spy = sandbox.spy(ethesisMetadataService, 'generateMetadataXml')

    await checkAndUploadPendingTheses()

    t.is(spy.callCount, 0)
})


test.serial('that generateMetadataXml is called with proper metadata for thesis with one author', async (t) => {
    stubGetPendingEthesisUploads(TEST_THESIS_LIST)
    stubGetThesisMetadataByIds(TEST_THESIS_METADATA)
    stubGenerateEthesisMetadataXml()
    stubUploadThesis('response')
    stubThesisFileRead()
    sandbox.stub(thesisService, 'setSentToEthesis')
    await checkAndUploadPendingTheses()

    const expectedArgs = Object.assign({}, TEST_THESIS_METADATA[0],
        {
            author: 'student, test',
            title: TEST_THESIS_TITLE })

    const callArgs = ethesisMetadataService.generateMetadataXml.getCall(0).args[0]

    t.deepEqual(expectedArgs, callArgs)
})

test.serial('that generateMetadataXml is called with proper metadata for thesis with two authors', async (t) => {
    const secondMetadata = {
        thesisId: TEST_THESIS_ID,
        firstname: 'second',
        lastname: 'student',
        studyfield: TEST_STUDYFIELD,
        programme: TEST_NEW_DEGREE_PROGRAM,
        faculty: TEST_FACULTY,
        filename: TEST_THESIS_FILE_NAME
    }
    const metadataWithTwoAuthors = [...TEST_THESIS_METADATA, secondMetadata]
    stubGetPendingEthesisUploads(TEST_THESIS_LIST)
    stubGetThesisMetadataByIds(metadataWithTwoAuthors)
    stubGenerateEthesisMetadataXml()
    stubUploadThesis('response')
    stubThesisFileRead()
    sandbox.stub(thesisService, 'setSentToEthesis')
    await checkAndUploadPendingTheses()

    const expectedArgs = Object.assign({}, TEST_THESIS_METADATA[0],
        {
            author: 'student, test|student, second',
            title: TEST_THESIS_TITLE })

    const callArgs = ethesisMetadataService.generateMetadataXml.getCall(0).args[0]

    t.deepEqual(expectedArgs, callArgs)
})

