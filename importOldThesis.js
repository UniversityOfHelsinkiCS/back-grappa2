/*
 *  This code imports theses from Old Oracle DB exports.
 *  Data is exported to CSV files, stored in import dir.
 *
 *  Add CSV export of GRADU table to ./import dir and run this script.
 *  Used database is selected by DB_ADDRESS env parameter.
 *
 *  v1
 *      Saves all accepted theses with valid studyfield.
 *      Ignores other theses.
 *      Sets agreement start & completion dates to TILA_PVM value.
 */

require('dotenv').config()

require('babel-core/register')
require('babel-polyfill')

const Promise = require('bluebird')
const fs = require('fs')

const knex = require('./src/db/connection').getKnex()
const { getStudyfields } = require('./src/util/oldCSStudyfields')

const gradeMap = {
    '09. a': 'Approbatur',
    '08. lub': 'Lubenter Approbatur',
    '07. nsla': 'Non Sine Laude Approbatur',
    '06. cl': 'Cum Laude Approbatur',
    '05. mcl': 'Magna Cum Laude Approbatur',
    '04. ecl': 'Eximia Cum Laude Approbatur',
    '03. l': 'Laudatur'
}

async function run() {
    const studyfields = await getStudyfields()
    const content = await Promise.promisify(fs.readFile)('import/gradut.csv', 'utf-8')
    const theses = content.split('\n').slice(1)

    // theses.forEach(thesis => saveThesis(thesis, studyfields))
    await Promise.each(theses, thesis => saveThesis(thesis, studyfields))
    console.log('complete')
}

async function saveThesis(thesisRow, studyfields) {
    const data = thesisRow.split(';')
    const [, title, , , , , , , studyfield, , , , , , , , , status, date, , , , , grade] = data

    if (!studyfield) {
        return
    }

    try {
        const field = studyfields.find(item => item.key === studyfield.replace(/"/g, ''))

        if (!field) {
            return
        }

        const studyfieldId = field.id

        if (status !== '"12. hyväksytty"')
            return

        await knex.transaction(trx => trx
            .insert({
                title: title.substr(1, title.length).substr(0, title.length - 2),
                urkund: 'http://invalid',
                printDone: true,
                grade: gradeMap[grade.replace(/"/g, '')]
            })
            .into('thesis')
            .returning('thesisId')
            .then((thesisId) => {
                let thesisDate = date.substr(1, title.length).substr(0, title.length - 2)

                if (thesisDate.split('.')[0] === '0')
                    thesisDate = 1 + thesisDate

                return trx
                    .insert({
                        studyfieldId,
                        thesisId: thesisId[0],
                        fake: true,
                        completionEta: thesisDate,
                        startDate: thesisDate
                    })
                    .into('agreement')
                    .catch(err => console.log(err.message))
            })
            .catch(err => console.log(err.message)))
            .then(() => console.log('Inserted'))
            .catch(() => console.log('Not saved'))
    } catch (err) {
        console.log('Catched')
        console.log(err)
    }
}

run()
