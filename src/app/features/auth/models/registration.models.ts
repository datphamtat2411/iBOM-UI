export interface RegistrationCodeRequest {
  email: string;
}

export interface RegistrationRequest {
  email: string;
  username: string;
  password: string;
  verificationCode: string;
}
