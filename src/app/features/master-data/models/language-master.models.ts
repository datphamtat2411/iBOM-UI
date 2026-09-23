export interface LanguageMaster {
  id: number | string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageMasterPage {
  content: LanguageMaster[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LanguageMasterRequest {
  name: string;
}
