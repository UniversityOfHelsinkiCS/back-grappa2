export class Thesis {
    constructor(id, authorFirstname, authorLastname, authorEmail, title, urkund, grade, graderEval, studyFieldId, userId) {
        //couple of fields missing atm
        this.id = id;
        this.authorFirstname = authorFirstname;
        this.authorLastname = authorLastname;
        this.authorEmail = authorEmail;
        this.title = title;
        this.urkund = urkund;
        this.grade = grade;
        this.graderEval = graderEval;
        this.studyFieldId = studyFieldId;
        this.userId = userId;
    }
}
