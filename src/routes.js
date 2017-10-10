const contracts = require('./routes/contracts.js');
const theses = require('./routes/theses.js');
const index = require('./routes/index.js');
const app = require('../index.js');

module.exports = (app) => {

    app.use('/', index);
    app.use('/contract', contracts);
    app.use('/contracts', contracts);
    app.use('/agreements', contracts);
    app.use('/theses', theses);

};

