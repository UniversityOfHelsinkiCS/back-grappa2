import logger from '../util/logger'

const agreementService = require('../services/AgreementService')
const attachmentService = require('../services/AttachmentService')
const personService = require('../services/PersonService')
const roleService = require('../services/RoleService')

// TODO: refactor
export async function getAllAgreements(req, res) {
    // All = return agreements that a user might be interested in.
    try {
        const user = await personService.getLoggedPerson(req)
        const { personId } = user
        let agreements = []
        let newAgreements = []

        const rolesInProgrammes = await roleService.getUsersRoles(user)

        // If user is an admin, get everything
        if (rolesInProgrammes.find(item => item.role.name === 'admin')) {
            agreements = await agreementService.getAllAgreements()
            const attachments = await attachmentService.getAllAttachments()
            const responseObject = {
                agreements,
                attachments
            }
            res.status(200).json(responseObject).end()
            return
        }

        const programmeRoles = ['resp_professor', 'print_person', 'manager']
        rolesInProgrammes.forEach(async (item) => {
            // As resp_prof, print-person and manager persons who are writing theses in programme
            if (programmeRoles.includes(item.role.name)) {
                newAgreements = await agreementService.getAgreementsInProgramme(item.programme.programmeId)
                agreements = [...new Set([...agreements, ...newAgreements])]
            }
        })

        // Get all where agreementPerson
        newAgreements = await agreementService.getAgreementsByAgreementPerson(personId)
        agreements = [...new Set([...agreements, ...newAgreements])]

        // Get all where user is the author.
        newAgreements = await agreementService.getAgreementsByAuthor(personId)
        agreements = [...new Set([...agreements, ...newAgreements])]

        // Remove duplicates
        const responseAgreements = []
        agreements.forEach((agreement) => {
            if (!responseAgreements.find(item => item.agreementId === agreement.agreementId)) {
                responseAgreements.push(agreement)
            }
        })

        const attachments = await attachmentService.getAttachmentsForAgreements(responseAgreements)
        const responseObject = {
            agreements: responseAgreements,
            attachments
        }
        res.status(200).json(responseObject)
    } catch (error) {
        logger.error('Get agreements failed', { error })
        res.status(500).json(error)
    }
}

export async function saveAgreementForm(req, res) {
    res.status(501).end()
}

// Only updating studies completed field for own agreement is possible
export async function updateAgreement(req, res) {
    try {
        const user = await personService.getLoggedPerson(req)
        const { personId } = user
        const agreementId = req.params.id
        const { studiesComplete } = req.body

        await agreementService.updateStudiesComplete(agreementId, personId, studiesComplete)

        res.status(204).end()
    } catch (err) {
        logger.error(err)
        res.status(500).end()
    }
}
