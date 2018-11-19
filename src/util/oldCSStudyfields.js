const knex = require('../db/connection').getKnex()

module.exports.getStudyfields = function () {
    const names = [
        { key: 'ohje', name: 'Ohjelmistotekniikka' },
        { key: 'älyk', name: 'Älykkäät järjestelmät' },
        { key: 'algo', name: 'Algoritmit' },
        { key: 'info', name: 'Informaatiojärjestelmät' },
        { key: 'haja', name: 'Hajautetut j. ja tietoliikenne' },
        { key: 'sove', name: 'sovellettu' },
        { key: 'kiel', name: 'Kieliteknologia' },
        { key: 'opet', name: 'Opettaja' },
        { key: 'tmat', name: 'Tietokonematemaatikko' },
        { key: 'ohjelmistot', name: 'Ohjelmistot' },
        { key: 'yleinen', name: 'Yleinen' },
        { key: 'testi', name: 'testilinja' },
        { key: 'biol', name: 'Bioinformatiikka ja laskennallinen biologia' },
        { key: 'mbi', name: 'Bioinformatiikan maisteriohjelma' },
        { key: 'cbu', name: 'CBU-ICT -maisteriohjelma' },
        { key: 'alko', name: 'Algoritmit ja koneoppiminen' },
        { key: 'oja', name: 'Ohjelmistojärjestelmät' },
        { key: 'algbio', name: 'Algoritminen bioinformatiikka' }
    ]

    return Promise.map(names, field => knex('studyfield')
        .select('studyfieldId')
        .where('name', field.name)
        .first()
        .then(result => ({ key: field.key, id: result.studyfieldId })))
}
