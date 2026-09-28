import axios from 'axios';

export const javaApi = axios.create({ baseURL: 'http://localhost:8080/api' });
export const aiApi = axios.create({ baseURL: 'http://localhost:8000/v1' });

javaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

aiApi.interceptors.request.use((config) => {
  config.headers['X-Internal-Token'] = 'changeme_to_at_least_16_chars_long';
  return config;
});

const handleEnvelope = (response) => {
  const payload = response.data;
  if (payload && typeof payload.success === 'boolean') {
    if (payload.success) return payload.data;
    throw payload; 
  }
  return payload; 
};

const handleErrorEnvelope = (error) => {
  if (error.response?.data && typeof error.response.data.success === 'boolean') {
    return Promise.reject(error.response.data);
  }
  return Promise.reject(error);
};

javaApi.interceptors.response.use(handleEnvelope, handleErrorEnvelope);
aiApi.interceptors.response.use(handleEnvelope, handleErrorEnvelope);
