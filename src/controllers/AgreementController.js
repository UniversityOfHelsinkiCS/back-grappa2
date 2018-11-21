import logger from '../util/logger'

const agreementService = require('../services/AgreementService')
const attachmentService = require('../services/AttachmentService')
const personService = require('../services/PersonService')
const roleService = require('../services/RoleService')
const studyfieldService = require('../services/StudyfieldService')

const PROGRAMME_ROLES = ['resp_professor', 'print_person', 'manager']

// TODO: refactor
export const getAllAgreements = async (req, res) => {
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

        rolesInProgrammes.forEach(async (item) => {
            // As resp_prof, print-person and manager persons who are writing theses in programme
            if (PROGRAMME_ROLES.includes(item.role.name)) {
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


const hasRightsToEditAgreement = async (agreementId, user) => {
    const rolesInProgrammes = await roleService.getUsersRoles(user)
    const agreement = await agreementService.getAgreementById(agreementId)
    const agreementStudyfield = await studyfieldService.getStudyfield(agreement.studyfieldId)
    const agreementProgramme = agreementStudyfield.programmeId

    if (agreement.authorId === user.personId || rolesInProgrammes.find(item => item.role.name === 'admin')) {
        return true
    }

    return rolesInProgrammes.find(item =>
        PROGRAMME_ROLES.includes(item.role.name) && item.programme.programmeId === agreementProgramme)
}

// Only updating studies completed field for own agreement is possible
export const updateAgreement = async (req, res) => {
    try {
        const user = await personService.getLoggedPerson(req)
        const agreementId = req.params.id
        const { requestStudyModuleRegistration } = req.body

        if (await hasRightsToEditAgreement(agreementId, user)) {
            await agreementService.updateStudyModuleRegistration(agreementId, requestStudyModuleRegistration)
            res.status(204).end()
        } else {
            res.status(401).end()
        }
    } catch (err) {
        logger.error(err)
        res.status(500).end()
    }
}
