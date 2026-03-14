import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Inject JWT from localStorage on every request
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('wpp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// On 401, clear token and redirect to login
apiClient.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('wpp_token');
            localStorage.removeItem('wpp_email');
            window.location.reload();
        }
        return Promise.reject(err);
    }
);

export const api = {
    // Auth
    login: async (email: string, password: string) => {
        const res = await apiClient.post('/auth/login', { email, password });
        return res.data; // { token, email }
    },
    register: async (email: string, password: string) => {
        const res = await apiClient.post('/auth/register', { email, password });
        return res.data; // { token, email }
    },

    // WhatsApp
    getStatus: async () => {
        const res = await apiClient.get('/wpp/status');
        return res.data;
    },
    requestPairingCode: async (phone: string) => {
        const res = await apiClient.post('/wpp/request-pairing-code', { phone });
        return res.data;
    },
    disconnectWhatsApp: async () => {
        const res = await apiClient.post('/wpp/disconnect');
        return res.data;
    },

    // Groups
    getWhatsAppGroups: async (forceRefresh = false) => {
        const res = await apiClient.get('/wpp/groups', { params: forceRefresh ? { refresh: 'true' } : {} });
        return res.data;
    },

    // Lists
    getLists: async () => {
        const res = await apiClient.get('/lists');
        return res.data;
    },
    createList: async (name: string) => {
        const res = await apiClient.post('/lists', { name });
        return res.data;
    },
    renameList: async (id: any, name: string) => {
        const res = await apiClient.put(`/lists/${id}`, { name });
        return res.data;
    },
    deleteList: async (id: any) => {
        const res = await apiClient.delete(`/lists/${id}`);
        return res.data;
    },

    // Groups in lists
    getGroupsInList: async (listId: any) => {
        const res = await apiClient.get(`/lists/${listId}/groups`);
        return res.data;
    },
    addGroupToList: async (listId: any, wppId: string, name: string) => {
        const res = await apiClient.post(`/lists/${listId}/groups`, { wppId, name });
        return res.data;
    },
    removeGroupFromList: async (groupId: any) => {
        const res = await apiClient.delete(`/groups/${groupId}`);
        return res.data;
    },

    // Broadcast
    sendBroadcast: async (listId: any, message: string) => {
        const res = await apiClient.post('/broadcast', { listId, message });
        return res.data;
    },

    // History
    getHistory: async () => {
        const res = await apiClient.get('/history');
        return res.data;
    },
};
