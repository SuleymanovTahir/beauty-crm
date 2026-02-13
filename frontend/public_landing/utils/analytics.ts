/**
 * Analytics utility for public landing page
 */

export const trackSection = async (sectionId: string) => {
    try {
        const fullUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#${sectionId}`;

        await fetch('/api/analytics/visitors/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: fullUrl }),
        });
    } catch (error) {
        // Silently fail to not disturb user experience
    }
};
