const logger = require('../util/logger')

const xml = require('xmlbuilder')
const axios = require('axios')

const { axiosErrorHandler } = require('../util/axiosErrorHandler')
const { URN_GENERATOR_ADDRESS } = require('../util/config')

const CLIENT_NAME = 'Grappa 2.0'
const THESIS_TYPE = 'master\'s thesis'
const DEFAULT_THESIS_LANG = 'English'
const OLD_PROGRAM_NAME_PREFIX = 'Department'

const metadataSchemaTypes = {
    DC: 'dc',
    DCT: 'dct',
    ETHESIS: 'ethesis'
}

const metadataElementTypes = {
    TITLE: 'title',
    IDENTIFIER: 'identifier',
    CREATOR: 'creator',
    ISSUED: 'issued',
    LANGUAGE: 'language',
    THESIS_TYPE: 'thesistype',
    DISCIPLINE: 'discipline',
    FACULTY: 'faculty',
    DEGREE_PROGRAM: 'degreeprogram',
    STUDY_FIELD: 'facultystudyline',
    DEGREE_PROGRAM_TYPE: 'hasdegreeprograms'
}

const degreeProgramTypes = {
    NEW: 'U',
    OLD: 'V'
}

const metadataLangTypes = {
    FI: 'fi',
    EN: 'en',
    SV: 'sv',
    UND: 'und'
}

const metadataQualifierTypes = {
    URN: 'urn'
}

const checkForUrnGeneratorErrors = (response) => {
    const { data, status } = response
    const errorResponsePrefix = 'ERROR'
    if (data && data.startsWith(errorResponsePrefix)) {
        const embededError = {
            status,
            data,
            embeddedError: true
        }
        logger.error(`Fetching urn from ${URN_GENERATOR_ADDRESS} failed: ${data}`)
        throw embededError
    }
}

const getMetadataUrn = async () => {
    const type = 'nbn'
    const subnamespace = 'hulib'
    try {
        const response = await axios.get(
            URN_GENERATOR_ADDRESS, {
                params: {
                    type,
                    subnamespace
                }
            })
        checkForUrnGeneratorErrors(response)
        return response.data
    } catch (err) {
        throw err.embeddedError ? err : axiosErrorHandler(err, URN_GENERATOR_ADDRESS)
    }
}

const generateMetadataXmlDataFields = (metadata) => {
    const getMetadataField = (schema, element, text, lang, qualifier) => {
        const field = {
            '@mdschema': schema,
            '@element': element,
            '#text': text
        }
        if (lang) {
            field['@lang'] = lang
        }
        if (qualifier) {
            field['@qualifier'] = qualifier
        }
        return field
    }

    const getDctMetadataField = (element, text, lang, qualifier) =>
        getMetadataField(metadataSchemaTypes.DCT, element, text, lang, qualifier)

    const getEthesisMetadataField = (element, text, lang, qualifier) =>
        getMetadataField(metadataSchemaTypes.ETHESIS, element, text, lang, qualifier)

    const currentYear = new Date().getFullYear()
    const thesisLang = metadata.thesisLang || DEFAULT_THESIS_LANG

    const { title, author, URN, studyfield, programme } = metadata

    const isOldDegreeProgram = programme.includes(OLD_PROGRAM_NAME_PREFIX)
    const degreeProgramType = isOldDegreeProgram ? degreeProgramTypes.OLD : degreeProgramTypes.NEW

    return {
        '@xmlns:dim': 'http://www.dspace.org/xmlns/dspace/dim',
        'dim:field': [
            getMetadataField(metadataSchemaTypes.DC, metadataElementTypes.TITLE, title),
            getDctMetadataField(metadataElementTypes.IDENTIFIER, URN, null, metadataQualifierTypes.URN),
            getDctMetadataField(metadataElementTypes.CREATOR, author),
            getDctMetadataField(metadataElementTypes.ISSUED, currentYear),
            getEthesisMetadataField(metadataElementTypes.LANGUAGE, thesisLang, metadataLangTypes.EN),
            getEthesisMetadataField(metadataElementTypes.THESIS_TYPE, THESIS_TYPE, metadataLangTypes.EN),
            getEthesisMetadataField(metadataElementTypes.DISCIPLINE, programme, metadataLangTypes.EN),
            getEthesisMetadataField(metadataElementTypes.STUDY_FIELD, studyfield, metadataLangTypes.EN),
            getEthesisMetadataField(metadataElementTypes.DEGREE_PROGRAM, programme, metadataLangTypes.EN),
            getEthesisMetadataField(metadataElementTypes.DEGREE_PROGRAM_TYPE, degreeProgramType, metadataLangTypes.UND)
        ]
    }
}

const generateMetadataXml = async (metadata) => {
    const { filename } = metadata
    let URN
    try {
        URN = await getMetadataUrn()
    } catch (err) {
        throw err
    }

    const metaDataWithUrn = Object.assign({}, metadata, { URN })

    const mets = {
        '@ID': 'sort-mets_mets',
        '@OBJID': 'sword-mets',
        '@LABEL': 'DSpace SWORD Item',
        '@PROFILE': 'DSpace METS SIP Profile 1.0',
        '@xmlns': 'http://www.loc.gov/METS/',
        '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
        '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@xsi:schemaLocation': 'http://www.loc.gov/METS/ http://www.loc.gov/standards/mets/mets.xsd',
        metsHdr: {
            '@CREATEDATE': '2007-09-01T00:00:00',
            agent: {
                '@ROLE': 'CUSTODIAN',
                '@TYPE': 'ORGANIZATION',
                name: {
                    '#text': CLIENT_NAME
                }
            }
        },
        dmdSec: {
            '@ID': 'sword-mets-dmd-1',
            '@GROUPID': 'sword-mets-dmd-1_group-1',
            mdWrap: {
                '@LABEL': 'Metadata',
                '@MDTYPE': 'OTHER',
                '@OTHERMDTYPE': 'dim',
                '@MIMETYPE': 'text/xml',
                xmlData: generateMetadataXmlDataFields(metaDataWithUrn)
            }
        },
        fileSec: {
            fileGrp: {
                '@ID': 'sword-mets-fgrp-1',
                '@USE': 'CONTENT',
                file: {
                    '@GROUPID': 'sword-mets-fgid-0',
                    '@ID': 'sword-mets-file-1',
                    '@MIMETYPE': 'application/pdf',
                    FLocat: {
                        '@LOCTYPE': 'URL',
                        '@xlink:href': filename
                    }
                }
            }
        },
        structMap: {
            '@ID': 'sword-mets-struct-1',
            '@LABEL': 'structure',
            '@TYPE': 'LOGICAL',
            div: {
                '@ID': 'sword-mets-div-1',
                '@DMDID': 'sword-mets-dmd-1',
                '@TYPE': 'SWORD Object',
                div: {
                    '@ID': 'sword-mets-div-2',
                    '@TYPE': 'File',
                    fptr: {
                        '@FILEID': 'sword-mets-file-1'
                    }
                }
            }
        }
    }

    return xml.create(
        { mets },
        { version: '1.0', encoding: 'UTF-8', standalone: false }).end({ pretty: true })
}

module.exports = {
    generateMetadataXml
}
