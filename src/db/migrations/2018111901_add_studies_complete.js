exports.up = async (knex) => {
    await knex.schema.table('agreement', (table) => {
        table.boolean('requestStudyModuleRegistration').defaultTo(false)
    })
}

exports.down = async (knex) => {
    await knex.schema.table('agreement', (table) => {
        table.dropColumn('requestStudyModuleRegistration')
    })
}
