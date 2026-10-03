// frontend/src/services/authService.js
import authService from './auth.service.js';

export const loginUser = async (credentials) => {
  return await authService.login(credentials);
};

export default { loginUser };
