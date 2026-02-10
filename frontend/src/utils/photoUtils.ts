
/**
 * Helper to get full photo URL
 * Handles relative paths by prepending the API URL
 */
export const getPhotoUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    // Ensure path starts with / for proper URL concatenation
    const separator = path.startsWith('/') ? '' : '/';

    // Encode Cyrillic and spaces in the filename but keep / slashes
    // Use decodeURIComponent first to avoid double encoding if already encoded
    try {
        const decoded = decodeURIComponent(path);
        const encoded = encodeURI(decoded);
        return `${baseUrl}${separator}${encoded}`;
    } catch (e) {
        return `${baseUrl}${separator}${encodeURI(path)}`;
    }
};

