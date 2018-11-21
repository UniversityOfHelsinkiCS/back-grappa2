import logger from '../util/logger'

const mailer = require('../util/mailer')

const emailDraftService = require('../services/EmailDraftService')
const personService = require('../services/PersonService')

const PROD_ADDRESS = 'https://grappa.cs.helsinki.fi/v2/'
const DEV_ADDRESS = 'http://localhost:3000/v2/'

const SERVER_ADDRESS = process.env.NODE_ENV === 'production' ? PROD_ADDRESS : DEV_ADDRESS

export async function newThesisAddedNotifyRespProf(programmeId) {
    const respProfs = await personService.getPersonsWithRoleInStudyfield(4, programmeId)
    const mails = respProfs.map(prof => sendMail('SupervisingProfessorNotification', prof.email, programmeId))

    return Promise.all(mails)
}

async function sendMail(type, email, programmeId) {
    const emailDraft = await emailDraftService.getEmailDraft(type, programmeId)

    try {
        await mailer.sendEmail(email, emailDraft.title, emailDraft.body)
    } catch (error) {
        logger.error('Email send error', { error: error.message })
    }
}

export async function sendInvite(emailInvite, type, programmeId) {
    const draftName = type === 'role' ? 'InviteRoleToLogin' : 'InviteAuthorToLogin'
    const draft = await emailDraftService.getEmailDraft(draftName, programmeId)
    const body = draft.body.replace('$LOGIN_URL$', `${SERVER_ADDRESS}invite?type=${type}&token=${emailInvite.token}`)

    try {
        await mailer.sendEmail(emailInvite.email, draft.title, body)
    } catch (error) {
        logger.error('Email send error', { error: error.message })
    }
}

export const sendAddedToGrappa = async (programmes, role, email, firstname, lastname) => {
    const helsinkiEmail = 'You can login to Grappa at https://grappa.cs.helsinki.fi/v2/ with ' +
        'the University of Helsinki credentials associated with this email address.'
    const nonHelsinkiEmail = 'You can not login to Grappa since this is not a @helsinki.fi email ' +
        'address. Only people with University of Helsinki username can use Grappa. You can still act ' +
        'as a grader, but will just not be able to use Grappa.'
    const title = 'You have been added to Grappa'
    const body = `Dear ${firstname} ${lastname}\n
    You have been added to Grappa, a web application to help in managing the final stages of approving ` +
        `student's master's thesis.\n
    You have been granted the role ${role} in: \n${programmes.map(programme => `${programme.name}\n`)}
    ${email.includes('@helsinki.fi') ? helsinkiEmail : nonHelsinkiEmail}\n
    If you have any problems or questions please contact grp-toska@helsinki.fi.\n\n
    Best regards,\n
    Grappa team`
    try {
        await mailer.sendEmail(email, title, body)
    } catch (error) {
        logger.error('Email send error', { error: error.message })
    }
}

export const sendRoleRequestNotification = async (address, roleName, granted, granterName, programmeName) => {
    const title = 'Notification from Grappa'
    const body = `You have ${granted ? '' : 'NOT'} been granted the following role to Grappa:\n
    ${roleName} in ${programmeName}\n
    The request was handled by ${granterName}. Please contact them for any further information.`
    try {
        await mailer.sendEmail(address, title, body)
    } catch (error) {
        logger.error('Email send error', { error: error.message })
    }
}

export const notifyManagersAboutRoleRequest = async (address, roleName, programmeName) => {
    const title = `RoleRequest in Grappa for ${programmeName}`
    const body = `A new role request for ${roleName} in ${programmeName} has been submitted to Grappa.\n
    You are receiving this message since you are marked as a manager of this programme, and you (or another manager
    of the programme) should view and handle the request.
    You can find unhandled requests at https://grappa.cs.helsinki.fi/v2/PersonRoleManagement.\n\n
    Best regards,\n
    Toska-group`
    try {
        await mailer.sendEmail(address, title, body)
    } catch (error) {
        logger.error('Email send error', { error: error.message })
    }
}
