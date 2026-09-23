export interface Skill {
  id: number | string;
  name: string;
  categoryId: number | string;
  categoryCode: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export type SkillResponse = Skill;

export interface SkillCategory {
  id: number | string;
  code: string;
  name: string;
}

export interface SkillPage {
  content: Skill[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SkillMutationRequest {
  name: string;
  categoryId: number | string;
}
