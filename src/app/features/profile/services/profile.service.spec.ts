import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads summaries from the current user endpoint and unwraps data', () => {
    service.list().subscribe((profiles) => expect(profiles).toEqual([{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }]));
    const request = http.expectOne('/api/profiles/me');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 1, profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', updatedAt: '2026-01-01' }] });
  });

  it('loads detail from the selected Profile endpoint and unwraps data', () => {
    service.get('profile-1').subscribe((profile) => expect(profile.profileName).toBe('Backend CV'));
    const request = http.expectOne('/api/profiles/profile-1');
    expect(request.request.method).toBe('GET');
    request.flush({ data: { id: 'profile-1', profileName: 'Backend CV' } });
  });

  it('creates a Profile with the backend field names and unwraps the response', () => {
    const profile = { profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java' };
    service.create(profile).subscribe((created) => expect(created.id).toBe(2));
    const request = http.expectOne('/api/profiles');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(profile);
    request.flush({ data: { id: 2, ...profile } });
  });

  it('updates a Profile with the immutable name and current version', () => {
    const profile = { profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 6, personality: 'Methodical', technicalSummary: 'Angular and Java', version: 4 };
    service.update('profile/1', profile).subscribe((updated) => expect(updated.version).toBe(5));
    const request = http.expectOne('/api/profiles/profile%2F1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(profile);
    request.flush({ data: { id: 1, ...profile, version: 5 } });
  });

  it('deletes a Profile with an encoded URL and no request body', () => {
    service.delete('profile/1').subscribe((result) => expect(result).toBeUndefined());
    const request = http.expectOne('/api/profiles/profile%2F1');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ code: 200, message: 'Success', data: null, timestamp: '2026-01-01' });
  });
});
