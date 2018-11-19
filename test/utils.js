const knex = require('../src/db/connection')
const jwt = require('jsonwebtoken')
const config = require('../src/util/config')
const errorHandler = require('../src/util/errorHandler')
const express = require('express')
const auth = require('../src/middleware/auth')

export const TEST_THESIS_TITLE = 'example thesis'
export const TEST_THESIS_FILE_NAME = 'example_thesis.pdf'
export const TEST_THESIS_AUTHOR = 'test author'
export const TEST_THESIS_STUDYFIELD = 'Software Systems'
export const OLD_DEGREE_PROGRAM = 'Department of Computer Science'
export const NEW_DEGREE_PROGRAM = 'Master\'s Programme in Computer Science'
export const degreeProgramTypes = {
    OLD: 'V',
    NEW: 'U'
}

/* eslint-disable */
export const generateTestEthesisMetadata = (isOldDegreeProgram = false)  => {
    const currentYear = new Date().getFullYear()
    const degreeProgramType = isOldDegreeProgram ? degreeProgramTypes.OLD : degreeProgramTypes.NEW
    const programme = isOldDegreeProgram ? OLD_DEGREE_PROGRAM : NEW_DEGREE_PROGRAM

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<mets ID="sort-mets_mets" OBJID="sword-mets" LABEL="DSpace SWORD Item" PROFILE="DSpace METS SIP Profile 1.0" xmlns="http://www.loc.gov/METS/" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.loc.gov/METS/ http://www.loc.gov/standards/mets/mets.xsd">
  <metsHdr CREATEDATE="2007-09-01T00:00:00">
    <agent ROLE="CUSTODIAN" TYPE="ORGANIZATION">
      <name>Grappa 2.0</name>
    </agent>
  </metsHdr>
  <dmdSec ID="sword-mets-dmd-1" GROUPID="sword-mets-dmd-1_group-1">
    <mdWrap LABEL="Metadata" MDTYPE="OTHER" OTHERMDTYPE="dim" MIMETYPE="text/xml">
      <xmlData xmlns:dim="http://www.dspace.org/xmlns/dspace/dim">
        <dim:field mdschema="dc" element="title">${TEST_THESIS_TITLE}</dim:field>
        <dim:field mdschema="dct" element="identifier" qualifier="urn">testUrn</dim:field>
        <dim:field mdschema="dct" element="creator">${TEST_THESIS_AUTHOR}</dim:field>
        <dim:field mdschema="dct" element="issued">${currentYear}</dim:field>
        <dim:field mdschema="ethesis" element="language" lang="en">English</dim:field>
        <dim:field mdschema="ethesis" element="thesistype" lang="en">master's thesis</dim:field>
        <dim:field mdschema="ethesis" element="discipline" lang="en">${programme}</dim:field>
        <dim:field mdschema="ethesis" element="facultystudyline" lang="en">${TEST_THESIS_STUDYFIELD}</dim:field>
        <dim:field mdschema="ethesis" element="degreeprogram" lang="en">${programme}</dim:field>
        <dim:field mdschema="ethesis" element="hasdegreeprograms" lang="und">${degreeProgramType}</dim:field>
      </xmlData>
    </mdWrap>
  </dmdSec>
  <fileSec>
    <fileGrp ID="sword-mets-fgrp-1" USE="CONTENT">
      <file GROUPID="sword-mets-fgid-0" ID="sword-mets-file-1" MIMETYPE="application/pdf">
        <FLocat LOCTYPE="URL" xlink:href="${TEST_THESIS_FILE_NAME}"/>
      </file>
    </fileGrp>
  </fileSec>
  <structMap ID="sword-mets-struct-1" LABEL="structure" TYPE="LOGICAL">
    <div ID="sword-mets-div-1" DMDID="sword-mets-dmd-1" TYPE="SWORD Object">
      <div ID="sword-mets-div-2" TYPE="File">
        <fptr FILEID="sword-mets-file-1"/>
      </div>
    </div>
  </structMap>
</mets>`
}
/* eslint-enable */

export async function createPerson(email) {
    const person = {
        email,
        firstname: 'Olli O',
        lastname: 'Opiskelija',
        shibbolethId: email
    }
    const insert = await knex.getKnex()('person')
        .returning('personId')
        .insert(person)
    person.personId = insert[0]

    await knex.getKnex()('person').update({ shibbolethId: person.personId }).where('personId', person.personId)

    return person
}

export const deleteFromDb = async (connection) => {
    await connection('meetingProgramme').del()
    await connection('previousagreements').del()
    await connection('agreementDraftPerson').del()
    await connection('agreementDraft').del()
    await connection('notification').del()
    await connection('emailDraft').del()
    await connection('attachment').del()
    await connection('agreementPerson').del()
    await connection('emailInvite').del()
    await connection('roleRequest').del()
    await connection('agreement').del()
    await connection('thesis').del()
    await connection('personWithRole').del()
    await connection('person').del()
    await connection('role').del()
    await connection('councilmeeting').del()
    await connection('studyfield').del()
    await connection('programme').del()
    await connection('faculty').del()

    await connection.raw('alter sequence "agreementDraft_agreementDraftId_seq" restart with 4')
    await connection.raw('alter sequence "agreement_agreementId_seq" restart with 4')
    await connection.raw('alter sequence "attachment_attachmentId_seq" restart with 2')
    await connection.raw('alter sequence "councilmeeting_councilmeetingId_seq" restart with 2')
    await connection.raw('alter sequence "notification_notificationId_seq" restart with 2')
    await connection.raw('alter sequence "personWithRole_personRoleId_seq" restart with 17')
    await connection.raw('alter sequence "person_personId_seq" restart with 20')
    await connection.raw('alter sequence "programme_programmeId_seq" restart with 9')
    await connection.raw('alter sequence "studyfield_studyfieldId_seq" restart with 8')
    await connection.raw('alter sequence "thesis_thesisId_seq" restart with 5')
}

export async function initDb() {
    const schema = process.env.DB_SCHEMA
    const connection = knex.getKnex()

    await connection.raw(`drop schema if exists ${schema} cascade`)
    await connection.raw(`create schema ${schema}`)
    await connection.migrate.latest()
    await deleteFromDb(connection)
    await connection.seed.run()
}

export const createToken = (userId) => {
    const payload = { userId }
    const token = jwt.sign(payload, config.TOKEN_SECRET, {
        expiresIn: '24h'
    })
    return token
}

export const makeTestApp = async (route, userId, ...handler) => {
    const app = express()
    const person = (await knex.getKnex().select().from('person').where('personId', userId)
        .first())
    app.use(errorHandler)
    const headers = {
        uid: person.shibbolethId,
        givenname: person.firstname,
        sn: person.lastname,
        mail: person.email,
        'unique-code': `'urn:schac:personalUniqueCode:int:studentID:helsinki.fi:${person.studentNumber}}`,
        'x-access-token': createToken(person.shibbolethId)
    }
    app.use(route, (req, res, next) => {
        req.headers = Object.assign(req.headers, headers)
        req.decodedToken = { userId: person.shibbolethId }
        next()
    }, auth.checkAuth, ...handler)
    return app
}
