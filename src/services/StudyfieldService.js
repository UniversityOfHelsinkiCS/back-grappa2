const knex = require('../db/connection').getKnex()
const Studyfield = require('../db/models/studyfield')

const studyfieldSchema = [
    'studyfieldId',
    'studyfield.name',
    'studyfield.programmeId'
]

export const getStudyfields = async () => Studyfield.fetchAll({ withRelated: ['major'] })

// export const getStudyfields = async () => knex.select(studyfieldSchema).from('studyfield')

export const getStudyfield = async studyfieldId =>
    knex.select(studyfieldSchema).from('studyfield').where('studyfield.studyfieldId', studyfieldId).first()

export const getProgrammeStudyfields = async programmeId => (
    Studyfield.query({ where: { programmeId } }).fetchAll()
)
