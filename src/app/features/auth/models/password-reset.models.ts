export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyPasswordCodeRequest {
  email: string;
  verificationCode: string;
}

export interface ResetPasswordRequest {
  email: string;
  verificationCode: string;
  password: string;
}
