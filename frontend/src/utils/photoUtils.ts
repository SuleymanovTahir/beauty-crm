
/**
 * Helper to get full photo URL
 * Handles relative paths by prepending the API URL
 */
export const getPhotoUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    return `${baseUrl}${path}`;
};
