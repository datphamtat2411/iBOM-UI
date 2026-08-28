export const API_BASE_URL = '/api';
export const REFRESH_TOKEN_PATH = `${API_BASE_URL}/auth/refresh-token`;
export const LOGIN_PATH = `${API_BASE_URL}/auth/login`;
export const REGISTRATION_CODE_PATH = `${API_BASE_URL}/auth/registration-code`;
export const REGISTRATION_PATH = `${API_BASE_URL}/auth/register`;
export const FORGOT_PASSWORD_PATH = `${API_BASE_URL}/auth/forgot-password`;
export const FORGOT_PASSWORD_VERIFY_PATH = `${FORGOT_PASSWORD_PATH}/verify`;
export const RESET_PASSWORD_PATH = `${API_BASE_URL}/auth/reset-password`;

export function isApiRequest(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}

export function isPublicAuthRequest(url: string): boolean {
  return isApiRequest(url) && url.startsWith(`${API_BASE_URL}/auth/`) && url !== REFRESH_TOKEN_PATH;
}
