import axios from 'axios';

// When running on Vercel, this will use the VITE_API_URL environment variable (pointing to Fly.io).
// If running locally, it falls back to localhost:8080.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    getStatus: async () => {
        const res = await apiClient.get('/status');
        return res.data;
    },

    getLists: async () => {
        const res = await apiClient.get('/lists');
        return res.data;
    },

    createList: async (name) => {
        const res = await apiClient.post('/lists', { name });
        return res.data;
    },

    renameList: async (id, name) => {
        const res = await apiClient.put(`/lists/${id}`, { name });
        return res.data;
    },

    deleteList: async (id) => {
        const res = await apiClient.delete(`/lists/${id}`);
        return res.data;
    },

    getWhatsAppGroups: async () => {
        const res = await apiClient.get('/whatsapp-groups');
        return res.data;
    },

    getGroupsInList: async (listId) => {
        // Backend: GET /api/lists/:id/groups
        const res = await apiClient.get(`/lists/${listId}/groups`);
        return res.data;
    },

    addGroupToList: async (listId, wppId, name) => {
        // Backend: POST /api/lists/:id/groups
        const res = await apiClient.post(`/lists/${listId}/groups`, {
            wppId,
            name
        });
        return res.data;
    },

    removeGroupFromList: async (groupId) => {
        // Backend: DELETE /api/groups/:id
        const res = await apiClient.delete(`/groups/${groupId}`);
        return res.data;
    },

    sendBroadcast: async (listId, message) => {
        const res = await apiClient.post('/broadcast', { listId, message });
        return res.data;
    },

    getHistory: async () => {
        const res = await apiClient.get('/history');
        return res.data;
    }
};
