import { api } from './api';
import type { LoginInput, ChangePasswordInput } from '../../../server/src/validators/auth.validators';

export class AuthService {
  static async login(credentials: LoginInput) {
    const response = await api.post('/auth/login', credentials);
    return response.data.data;
  }

  static async refresh() {
    const response = await api.post('/auth/refresh');
    return response.data.data;
  }

  static async logout() {
    const response = await api.post('/auth/logout');
    return response.data.data;
  }

  static async changePassword(passwords: ChangePasswordInput) {
    const response = await api.post('/auth/change-password', passwords);
    return response.data.data;
  }
}
export default AuthService;
