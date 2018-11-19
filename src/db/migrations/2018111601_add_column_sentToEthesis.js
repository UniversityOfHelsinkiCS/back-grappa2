/*
Migration to add sentToEthesis column to Thesis table.
*/

const THESIS_TABLE = 'thesis'
const SENT_TO_ETHESIS_COLUMN = 'sentToEthesis'

exports.up = knex => Promise.all([
    knex.schema.table(THESIS_TABLE, (table) => {
        table.boolean(SENT_TO_ETHESIS_COLUMN)
            .notNullable()
            .defaultTo(false)
    })
])

exports.down = async (knex) => {
    await knex.schema.table(THESIS_TABLE, (table) => {
        table.dropColumn(SENT_TO_ETHESIS_COLUMN)
    })
}
