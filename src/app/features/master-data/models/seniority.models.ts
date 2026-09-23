export interface Seniority {
  id: number | string;
  name: string;
  fromExperience: number;
  toExperience: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeniorityRequest {
  name: string;
  fromExperience: number;
  toExperience: number | null;
}
