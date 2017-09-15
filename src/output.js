const jsonOut = (res, outputContent) => {
    try {
        JSON.stringify(outputContent);
    } catch (e) {
        console.log("Output not JSON, sending error message");
        outputContent = { error: "output not valid json" }
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(outputContent);
} 

const textOut = (res,outputContent) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(outputContent);
}

const htmlOut = (res,outputContent) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(outputContent);
}

export const send = (outputType, res, outputContent) => {
    switch (outputType)
    {
        case "text": 
            textOut(res,outputContent);
            break;
        case "html": 
            htmlOut(res,outputContent);
            break;
        default: 
            jsonOut(res,outputContent);
            break;
    }
}
