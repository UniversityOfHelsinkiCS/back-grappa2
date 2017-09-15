require('babel-polyfill');
const output = require('../output');
const contractDao = require('../dao/contractDao');

export function getContract(req, res) {
    output.send(req.query.outputType, res.status(200), contractDao.getContract());
}

export function saveContract(req, res) {
    console.log(req.body);
    contractDao.saveContract(req.body);
    output.send(req.query.outputType, res.status(200), "saveContract function called.");
}
