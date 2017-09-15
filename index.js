require('babel-core/register');
require('babel-polyfill');

const express = require('express');
const app = express();
const output = require('./src/output');
const contractController = require('./src/controller/contractController');
const thesisController = require('./src/controller/thesisController');

module.exports = app;

app.listen(3100, () => {
  console.log('Example app listening on port 3100!');
})

app.get('/',  (req, res) => {
  output.send(req.query.outputType, res, { text: "Hello World!"} );
})

app.get('/helloUser', (req, res) => {
  if(req.query.username){
    output.send(req.query.outputType, res, { text: req.query.username });
  } else {
    output.send(req.query.outputType, res, { text: "Hello World!" });
  }
})

// Contract
app.get('/contract', (req, res) => {
  contractController.getContract(req, res);
});

app.post('/contract', (req, res) => {
  contractController.saveContract(req, res);
});

// Thesis
app.get('/theses', (req, res) => {
  // list all theses
  thesisController.getTheses(req, res);
});
