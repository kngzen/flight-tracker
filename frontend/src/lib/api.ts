import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: `${BASE}/api`,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username: string, password: string) => {
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);
  const res = await api.post("/auth/token", form);
  return res.data as { access_token: string; token_type: string };
};

// Flights
export const fetchFlights = async (year?: number) => {
  const res = await api.get("/flights", { params: year ? { year } : {} });
  return res.data;
};

export const createFlight = async (data: object) => {
  const res = await api.post("/flights", data);
  return res.data;
};

export const updateFlight = async (id: number, data: object) => {
  const res = await api.put(`/flights/${id}`, data);
  return res.data;
};

export const deleteFlight = async (id: number) => {
  await api.delete(`/flights/${id}`);
};

// Stats
export const fetchStats = async () => {
  const res = await api.get("/stats");
  return res.data;
};

// Airports
export const searchAirports = async (q: string) => {
  const res = await api.get("/airports/search", { params: { q } });
  return res.data.results;
};

// Airlines
export const searchAirlines = async (q: string) => {
  const res = await api.get("/airlines/search", { params: { q } });
  return res.data.results;
};

// Import
export const importOpenFlights = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/import/openflights", form);
  return res.data;
};
