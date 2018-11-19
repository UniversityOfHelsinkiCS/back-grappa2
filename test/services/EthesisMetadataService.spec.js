const test = require('ava')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')
const { URN_GENERATOR_ADDRESS } = require('../../src/util/config')
const { generateMetadataXml } = require('../../src/services/EthesisMetadataService')

const mock = new MockAdapter(axios)
const {
    generateTestEthesisMetadata,
    TEST_THESIS_FILE_NAME,
    TEST_THESIS_STUDYFIELD,
    TEST_THESIS_AUTHOR,
    TEST_THESIS_TITLE,
    OLD_DEGREE_PROGRAM,
    NEW_DEGREE_PROGRAM
} = require('../utils')

// title, author, URN, studyfield, programme
const TEST_URN = 'testUrn'

const getTestMetadata = (isOldDegreeProgram = false) => ({
    title: TEST_THESIS_TITLE,
    author: TEST_THESIS_AUTHOR,
    filename: TEST_THESIS_FILE_NAME,
    studyfield: TEST_THESIS_STUDYFIELD,
    programme: isOldDegreeProgram ? OLD_DEGREE_PROGRAM : NEW_DEGREE_PROGRAM
})


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

test.serial('returns properly formatted metadata xml with new degree program', async (t) => {
    mockGetMetadataUrn(TEST_URN)

    const metadata = getTestMetadata()
    const generatedMetadata = await generateMetadataXml(metadata, TEST_THESIS_FILE_NAME)
    const expectedXml = generateTestEthesisMetadata()

    t.is(generatedMetadata, expectedXml)
})

test.serial('returns properly formatted metadata xml with old degree program', async (t) => {
    mockGetMetadataUrn(TEST_URN)

    const isOldDegreeProgram = true
    const metadata = getTestMetadata(isOldDegreeProgram)
    const generatedMetadata = await generateMetadataXml(metadata, TEST_THESIS_FILE_NAME)
    const expectedXml = generateTestEthesisMetadata(isOldDegreeProgram)

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

    const metadata = getTestMetadata()
    const resultError = await t.throws(generateMetadataXml(metadata, TEST_THESIS_FILE_NAME))

    t.deepEqual(resultError, expectedError)
})

test.serial('throws error on 500 error response on urn generator call', async (t) => {
    const expectedErrorStatus = 500
    mockGetMetadataUrn(TEST_URN, expectedErrorStatus)

    const metadata = getTestMetadata()
    const resultError = await t.throws(generateMetadataXml(metadata, TEST_THESIS_FILE_NAME))

    t.is(resultError.status, expectedErrorStatus)
})
