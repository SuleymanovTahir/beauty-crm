export const getDynamicAvatar = (name: string, temperature: string = 'cold', gender?: string) => {
    // Use explicit gender if provided, otherwise infer from Russian names
    // Ends with 'a' or 'ya' -> female, otherwise male
    const cleanName = name.trim().toLowerCase();
    const isFemale = gender ? gender !== 'male' : (cleanName.endsWith('а') || cleanName.endsWith('я') || cleanName.endsWith('a')); // 'a' for English names like 'Anna'

    const seed = encodeURIComponent(name);

    // Options based on temperature
    let options = '';

    if (isFemale) {
        // Female options
        if (temperature === 'hot') {
            // Happy, love eyes
            options = '&topType=longHair&eyeType=hearts&mouthType=smile&skin=light';
        } else if (temperature === 'warm') {
            // Smiling
            options = '&topType=longHair&eyeType=happy&mouthType=smile&skin=light';
        } else {
            // Cold/Neutral
            options = '&topType=longHair&eyeType=default&mouthType=default&skin=light';
        }
    } else {
        // Male options
        if (temperature === 'hot') {
            // Happy, love eyes (or just very happy)
            options = '&topType=shortHair&eyeType=hearts&mouthType=smile&skin=light';
        } else if (temperature === 'warm') {
            // Smiling
            options = '&topType=shortHair&eyeType=happy&mouthType=smile&skin=light';
        } else {
            // Cold/Neutral
            options = '&topType=shortHair&eyeType=default&mouthType=default&skin=light';
        }
    }

    // Using DiceBear API v9
    // We use 'avataaars' style as it's expressive
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}${options}`;
};
