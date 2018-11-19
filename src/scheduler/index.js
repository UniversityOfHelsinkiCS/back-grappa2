const cron = require('node-cron')

const { ETHESIS_UPLOAD_CRON } = require('../util/config')
const { checkAndUploadPendingTheses } = require('../services/EthesisUploadService')

cron.schedule(ETHESIS_UPLOAD_CRON, checkAndUploadPendingTheses)
