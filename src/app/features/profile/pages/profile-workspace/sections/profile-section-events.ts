export type ProfileWorkspaceSection = 'about' | 'education' | 'languages' | 'certificates' | 'projects' | 'skills';

export interface ProjectNavigationRequest {
  projectId: number | string | null;
}
