const logger = require('./logger')

export const axiosErrorHandler = (error, url) => {
    const { response, request, message } = error
    const err = {}

    if (response) {
        const { data, status } = error.response
        err.status = status
        err.data = `Received error response from ${url} with status ${status}: ${data}`
    } else if (request) {
        err.data = `Received no response from ${url} with request ${request}`
    } else {
        err.data = `Error on API call with message: ${message}`
    }

    logger.error(err.data)
    return err
}
