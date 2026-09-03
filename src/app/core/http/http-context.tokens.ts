import { HttpContextToken } from '@angular/common/http';

export const IS_REFRESH_REQUEST = new HttpContextToken<boolean>(() => false);
export const IS_LOGOUT_REQUEST = new HttpContextToken<boolean>(() => false);
export const HAS_RETRIED_REQUEST = new HttpContextToken<boolean>(() => false);
