import logger from '../util/logger'

const knex = require('../db/connection').getKnex()

const agreementSchema = [
    'agreement.agreementId',
    'authorId',
    'agreement.thesisId',
    'responsibleSupervisorId',
    'agreement.studyfieldId',
    'fake',
    'startDate',
    'completionEta',
    'performancePlace',
    'studentGradeGoal',
    'studentWorkTime',
    'supervisorWorkTime',
    'intermediateGoal',
    'meetingAgreement',
    'other',
    'whoNext'
]

const AGREEMENT_TABLE = 'agreement'

export const getAgreementById = agreementId => knex.select().from(AGREEMENT_TABLE)
    .join('thesis', 'agreement.thesisId', '=', 'thesis.thesisId')
    .join('person', 'agreement.authorId', '=', 'person.personId')
    .join('studyfield', 'agreement.studyfieldId', '=', 'studyfield.studyfieldId')
    .join('programme', 'studyfield.programmeId', '=', 'programme.programmeId')
    .where('agreementId', agreementId)
    .then(agreement => parseAgreementData(agreement[0]))

export const getAgreementByIds = agreementIds => knex.select().from(AGREEMENT_TABLE)
    .join('thesis', 'agreement.thesisId', '=', 'thesis.thesisId')
    .join('studyfield', 'agreement.studyfieldId', '=', 'studyfield.studyfieldId')
    .join('programme', 'studyfield.programmeId', '=', 'programme.programmeId')
    .whereIn('agreementId', agreementIds)

export const getAgreement = agreementId => knex.select().from(AGREEMENT_TABLE).where('agreementId', agreementId)

export const getAgreementsInStudyfield = studyfieldId => knex.select()
    .from(AGREEMENT_TABLE)
    .leftJoin('emailInvite', 'agreement.agreementId', 'emailInvite.agreement')
    .where('studyfieldId', studyfieldId)

export const getAgreementsInProgramme = programmeId => knex.select()
    .from(AGREEMENT_TABLE)
    .leftJoin('emailInvite', 'agreement.agreementId', 'emailInvite.agreement')
    .innerJoin('studyfield', 'agreement.studyfieldId', '=', 'studyfield.studyfieldId')
    .where('studyfield.programmeId', programmeId)

export const getAgreementsByAgreementPerson = personId => knex
    .select(agreementSchema).distinct('agreement.agreementId')
    .from(AGREEMENT_TABLE)
    .innerJoin('agreementPerson', 'agreement.agreementId', '=', 'agreementPerson.agreementId')
    .innerJoin('personWithRole', 'agreementPerson.personRoleId', '=', 'personWithRole.personRoleId')
    .where('personWithRole.personId', personId)

export const getPreviousAgreementById = id => knex.select().from('previousagreements')
    .join(AGREEMENT_TABLE, 'previousagreements.previousAgreementId', '=', 'agreement.agreementId')
    .where('previousagreements.agreementId', id)
    .then(agreement => agreement)

export const getAllAgreements = () => knex.select()
    .from(AGREEMENT_TABLE)
    .leftJoin('emailInvite', 'agreement.agreementId', 'emailInvite.agreement')

export const getAgreementsByAuthor = personId => knex.select().from(AGREEMENT_TABLE)
    .where('authorId', personId)

export const getAgreementsByThesisId = thesisId => knex.select().from(AGREEMENT_TABLE)
    .where('thesisId', thesisId)

export const saveAgreement = async (agreement) => {
    const agreementIds = await knex(AGREEMENT_TABLE)
        .returning('agreementId')
        .insert(agreement)
    const agreementId = agreementIds[0]
    return knex.select(agreementSchema).from(AGREEMENT_TABLE).where('agreementId', agreementId).first()
}

export const saveAgreementTransactional = async (agreement, trx) => {
    const agreementIds = await knex(AGREEMENT_TABLE)
        .returning('agreementId')
        .insert(agreement)
        .transacting(trx)

    const agreementId = agreementIds[0]
    return knex.select(agreementSchema)
        .from(AGREEMENT_TABLE)
        .where('agreementId', agreementId)
        .transacting(trx)
        .first()
}

export const createFakeAgreement = (trx) => {
    const fakeAgreement = {
        authorId: null,
        thesisId: null,
        responsibleSupervisorId: null,
        studyfieldId: null,
        fake: true,
        // startDate: null,
        completionEta: null,
        performancePlace: null,
        studentGradeGoal: null,
        studentWorkTime: null,
        supervisorWorkTime: null,
        intermediateGoal: null,
        meetingAgreement: null,
        other: null,
        whoNext: null
    }

    return saveAgreementTransactional(fakeAgreement, trx)
}

export const updateAgreement = (agreement, trx) => knex(AGREEMENT_TABLE)
    .returning('agreementId')
    .where('agreementId', '=', agreement.agreementId)
    .update(agreement)
    .transacting(trx)
    .then(() =>
        knex.select(agreementSchema).from(AGREEMENT_TABLE)
            .where('agreementId', '=', agreement.agreementId)
            .transacting(trx)
            .first()
    )
    .catch((error) => {
        throw error
    })

export const savePrevious = data => knex('previousagreements')
    .returning('agreementId')
    .insert(data)
    .then(agreementId => agreementId[0])
    .catch((error) => {
        throw error
    })

export function linkAuthorToAgreement(agreementId, authorId) {
    return knex(AGREEMENT_TABLE).update({ authorId }).where('agreementId', agreementId)
}

// change data formatting from DB to front
const parseAgreementData = data => ({
    // person
    personId: data.personId,
    studentFirstName: data.firstname,
    studentLastName: data.lastname,
    studentNumber: data.studentNumber,
    studentAddress: data.address,
    studentPhone: data.phone,
    studentEmail: data.email,
    studentMajor: data.major,
    // thesis
    thesisTitle: data.thesisTitle,
    thesisStartDate: data.startDate,
    thesisCompletionEta: data.completionEta,
    thesisPerformancePlace: data.performancePlace,
    // agreement
    agreementId: data.agreementId,
    authorId: data.personId,
    thesisId: data.thesisId,
    responsibleSupervisorId: data.responsibleSupervisorId,
    studyfieldId: data.studyfieldId,
    studentGradeGoal: data.studentGradeGoal,
    thesisWorkStudentTime: data.studentWorkTime,
    thesisWorkSupervisorTime: data.supervisorWorkTime,
    thesisWorkIntermediateGoal: data.intermediateGoal,
    thesisWorkMeetingAgreement: data.meetingAgreement,
    thesisWorkOther: data.other
})

/*
Figures out who should next receive the agreement for approval,
this requires the program to be able to know who sent the agreement update
by tracking personId's. After that agreement also needs a finished attribute and
some way to know which people have approved the agreement to keep track of where
in the agreement approval process we are at.
*/
// REDO THIS LATER
export const getAgreementReceiver = (id) => {
    logger.info('getAgreementReceiver', { id })
    return knex.select('whoNext').from(AGREEMENT_TABLE)
        .where('agreementId', id)
        .then((agreement) => {
            logger.debug('whoNext', { whoNext: agreement[0].whoNext })
            if (agreement[0].whoNext === 'supervisor') {
                return 'student'
            }
            return 'supervisor'
        })
}


export const getThesesGradersAuthorsForAgreements = (agreementIds) => {
    const informationSchema = [
        'agreement.agreementId',
        'thesis.title',
        'thesis.grade',
        'grader.firstname',
        'grader.lastname',
        'agreementPerson.statement as graderStatement',
        'graderReviewer.firstname as reviewerFirstname',
        'graderReviewer.lastname as reviewerLastname',
        'author.firstname as authorFirstname',
        'author.lastname as authorLastname'
    ]

    return knex.select(informationSchema).from(AGREEMENT_TABLE)
        .whereIn('agreement.agreementId', agreementIds)
        .innerJoin('agreementPerson', 'agreement.agreementId', '=', 'agreementPerson.agreementId')
        .innerJoin('personWithRole', 'agreementPerson.personRoleId', '=', 'personWithRole.personRoleId')
        .innerJoin('role', 'personWithRole.roleId', '=', 'role.roleId')
        .where('role.name', 'grader')
        .innerJoin('person as grader', 'personWithRole.personId', '=', 'grader.personId')
        .innerJoin('person as author', 'agreement.authorId', '=', 'author.personId')
        .innerJoin('thesis', 'agreement.thesisId', '=', 'thesis.thesisId')
        .leftJoin('personWithRole as graderReviewerRole',
            'agreementPerson.approverId', '=', 'graderReviewerRole.personRoleId')
        .leftJoin('person as graderReviewer', 'graderReviewerRole.personId', '=', 'graderReviewer.personId')
}

export const getThesisMetadataByIds = async (thesisIds) => {
    const informationSchema = [
        'agreement.thesisId as thesisId',
        'author.firstname as firstname',
        'author.lastname as lastname',
        'studyfield.name as studyfield',
        'programme.name as programme',
        'faculty.name as faculty',
        'attachment.originalname as filename'
    ]

    return knex(AGREEMENT_TABLE)
        .whereIn('agreement.thesisId', thesisIds)
        .andWhere('attachment.label', 'thesisFile')
        .innerJoin('person as author', 'agreement.authorId', '=', 'author.personId')
        .innerJoin('studyfield', 'agreement.studyfieldId', '=', 'studyfield.studyfieldId')
        .innerJoin('programme', 'studyfield.programmeId', '=', 'programme.programmeId')
        .innerJoin('faculty', 'programme.facultyId', '=', 'faculty.facultyId')
        .innerJoin('attachment', 'agreement.agreementId', '=', 'attachment.agreementId')
        .select(informationSchema)
}

export const updateStudiesComplete = (agreementId, personId, studiesComplete) => knex('agreement')
    .update({ studiesComplete })
    .where({
        agreementId,
        authorId: personId
    })
