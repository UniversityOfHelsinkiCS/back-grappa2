require('babel-polyfill');
const output = require('../output');
const thesisDao = require('../dao/thesisDao');

export function getTheses(req, res) {
  output.send(req.query.outputType, res, thesisDao.getTheses());
}
