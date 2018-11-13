const knex = require('../db/connection').getKnex()

const agreementService = require('./AgreementService')
const personService = require('./PersonService')
const roleService = require('./RoleService')
const emailInviteService = require('./EmailInviteService')
const studyfieldService = require('./StudyfieldService')
const Thesis = require('../db/models/thesis')

const thesisSchema = [
    'thesis.thesisId',
    'thesis.title',
    'thesis.councilmeetingId',
    'urkund',
    'grade',
    'printDone'
]

// Fetch all theses
// Include in a thesis the graders, authors and primary supervisor
export const getAllTheses = async () => {
    const theses = await getThesesForFiltering()
    return getAuthorsSupervisorsGraders(theses)
}

// In cases we need theses for a person (student)
export const getThesesByPersonId = async (personId) => {
    const theses = await getThesesForFiltering()
    const userTheses = theses.filter(thesis => thesis.authors.find(author => author.personId === personId))
    // const theses = await knex
    //     .select(thesisSchema)
    //     .from('thesis')
    //     .join('agreement', 'thesis.thesisId', '=', 'agreement.thesisId')
    //     .where('agreement.authorId', personId)
    return getAuthorsSupervisorsGraders(userTheses)
}

// In cases we need theses for a programme (resp_prof)
export const getThesesInProgramme = async (programmeId) => {
    const studyfields = await studyfieldService.getPrgorammeStudyfields(programmeId).then(res => res.serialize())
    const theses = await getThesesForFiltering()
    const programmeTheses = theses.filter(thesis => thesis.agreements
        .find(agreement => studyfields.find(studyfield => agreement.studyfieldId === studyfield.studyfieldId)))
    // console.log(prgorammeTheses)
    // const theses = await knex.select(thesisSchema).from('thesis')
    //     .innerJoin('agreement', 'thesis.thesisId', '=', 'agreement.thesisId')
    //     .innerJoin('studyfield', 'agreement.studyfieldId', '=', 'studyfield.studyfieldId')
    //     .where('studyfield.programmeId', programmeId)
    //     .where('agreement.startDate', '>', moment().subtract(10, 'years'))
    return getAuthorsSupervisorsGraders(programmeTheses)
}

// In cases we need theses for a supervisor/grader
export const getThesesByAgreementPerson = async (personId) => {
    const agreements = await agreementService.getAgreementsByAgreementPerson(personId)
    const theses = await getThesesForFiltering()
    const agreementPersonsTheses = theses.filter(thesis => thesis.agreements
        .find(agreement => agreements.find(a => a.agreementId === agreement.agreementId)))
    // const theses = await knex.distinct('thesis.thesisId').select(thesisSchema).from('personWithRole')
    //     .where('personWithRole.personId', personId)
    //     .innerJoin('agreementPerson', 'agreementPerson.personRoleId', '=', 'personWithRole.personRoleId')
    //     .innerJoin('agreement', 'agreement.agreementId', '=', 'agreementPerson.agreementId')
    //     .innerJoin('thesis', 'thesis.thesisId', '=', 'agreement.thesisId')
    return getAuthorsSupervisorsGraders(agreementPersonsTheses)
}

export const getThesisById = async thesisId => getThesisWithRelated(thesisId)

export const saveThesis = async (thesis, trx) => {
    const thesisIds = await knex('thesis')
        .returning('thesisId')
        .insert(thesis)
        .transacting(trx)

    const thesisId = thesisIds[0]
    return knex
        .select(thesisSchema)
        .from('thesis')
        .where('thesisId', thesisId)
        .first()
        .transacting(trx)
}

export const updateThesis = async (thesisData, trx) => knex('thesis')
    .where('thesisId', thesisData.thesisId)
    .update(thesisData)
    .transacting(trx)
    .then(() => getThesisById(thesisData.thesisId))

export const markPrinted = thesisIds => knex('thesis')
    .update({ printDone: true })
    .whereIn('thesisId', thesisIds)


export const getPersonRoleForThesis = async (thesis, agreements, role) => {
    const roleId = await roleService.getRoleId(role)
    const persons = []
    await Promise.all(agreements.map(async (agreement) => {
        const confirmedPersons = await personService.getPersonsByAgreementId(agreement.agreementId, roleId)
        const pendingRoles = await personService.getPendingPersonsByAgreement(agreement.agreementId, roleId)
        persons.push(...confirmedPersons, ...pendingRoles)
    }
    ))
    return persons
}

/**
 * Fetches all theses from database, with associated authors, supervisors and agreements.
 * Would be more efficient not to fetch all theses on each query, but bookshelf is hard.
 * TODO: Maybe possible to do smaller queries with Thesis.query().fetchAll() -syntax.
 * TODO: Supervisors is just a row in personWithRole, fetch the info from person table.
 */
const getThesesForFiltering = () => (
    Thesis.fetchAll({ withRelated: [
        { authors: (qb) => { qb.columns('person.personId', 'email', 'firstname', 'lastname', 'isRetired') } },
        { agreements: (qb) => {
            qb.columns('agreementId', 'thesisId', 'studyfieldId', 'authorId', 'responsibleSupervisorId')
        } },
        'supervisors'
    ] }).then(res => res.serialize())
)

const getThesisWithRelated = async (thesisId) => {
    const thesis = await Thesis.where('thesisId', thesisId).fetch({ withRelated: [
        { authors: (qb) => { qb.columns('person.personId', 'email', 'firstname', 'lastname', 'isRetired') } },
        { agreements: (qb) => { qb.columns('agreementId', 'thesisId', 'studyfieldId', 'authorId', 'responsibleSupervisorId') } },
        'supervisors'
    ] }).then(res => res.serialize())
    const { agreements } = thesis
    thesis.authors.push(...await getThesisAuthorsFromInvites(thesis, agreements))
    thesis.graders = await getPersonRoleForThesis(thesis, agreements, 'grader')
    thesis.supervisors.push(...await getPersonRoleForThesis(thesis, agreements, 'supervisor'))
    return thesis
}

/**
 * Search invites for thesis author.
 * Only not used invites are fetched, based on agreement.
 * @param {Thesis} thesis not needed
 * @param {[Agreement]} agreements Array of agreements related to thesis.
 */
const getThesisAuthorsFromInvites = async (thesis, agreements) => {
    const authors = await Promise.all(agreements.map(async agreement => (
        emailInviteService.getInviteByAgreement(agreement.agreementId).then((res) => {
            if (res) {
                return { email: res.get('email') }
            }
            return null
        })
    )))
    return authors.filter(author => author)
}

/**
 * Fetches all additional supervisors, graders and authors for given theses.
 * The function assumes that each thesis has already .authors and .supervisors
 * @param {[Thesis]} theses An array of theses.
 */
const getAuthorsSupervisorsGraders = async theses => (
    Promise.all(theses.map(async (thesis) => {
        const expandedThesis = Object.assign({}, thesis)
        const { agreements } = thesis
        expandedThesis.authors.push(...await getThesisAuthorsFromInvites(thesis, agreements))
        expandedThesis.graders = await getPersonRoleForThesis(thesis, agreements, 'grader')
        expandedThesis.supervisors.push(...await getPersonRoleForThesis(thesis, agreements, 'supervisor'))
        return expandedThesis
    }))
)
