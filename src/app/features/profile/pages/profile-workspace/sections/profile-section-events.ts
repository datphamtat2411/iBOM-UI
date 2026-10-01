export type ProfileWorkspaceSection = 'about' | 'education' | 'languages' | 'certificates' | 'projects' | 'skills';

export const PROFILE_WORKSPACE_SCROLL_STATE_KEY = 'profileWorkspaceScrollY';

export interface ProjectNavigationRequest {
  projectId: number | string | null;
}
