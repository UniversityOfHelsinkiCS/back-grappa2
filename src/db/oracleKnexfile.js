const config = require('../util/config')


module.exports = {
    client: 'oracledb',
    connection: {
        host: config.ORACLE_DATABASE_URL,
        user: config.ORACLE_DATABASE_USER,
        password: config.ORACLE_DATABASE_PASSWORD,
        database: config.ORACLE_DATABASE_SERVICE
    }
}
