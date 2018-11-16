const test = require('ava')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { URN_GENERATOR_ADDRESS } = require('../../src/util/config')
const { generateMetadataXml } = require('../../src/services/EthesisMetadataService')

const mock = new MockAdapter(axios)
const { generateTestEthesisMetadata, TEST_THESIS_NAME } = require('../utils')

const TEST_METADATA = {
    thesisTitle: 'the awesome thesis',
    thesisSubject: 'test subject',
    author: 'awesome author',
    abstract: { en: 'english abstract', fi: 'finnish abstract' }
}

const TEST_URN = 'testUrn'

const mockGetMetadataUrn = (response, status = 200) => {
    mock.onGet(URN_GENERATOR_ADDRESS, {
        params: {
            type: 'nbn',
            subnamespace: 'hulib'
        }
    }).reply(status, response)
}

test.beforeEach(() => {
    mock.reset()
})

test.serial('returns properly formatted metadata xml', async (t) => {
    mockGetMetadataUrn(TEST_URN)

    const generatedMetadata = await generateMetadataXml(TEST_METADATA, TEST_THESIS_NAME)
    const expectedXml = generateTestEthesisMetadata()

    t.is(generatedMetadata, expectedXml)
})

test.serial('throws error on urn generator call from non whitelisted ip', async (t) => {
    const urnGeneratorEmbeddedError = 'ERROR: non whitelisted ip xx.xx.xx.xx'
    mockGetMetadataUrn(urnGeneratorEmbeddedError)

    const expectedError = {
        status: 200,
        data: urnGeneratorEmbeddedError,
        embeddedError: true
    }

    const resultError = await t.throws(generateMetadataXml(TEST_METADATA, TEST_THESIS_NAME))

    t.deepEqual(resultError, expectedError)
})

test.serial('throws error on 500 error response on urn generator call', async (t) => {
    const expectedErrorStatus = 500
    mockGetMetadataUrn(TEST_URN, expectedErrorStatus)

    const resultError = await t.throws(generateMetadataXml(TEST_METADATA, TEST_THESIS_NAME))

    t.is(resultError.status, expectedErrorStatus)
})
