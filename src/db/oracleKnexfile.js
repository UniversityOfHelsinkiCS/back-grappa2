const config = require('../util/config')

module.exports = {
    client: 'oracledb',
    connection: {
        connectString: config.ORACLE_CONNCET_STING,
        user: config.ORACLE_DATABASE_USER,
        password: config.ORACLE_DATABASE_PASSWORD
    }
}
