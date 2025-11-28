// Gallery API methods
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const galleryApi = {
    async getImages(category: string, visibleOnly: boolean = true) {
        const response = await fetch(
            `${API_URL}/api/gallery/${category}?visible_only=${visibleOnly}`,
            { credentials: 'include' }
        );
        if (!response.ok) throw new Error('Failed to load gallery');
        return response.json();
    },

    async updateImage(imageId: number, data: any) {
        const response = await fetch(`${API_URL}/api/gallery/${imageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update image');
        return response.json();
    },

    async deleteImage(imageId: number) {
        const response = await fetch(`${API_URL}/api/gallery/${imageId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to delete image');
        return response.json();
    },

    async uploadImage(category: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/gallery/upload?category=${category}`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload image');
        return response.json();
    },

    async getSettings() {
        const response = await fetch(`${API_URL}/api/gallery/settings/display`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to load settings');
        return response.json();
    },

    async saveSettings(data: { gallery_count?: number; portfolio_count?: number }) {
        const response = await fetch(`${API_URL}/api/gallery/settings/display`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to save settings');
        return response.json();
    },
};
