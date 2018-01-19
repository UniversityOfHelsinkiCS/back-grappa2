const attachmentService = require('../services/AttachmentService');
const agreementService = require('../services/AgreementService');
const councilmeetingService = require('../services/CouncilmeetingService');
const notificationService = require('../services/NotificationService');

export async function saveAttachments(req, res) {
    try {
        const attachmentObject = await attachmentService.saveAttachments(req, res);
        const { attachments } = attachmentObject;
        notificationService.createNotification('ATTACHMENT_SAVE_ONE_SUCCESS', req);
        res.status(200).send(attachments).end();
    } catch (error) {
        res.status(500).end();
    }
}

export async function downloadAttachments(req, res) {
    try {
        let cover = false;
        let councilmeetingId;
        const attachmentIds = req.params.ids.split('&').filter((id) => {
            // Avoid creating other routes
            // TODO: Create other routes
            if (id === 'cover') {
                cover = true;
                return false
            }
            if (id.includes('cm')) {
                councilmeetingId = id.replace('cm', '');
            }
            return true
        });
        const attachments = await attachmentService.getAttachments(attachmentIds);

        // To keep the order that was used to call (eq, 3&1&2)
        const order = {};
        attachmentIds.forEach((a, i) => { order[a] = i; });
        attachments.sort((a, b) => order[a.attachmentId] - order[b.attachmentId]);
        
        const promiseList = await Promise.all(attachments.map(async (attachment) => {
            if (attachment.label === 'thesisFile' && attachments.length > 1) {
                return attachmentService.getPdf(attachment, true);
            } else if (attachment.label === 'reviewFile') {
                // After every review pdf, create page with review of the graders.
                const reviewPage = await attachmentService.createReviewPage();
                const attachmentStream = await attachmentService.getPdf(attachment);
                return attachmentService.mergePdfs(attachmentStream, reviewPage);
            }
            return attachmentService.getPdf(attachment);
        }))

        let fileStream = await attachmentService.mergePdfs(...promiseList)

        if (cover) {
            const councilmeeting = councilmeetingId ?
                await councilmeetingService.getCouncilmeeting(councilmeetingId)
                : undefined

            const agreementIds = attachments.map(attachment => attachment.agreementId);

            const agreementObjects = await agreementService.getThesesGradersAuthorsForAgreements(agreementIds);
            /* agreementObjects are form
            'thesis.title',
            'thesis.grade',
            'grader.firstname',
            'grader.lastname',
            'author.firstname as authorFirstname',
            'author.lastname as authorLastname', */
            const thesisObjects = agreementObjects.reduce((acc, cur) => {
                const idx = acc.findIndex(obj => obj.title === cur.title)
                const grader = {
                    firstname: cur.firstname,
                    lastname: cur.lastname
                }
                if (idx !== -1) {
                    acc[idx].graders.push(grader);
                } else {
                    const thesisObj = {
                        title: cur.title,
                        grade: cur.grade,
                        authorFirstname: cur.authorFirstname,
                        authorLastname: cur.authorLastname,
                        graders: [grader]
                    }
                    acc.push(thesisObj)
                }
                return acc;
            }, [])
            const coverStream = await attachmentService.createCover(thesisObjects, councilmeeting)
            fileStream = await attachmentService.mergePdfs(coverStream, fileStream)
        }

        res.type('pdf');
        res.end(fileStream, 'binary');
    } catch (error) {
        console.log('Virhe ', error);
        res.status(501).send({ text: 'NOT YET IMPLEMENTED' }).end();
    }
}

export async function deleteAttachment(req, res) {
    try {
        const attachmentId = req.params.id;
        const deletedId = await attachmentService.deleteAttachment(attachmentId);
        res.status(200).send(deletedId).end();
    } catch (error) {
        res.status(500).end();
    }
}