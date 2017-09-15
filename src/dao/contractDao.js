export const getContract = () => {
    const mockContract = {
        completionEta: 'This is',
        supervision: 'an example of',
        misc: 'contract data'
    };
    return mockContract;
}

export const saveContract = (data) => {
    console.log(data);
    console.log('data saved');
}
