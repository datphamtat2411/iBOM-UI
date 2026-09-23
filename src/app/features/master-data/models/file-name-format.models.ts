export type FileNamePlaceholder = 'LastName' | 'FirstName' | 'Role' | 'Date';
export type FileNameSeparator = '-' | '_';

export interface FileNameFormat {
  id: number | string;
  name: string;
  pattern: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileNameFormatPage {
  content: FileNameFormat[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FileNameFormatRequest {
  name: string;
  pattern: string;
}
