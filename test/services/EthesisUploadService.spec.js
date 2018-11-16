const test = require('ava')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const sinon = require('sinon')
const { ETHESIS_BASE_URL } = require('../../src/util/config')
const { sendThesisToEthesis } = require('../../src/services/EthesisUploadService')
const ethesisMetadataService = require('../../src/services/EthesisMetadataService')
const { generateTestEthesisMetadata } = require('../utils')

const mock = new MockAdapter(axios)

const TEST_METADATA = {
    thesisTitle: 'the awesome thesis',
    thesisSubject: 'test subject',
    author: 'awesome author',
    abstract: { en: 'english abstract', fi: 'finnish abstract' }
}

const TEST_PDF_PATH = './data/file/example_thesis.pdf'

const mockUploadThesis = (response, status = 200) => {
    mock.onPost(`${ETHESIS_BASE_URL}/ethesis-sword/deposit/123456789/13`)
        .reply(status, response)
}
test.before(async () => {
    const expectedXml = generateTestEthesisMetadata()
    sinon.stub(ethesisMetadataService, 'generateMetadataXml').returns(expectedXml)
})

test.beforeEach(() => {
    mock.reset()
})

test.serial('uploads thesis succesfully', async (t) => {
    //mockUploadThesis()
    sendThesisToEthesis(TEST_METADATA, TEST_PDF_PATH)
})
