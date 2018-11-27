import logger from '../util/logger'
import { checkUserHasRightToModifyAgreement } from './PermissionService'
import { getAgreement } from './AgreementService'

const knex = require('../db/connection').getKnex()
const pdfManipulator = require('../util/pdfManipulator')
const multer = require('multer')
const { FILE_UPLOAD_PATH } = require('../constants')

const storage = () => {
    if (process.env.NODE_ENV === 'test') {
        return multer.memoryStorage()
    }
    return multer.diskStorage({
        destination: FILE_UPLOAD_PATH
    })
}
const upload = multer({ storage: storage() }).fields([
    { name: 'otherFile' },
    { name: 'reviewFile', maxCount: 1 },
    { name: 'thesisFile', maxCount: 1 }
])

const attachmentSchema = [
    'attachmentId',
    'agreementId',
    'filename',
    'originalname',
    'mimetype',
    'label',
    'savedOnDisk'
]

export async function saveAttachments(req, res, agreementId) {
    logger.debug('Saving to disk')

    try {
        const uploaded = new Promise((resolve, reject) => {
            upload(req, res, (error) => {
                if (error) {
                    reject(error)
                }
                logger.info('Attachments saved to disk')
                resolve(req)
            })
        })
        const request = await uploaded
        // agreementId is not null when saving a thesis,
        // and in that case it's not in request.body.json
        let id = agreementId
        if (!id) {
            id = JSON.parse(request.body.json).agreementId
        }

        const agreement = await getAgreement(id)
        await checkUserHasRightToModifyAgreement(req, agreement)
        const attachments = await knex.transaction(async trx => (
            [].concat(...await Promise.all(
                Object.keys(request.files)
                    .map(key => saveFileArray(id, request.files[key], trx))
            ))
        ))
        return { attachments, json: JSON.parse(request.body.json) }
    } catch (error) {
        logger.error('Error during attachment save ', error)
        return Promise.reject(error)
    }
}

export async function saveAttachmentFiles(files, agreementId, trx) {
    return [].concat(...await Promise.all(
        Object.keys(files)
            .map(key => saveFileArray(agreementId, files[key], trx))
    ))
}

const saveFileArray = async (agreementId, fileArray, trx) => Promise.all(fileArray.map(async (file) => {
    const attachment = {
        agreementId,
        savedOnDisk: true,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        label: file.fieldname
    }

    const attachmentIds = await knex('attachment')
        .returning('attachmentId')
        .insert(attachment)
        .transacting(trx)

    return knex.select(attachmentSchema)
        .from('attachment')
        .where('attachmentId', attachmentIds[0])
        .first()
        .transacting(trx)
}))

export async function getAllAttachments() {
    return knex.select(attachmentSchema).from('attachment')
}

export async function getAttachments(attachmentIds) {
    return knex.select(attachmentSchema).from('attachment')
        .whereIn('attachmentId', attachmentIds)
}

export async function getAttachmentsForAgreements(agreements) {
    const ids = agreements.map(agreement => agreement.agreementId)
    return knex.select(attachmentSchema).from('attachment')
        .whereIn('agreementId', ids)
}

export async function getAttachmentsForAgreement(agreementId) {
    return knex.select(attachmentSchema)
        .from('attachment')
        .where('agreementId', agreementId)
}

export async function updateAttachment(attachment) {
    return knex('attachment')
        .returning('attachmentId')
        .where('attachmentId', '=', attachment.attachmentId)
        .update(attachment)
        .then(attachmentId => attachmentId[0])
        .catch((error) => {
            throw error
        })
}

export async function getPdf(attachment, trim) {
    return pdfManipulator.getPdf(FILE_UPLOAD_PATH, attachment, trim)
}

export async function mergePdfs(...buffers) {
    return pdfManipulator.combinePdf(...buffers)
}

export async function createCover(infoObjects, councilmeeting) {
    return pdfManipulator.generateThesesCover(infoObjects, councilmeeting)
}

export async function createReviewPage(reviewObject) {
    return pdfManipulator.generateReviewPage(reviewObject)
}

export async function deleteAttachment(attachmentId) {
    // Do not delete the file for now.
    // TODO: Add timed file removal (after indexing has ended, 30 days?)
    return knex('attachment')
        .where('attachmentId', '=', attachmentId)
        .del()
        .then(() => attachmentId)
        .catch(err => err)
}
