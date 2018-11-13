import Checkit from 'checkit'
import Promise from 'bluebird'
import { linkAgreementAndPersonRole, unlinkAgreementAndPersonRole } from '../services/RoleService'

const thesisService = require('../services/ThesisService')
const agreementService = require('../services/AgreementService')
const attachmentService = require('../services/AttachmentService')
const personService = require('../services/PersonService')
const roleService = require('../services/RoleService')
const permissionService = require('../services/PermissionService')
const programmeService = require('../services/ProgrammeService')
const studyfieldService = require('../services/StudyfieldService')
const notificationService = require('../services/NotificationService')
const emailService = require('../services/EmailService')
const emailInviteService = require('../services/EmailInviteService')
const oldGraduDbService = require('../services/OldGraduDbService')

const knex = require('../db/connection').getKnex()

const checkit = new Checkit({
    title: 'required',
    urkund: ['required', 'url'],
    grade: 'required'
})

export async function getTheses(req, res) {
    const programmeRoles = ['resp_professor', 'print_person', 'manager']

    const user = await personService.getLoggedPerson(req)
    let theses = []
    let newTheses = []

    if (await roleService.isUserAdmin(user)) {
        // As an admin, get all theses
        const allTheses = await thesisService.getAllTheses()
        res.status(200).json(allTheses).end()
        return
    }

    const rolesInProgrammes = await roleService.getUsersRoles(user)

    await Promise.all(rolesInProgrammes.map(async (item) => {
        if (programmeRoles.includes(item.role.name)) {
            // ... As resp_professor, manager or print-person theses in programme
            newTheses = await thesisService.getThesesInProgramme(item.programme.programmeId)
            theses = [...new Set([...theses, ...newTheses])]
        }
    }))

    const thesesAsAgreementPerson = await thesisService.getThesesByAgreementPerson(user.personId)
    const thesesAsAuthor = await thesisService.getThesesByPersonId(user.personId)

    theses = [...theses, ...thesesAsAgreementPerson, ...thesesAsAuthor]
    res.status(200).json(removeDuplicates(theses)).end()
}

function removeDuplicates(theses) {
    const response = new Map()
    theses.forEach((thesis) => {
        if (!response.get(thesis.thesisId)) {
            response.set(thesis.thesisId, thesis)
        }
    })

    return [...response.values()]
}

async function validateThesis(thesis) {
    try {
        checkit.maybe({ authorEmail: ['required', 'email'], studyfieldId: 'required' }, input => !input.thesisId)

        await checkit.run(thesis)
    } catch (error) {
        throw new Error(`Posted thesis data is not valid: ${Object.keys(error.errors)}`)
    }
}

export async function saveThesisForm(req, res) {
    const thesis = JSON.parse(req.body.json)

    await validateThesis(thesis)

    const response = await knex.transaction(async (trx) => {
        // TODO refactor!!!

        await permissionService.checkUserHasRightToAddAgreement(req, thesis.studyfieldId)

        // Order so that agreementId is available to save attachments.
        const agreement = await agreementService.createFakeAgreement(trx)
        const attachments = await attachmentService.saveAttachmentFiles(req.files, agreement.agreementId, trx)

        const { studyfieldId, authorEmail } = thesis
        const { agreementId } = agreement

        agreement.studyfieldId = thesis.studyfieldId

        delete thesis.authorFirstname
        delete thesis.authorLastname
        delete thesis.studyfieldId
        delete thesis.majorId
        // TODO: Add email to new email send table
        delete thesis.thesisEmails
        delete thesis.authorEmail

        if (thesis.graders) {
            await updateGraders(thesis.graders, agreement, trx)
            delete thesis.graders
        }
        const savedThesis = await thesisService.saveThesis(thesis, trx)

        // Agreement was missing the thesisId completing linking.
        agreement.thesisId = savedThesis.thesisId
        const savedAgreement = await agreementService.updateAgreement(agreement, trx)
        const roles = await roleService.getRolesForAllPersons()
        const programme = await programmeService.getStudyfieldsProgramme(studyfieldId)
        await emailService.newThesisAddedNotifyRespProf(programme.programmeId)
        await emailInviteService.createEmailInviteForThesisAuthor(authorEmail, agreementId, programme.programmeId, trx)
        savedAgreement.email = authorEmail

        await notificationService.createNotification('THESIS_SAVE_ONE_SUCCESS', req, agreement.programmeId)

        return {
            thesisId: savedThesis.thesisId,
            agreement: savedAgreement,
            attachments,
            roles
        }
    })
    // Fetch the thesis again so that it includes everything necessary
    // TODO: Refactor everything so that this is not necessary
    const fullThesis = await thesisService.getThesisById(response.thesisId)
    response.thesis = fullThesis
    res.status(200).json(response)
}

export async function updateThesis(req, res) {
    const relationFields = ['authors', 'graders', 'supervisors', 'agreements']
    const updatedFields = req.body
    let thesis = await thesisService.getThesisById(updatedFields.thesisId)
    const agreements = await agreementService.getAgreementsByThesisId(thesis.thesisId)

    await permissionService.checkUserHasRightToModifyAgreement(req, agreements)

    const thesisFields = {}
    Object.keys(thesis).forEach((key) => {
        if (updatedFields[key] !== undefined && !relationFields.includes(key)) {
            thesisFields[key] = updatedFields[key]
            thesis[key] = updatedFields[key]
        }
    })

    await validateThesis(thesis)
    await knex.transaction(async (trx) => {
        thesis = await thesisService.updateThesis(thesisFields, trx)

        // TODO: support multiple agreements on one thesis
        if (updatedFields.graders)
            await updateGraders(updatedFields.graders, agreements[0], trx)

        if (updatedFields.studyfieldId) {
            agreements[0].studyfieldId = updatedFields.studyfieldId
            await agreementService.updateAgreement(agreements[0], trx)
        }
    })

    const roles = await roleService.getRolesForAllPersons()
    const responseObject = { thesis, roles, agreements: [agreements[0]] }
    res.status(200).json(responseObject).end()
}


const updateGraders = async (graders, agreement, trx) => {
    // To unlink person and
    const agreementPersons = await roleService.getAgreementPersonsByAgreementId(agreement.agreementId)
    await Promise.all(agreementPersons.map(async (agreementPerson) => {
        const personRole = await roleService.getPersonRoleWithId(agreementPerson.personRoleId)
        if (!graders.find(grader => grader === personRole.personId)) {
            await unlinkAgreementAndPersonRole(agreementPerson.agreementId, agreementPerson.personRoleId, trx)
        }
    }))
    // If grader not in agreementperson, link them.
    await Promise.all(graders.map(async (grader) => {
        const studyfield = await studyfieldService.getStudyfield(agreement.studyfieldId)
        const personRole = await roleService.getPersonRole(grader, studyfield.programmeId, 'grader')
        if (personRole) {
            // If person exists as a grader and not already linked, link them
            if (!agreementPersons.find(agreementPerson => agreementPerson.personRoleId === personRole.personRoleId)) {
                await linkAgreementAndPersonRole(agreement.agreementId, personRole.personRoleId, trx)
            }
            return
        }
        const roleId = await roleService.getRoleId('grader')
        const pendingPersons = await personService.getPendingPersonsWithRole(roleId, studyfield.programmeId)
        const pendingGrader = pendingPersons.find(person => person.get('personId') === grader)
        if (pendingGrader) {
            await roleService.linkRoleRequestToAgreement(agreement.agreementId, pendingGrader.get('roleRequestId'), trx)
        }
    }))
}

export async function markPrinted(req, res) {
    if (await permissionService.checkUserHasRightToPrint(req)) {
        await thesisService.markPrinted(req.body)
        await oldGraduDbService.exportThesisToOldDb(req.body)
        res.status(200).json(req.body)
    } else {
        res.status(403).json({ error: 'no dice boy' })
    }
}
