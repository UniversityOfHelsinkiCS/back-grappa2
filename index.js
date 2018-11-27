require('dotenv').config()
require('babel-core/register')
require('babel-polyfill')
const express = require('express')
const Raven = require('raven')

const cors = require('cors')
const gracefulExit = require('express-graceful-exit')
const logger = require('./src/util/logger')
const routes = require('./src/routes.js')
const errorHandler = require('./src/util/errorHandler')

const app = express()
const server = require('http').createServer(app)

Raven.config(process.env.SENTRY_ADDR).install()

app.listen(3100, () => {
    logger.info('Grappa app listening on port 3100!')
})

app.use(gracefulExit.middleware(app))
if (process.env.NODE_ENV === 'development') {
    app.use(cors())
}

routes(app)

app.use(errorHandler)
app.disable('x-powered-by')

process.on('unhandledRejection', (reason, p) => {
    logger.error('Unhandled Rejection at: Promise', { promise: p, reason, stack: reason.stack })
    // application specific logging, throwing an error, or other logic here
})

process.on('SIGTERM', () => {
    gracefulExit.gracefulExitHandler(app, server, {
        socketio: app.settings.socketio
    })
})

require('./src/scheduler')

module.exports = app
