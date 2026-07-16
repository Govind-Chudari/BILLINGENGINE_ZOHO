import axios from "axios";

// backend URL
const BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === "production" ? "https://billflow-backend-production.up.railway.app" : "http://127.0.0.1:5000");

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// AUTH
export const authAPI = {
  register: (username, email, password) =>
    api.post("/api/register", { username, email, password }),

  login: (username, password) => api.post("/api/login", { username, password }),

  getProfile: () => api.get("/api/profile"),

  upgradePlan: (plan) => api.post("/api/profile/upgrade-plan", { plan }),
};

// OBJECTS
export const objectsAPI = {
  upload: (formData) =>
    api.post("/api/objects/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  list: (sort = "date") => api.get(`/api/objects/list?sort=${sort}`),

  download: (filename) =>
    api.get(`/api/objects/download/${filename}`, { responseType: "blob" }),

  delete: (filename) => api.delete(`/api/objects/${filename}`),

  deleteMultiple: (filenames = [], deleteAll = false) =>
    api.post("/api/objects/delete-multiple", { filenames, delete_all: deleteAll }),

  storageInfo: () => api.get("/api/objects/storage"),
  
  optimize: () => api.get("/api/objects/optimize"),

  verify: (id) => api.get(`/api/objects/verify/${id}`),
};

// USAGE
export const usageAPI = {
  today: () => api.get("/api/usage/today"),
  history: (days = 30) => api.get(`/api/usage/history?days=${days}`),
  currentMonth: () => api.get("/api/usage/current-month"),
  monthly: (year, month) =>
    api.get(`/api/usage/monthly?year=${year}&month=${month}`),
  alltime: () => api.get("/api/usage/alltime"),
  anomaly: () => api.get("/api/usage/anomaly"),
};

// BILLING
export const billingAPI = {
  estimate: () => api.get("/api/billing/estimate"),
  calculate: (year, month) =>
    api.get(`/api/billing/calculate?year=${year}&month=${month}`),
  generate: (year, month) => api.post("/api/billing/generate", { year, month }),
  listInvoices: () => api.get("/api/billing/invoices"),
  getInvoice: (id) => api.get(`/api/billing/invoices/${id}`),
  payInvoice: (id) => api.post(`/api/billing/invoices/${id}/pay`),
  verify: (id) => api.get(`/api/billing/verify/${id}`),
  predict: () => api.get("/api/billing/predict"),
  setBudget: (budget_limit) => api.post("/api/billing/budget", { budget_limit }),
};

// AI
export const aiAPI = {
  chat: (message) => api.post("/api/ai/chat", { message }),
};

// ADMIN endpoints
export const adminAPI = {
  overview: () => api.get("/api/admin/overview"),
  platformStats: () => api.get("/api/admin/platform-stats"),
  listUsers: (params = {}) => api.get("/api/admin/users", { params }),
  getUser: (id) => api.get(`/api/admin/users/${id}`),
  updateRole: (id, role) => api.put(`/api/admin/users/${id}/role`, { role }),
  allInvoices: (params = {}) => api.get("/api/admin/invoices", { params }),
  generateInvoice: (userId, year, month) =>
    api.post(`/api/admin/users/${userId}/generate-invoice`, { year, month }),
  payInvoice: (invoiceId) => api.post(`/api/admin/invoices/${invoiceId}/pay`),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
};

export default api;
