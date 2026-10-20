import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Có /api khớp với URL bạn vừa test
});

export default api;