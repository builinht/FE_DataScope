import axios from "axios";

const API_BASE = import.meta.env.VITE_BACKEND_API_URL || "/api"; // fallback to relative /api
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY || "";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "x-api-key": BACKEND_API_KEY,
  },
  timeout: 15000,
});

export default api;
