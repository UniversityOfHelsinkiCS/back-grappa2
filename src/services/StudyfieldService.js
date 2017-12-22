const knex = require('../db/connection');

const studyfieldSchema = [
    'studyfieldId',
    'name',
    'facultyId',
    'thesisGradingInfo'
]

export const getAllStudyfields = () => {
    return knex.select(studyfieldSchema).from('studyfield')
        .then(studyfield => studyfield);
}

export const getStudyfield = (studyfieldId) => {
    return knex.select(studyfieldSchema).from('studyfield').where('studyfieldId', studyfieldId).first();
}
