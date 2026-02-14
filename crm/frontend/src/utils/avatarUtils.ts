export const getDynamicAvatar = (name: any, temperature: string = 'cold', gender?: string) => {
    const safeName = typeof name === 'string' ? name : String(name || 'User');
    const cleanName = safeName.trim().toLowerCase();

    // Use explicit gender if provided, otherwise infer from Russian names
    // Ends with 'a' or 'ya' -> female, otherwise male
    const isFemale = gender ? gender !== 'male' : (cleanName.endsWith('а') || cleanName.endsWith('я') || cleanName.endsWith('a'));

    const seed = encodeURIComponent(safeName);

    // Options based on temperature
    let options = '';

    if (isFemale) {
        if (temperature === 'hot') {
            options = '&topType=longHair&eyeType=hearts&mouthType=smile&skin=light';
        } else if (temperature === 'warm') {
            options = '&topType=longHair&eyeType=happy&mouthType=smile&skin=light';
        } else {
            options = '&topType=longHair&eyeType=default&mouthType=default&skin=light';
        }
    } else {
        if (temperature === 'hot') {
            options = '&topType=shortHair&eyeType=hearts&mouthType=smile&skin=light';
        } else if (temperature === 'warm') {
            options = '&topType=shortHair&eyeType=happy&mouthType=smile&skin=light';
        } else {
            options = '&topType=shortHair&eyeType=default&mouthType=default&skin=light';
        }
    }

    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}${options}`;
};
