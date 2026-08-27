export const API_BASE_URL = '/api';
export const REFRESH_TOKEN_PATH = `${API_BASE_URL}/auth/refresh-token`;

export function isApiRequest(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(`${API_BASE_URL}/`);
}

export function isPublicAuthRequest(url: string): boolean {
  return isApiRequest(url) && url.startsWith(`${API_BASE_URL}/auth/`) && url !== REFRESH_TOKEN_PATH;
}
