import logger from '../util/logger'

require('dotenv').config()
const config = require('./knexfile.js')
const oracleConfig = require('./oracleKnexfile')
const knexModule = require('knex')

const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'not working'
let knex
let oracleKnex

module.exports.getKnex = () => {
    if (knex)
        return knex

    if (env !== 'test') {
        knex = knexModule(config[env])
        knex.migrate.latest().then((msg) => {
            if (msg[1].length) {
                logger.info('Successful migrate', { msg })
            }
        }).catch((err) => {
            logger.error('Migrate failed', { err })
        })
        return knex
    }

    config[env].searchPath = process.env.DB_SCHEMA
    knex = knexModule(config[env])

    return knex
}

module.exports.getOracleKnex = () => {
    if (oracleKnex) {
        return oracleKnex
    }

    oracleKnex = knexModule(oracleConfig.development)
    return oracleKnex
}
