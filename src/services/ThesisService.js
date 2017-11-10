import thesesList from "../mockdata/MockTheses.js";

const knex = require('../../connection');

// don't know if export function is better than export const? Both are working.

export function getAllTheses() {
    return knex.select('thesis.thesisId', 'thesis.thesisTitle', 'thesis.grade', 'person.firstName as authorFirstname', 'person.lastName as authorLastname').from('thesis')
        .join('agreement', 'thesis.thesisId', '=', 'agreement.thesisId')
        .join('person', 'agreement.authorId', '=', 'person.personId')
        .then(thesis => {
            return thesis;
        });
}

export const getThesisById = (id) => {
    return knex.select().from('thesis').where('thesisId', id)
        .then(thesis => {
            return thesis;
        });
}

export const saveThesis = (data) => {
    console.log("saveThesis servicessä hoi");
    return knex('thesis')
    .returning('thesisId')
    .insert(data)
    .then(thesisId => thesisId[0])
    .catch(err => Promise.reject(err));
}

export async function updateThesis(thesisData) {
    return await knex('thesis')
    .returning('thesisId')
    .where('thesisId', '=', thesisData.thesisId)
    .update(thesisData)
    .then(thesisId => thesisId[0])
    .catch(err => err);
}
