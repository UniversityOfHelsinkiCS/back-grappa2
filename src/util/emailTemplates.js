export const getEmailTemplate = (type, data) => {
  
    if (type === 'createAgreement')
        return "You were added as the supervisor to a new thesis agreement created by " + data.studentName + ".";
    if (type === 'updateAgreement')
        return "A thesis agreement you are part of was updated.";

    console.error("there is no template with name " + type);
    return false;
}
