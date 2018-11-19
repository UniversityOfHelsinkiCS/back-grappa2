const router = require('express').Router()
const bodyParser = require('body-parser')

const jsonParser = bodyParser.json()

const auth = require('../middleware/auth')

const agreementController = require('../controllers/AgreementController')

/**
 * @api {get} agreements Get agreements
 * @apiName GetAgreements
 * @apiGroup Agreements
 *
 * @apiDescription TODO: Fix documentation when we start using this feature
 */
router.get('/', (req, res, next) => agreementController.getAllAgreements(req, res).catch(next))

/**
 * @api {post} agreements Save agreement
 * @apiName SaveAgreement
 * @apiGroup Agreements
 *
 * @apiDescription TODO: Fix documentation when we start using this feature
 */
router.post('/', jsonParser, auth.checkStaff, (req, res, next) =>
    agreementController.saveAgreementForm(req, res).catch(next))

router.put('/:id', jsonParser, (req, res, next) =>
    agreementController.updateAgreement(req, res).catch(next))

module.exports = router
