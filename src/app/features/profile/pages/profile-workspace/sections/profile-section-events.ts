export interface ProfileSectionMutationSuccess {
  profileId: string;
  previewInvalidated: boolean;
}

export interface ProjectNavigationRequest {
  projectId: number | string | null;
}
