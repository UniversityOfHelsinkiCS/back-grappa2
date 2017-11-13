require('babel-polyfill');
const agreementService = require('../services/AgreementService');
const personService = require('../services/PersonService');
const thesisService = require('../services/ThesisService');
const emailService = require('../services/EmailService');
const express = require('express');
const app = express();

export async function getAgreementById(req, res) {
    const agreement = await agreementService.getAgreementById(req.params.id);
    const agreementPersons = await personService.getAgreementPersonsByAgreementId(req.params.id);
    res.status(200).json({ agreement: agreement, persons: agreementPersons });
}

export async function getPreviousAgreementById(req, res) {
    const agreement = await agreementService.getPreviousAgreementById(req.params.id);
    res.status(200).json(agreement);
}

export async function getAllAgreements(req, res) {
    const agreements = await agreementService.getAllAgreements();
    res.status(200).json(agreements);
}

export async function saveAgreement(req, res) {
    console.log("saveAgreement");
    const data = req.body;
    if (data.agreementId === "" || data.agreementId == null) {
        try {
            //REMOVE THIS WHEN AGREEMENT SAVE WORKS
            data.personId = 1;
            data.thesisSupervisorMain = 1;
            /*const personData = {
                personId: data.personId,
                firstname: data.studentFirstName,
                lastname: data.studentLastName,
                studentNumber: data.studentNumber,
                email: data.studentEmail,
                major: data.studentMajor
            };
            await personService.updatePerson(personData);
            const thesisData = {
                thesisTitle: data.thesisTitle,
                startDate: data.thesisStartDate,
                completionEta: data.thesisCompletionEta,
                performancePlace:  data.thesisPerformancePlace
            };
            const thesisId = await thesisService.saveThesis(thesisData);
            const agreementData = {
                authorId: data.personId,
                thesisId: thesisId,
                responsibleSupervisorId: data.responsibleSupervisorId,
                studyFieldId: data.studyFieldId,
                studentGradeGoal: data.studentGradeGoal,
                studentWorkTime: data.thesisWorkStudentTime,
                supervisorWorkTime: data.thesisWorkSupervisorTime,
                intermediateGoal: data.thesisWorkIntermediateGoal,
                meetingAgreement: data.thesisWorkMeetingAgreement,
                other: data.thesisWorkOther
            };
            const agreementId = await agreementService.saveNewAgreement(agreementData);*/
            emailService.agreementCreated(data);
            res.status(200).json({ text: "agreement save successfull(/SQL error)", agreementId: agreementId });
        } catch (err) {
            res.status(500).json({ text: "error occurred", error: err });
        }
    } else {
        res.status(500).json({ text: "agreement already exists" });
    }
}

export async function updateAgreement(req, res) {
    const data = req.body;
    const agreementId = req.params.id;
    if (agreementId != null && agreementId !== '') {
        try {
            const personData = {
                personId: data.personId,
                firstname: data.studentFirstName,
                lastname: data.studentLastName,
                studentNumber: data.studentNumber,
                email: data.studentEmail,
                address: data.studentAddress,
                major: data.studentMajor
            };
            const cleanPersonData = removeUselessKeys(personData);
            const personResponse = await personService.updatePerson(cleanPersonData);
            const thesisData = {
                thesisId: data.thesisId,
                thesisTitle: data.thesisTitle,
                startDate: data.thesisStartDate,
                completionEta: data.thesisCompletionEta,
                performancePlace:  data.thesisPerformancePlace
            };
            const cleanThesisData = removeUselessKeys(thesisData);
            const thesisResponse = await thesisService.updateThesis(cleanThesisData);
            const agreementData = {
                agreementId: agreementId,
                authorId: data.personId,
                thesisId: data.thesisId,
                responsibleSupervisorId: data.responsibleSupervisorId,
                studyFieldId: data.studyFieldId,
                studentGradeGoal: data.studentGradeGoal,
                studentWorkTime: data.thesisWorkStudentTime,
                supervisorWorkTime: data.thesisWorkSupervisorTime,
                intermediateGoal: data.thesisWorkIntermediateGoal,
                meetingAgreement: data.thesisWorkMeetingAgreement,
                other: data.thesisWorkOther
            };
            const cleanAgreementData = removeUselessKeys(agreementData);
            const agreementResponse = await agreementService.updateAgreement(cleanAgreementData);
            emailService.agreementUpdated(data);
            res.status(200).json({ text: "agreement update successfull(/SQL error)", agreementId: agreementId });
        } catch (err) {
            res.status(500).json({ text: "error occurred", error: err });
        }
    } else {
        res.status(500).json({ text: "problem with agreementId" });
    }
}

function removeUselessKeys(messyData) {
    //removes keys that are undefined/null from data
    let cleanData = {};
    Object.keys(messyData).map(key => {
        if (messyData[key] != null) {
            cleanData[key] = messyData[key];
        }
    });
    return cleanData;
}

export async function savePrevious(req, res) {
    const data = req.body;
    try {
        const daoResponse = await agreementService.savePrevious(data);
        res.status(200).json({ text: "agreement linked to previous agreement successfully", agreementId: daoResponse });
    } catch (err) {
        res.status(500).json({ text: "error occurred", error: err });
    }
}
