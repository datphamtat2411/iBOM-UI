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

  it('lists Education for the selected Profile and unwraps data', () => {
    service.listEducations('profile/1').subscribe((educations) => expect(educations).toEqual([{ id: 4, schoolName: 'North', degree: 'BSc', fieldOfStudy: null, startDate: '2020-09-01', endDate: null, status: 'ONGOING' }]));
    const request = http.expectOne('/api/profiles/profile%2F1/educations');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 4, schoolName: 'North', degree: 'BSc', fieldOfStudy: null, startDate: '2020-09-01', endDate: null, status: 'ONGOING' }] });
  });

  it('creates Education with the profile version and unwraps the mutation response', () => {
    const education = { schoolName: 'North', degree: 'BSc', fieldOfStudy: 'Computing', startDate: '2020-09-01', endDate: null, status: 'ONGOING' as const, version: 3 };
    service.createEducation('profile-1', education).subscribe((result) => expect(result.profileVersion).toBe(4));
    const request = http.expectOne('/api/profiles/profile-1/educations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(education);
    request.flush({ data: { education: { id: 5, ...education }, profileVersion: 4 } });
  });

  it('updates Education with an encoded record URL and unwraps the mutation response', () => {
    const education = { schoolName: 'South', degree: 'MSc', fieldOfStudy: null, startDate: '2021-09-01', endDate: '2023-06-30', status: 'COMPLETED' as const, version: 6 };
    service.updateEducation('profile-1', 'education/2', education).subscribe((result) => expect(result.education.degree).toBe('MSc'));
    const request = http.expectOne('/api/profiles/profile-1/educations/education%2F2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(education);
    request.flush({ data: { education: { id: 2, ...education }, profileVersion: 7 } });
  });

  it('deletes Education with the profile version in the JSON request body', () => {
    service.deleteEducation('profile-1', 8, 9).subscribe((result) => expect(result).toEqual({ profileVersion: 10 }));
    const request = http.expectOne('/api/profiles/profile-1/educations/8');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ profileVersion: 9 });
    request.flush({ data: { profileVersion: 10 } });
  });

  it('lists Profile Languages from the selected Profile endpoint and unwraps data', () => {
    service.listProfileLanguages('profile/1').subscribe((languages) => expect(languages).toEqual([{ profileLanguageId: 4, languageId: 2, languageName: 'English', level: 'ADVANCED' }]));
    const request = http.expectOne('/api/profiles/profile%2F1/languages');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ profileLanguageId: 4, languageId: 2, languageName: 'English', level: 'ADVANCED' }] });
  });

  it('creates Profile Language with the current Profile version and unwraps the mutation response', () => {
    const language = { languageId: 2, level: 'ADVANCED' as const, version: 3 };
    service.createProfileLanguage('profile-1', language).subscribe((result) => expect(result.profileVersion).toBe(4));
    const request = http.expectOne('/api/profiles/profile-1/languages');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(language);
    request.flush({ data: { profileLanguage: { profileLanguageId: 5, languageId: 2, languageName: 'English', level: 'ADVANCED' }, profileVersion: 4 } });
  });

  it('updates Profile Language with an encoded record URL and unwraps the mutation response', () => {
    const language = { languageId: 3, level: 'NATIVE' as const, version: 6 };
    service.updateProfileLanguage('profile-1', 'language/2', language).subscribe((result) => expect(result.profileLanguage.level).toBe('NATIVE'));
    const request = http.expectOne('/api/profiles/profile-1/languages/language%2F2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(language);
    request.flush({ data: { profileLanguage: { profileLanguageId: 2, languageId: 3, languageName: 'Japanese', level: 'NATIVE' }, profileVersion: 7 } });
  });

  it('deletes Profile Language with the Profile version in the JSON request body', () => {
    service.deleteProfileLanguage('profile-1', 8, 9).subscribe((result) => expect(result).toEqual({ profileVersion: 10 }));
    const request = http.expectOne('/api/profiles/profile-1/languages/8');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ profileVersion: 9 });
    request.flush({ data: { profileVersion: 10 } });
  });

  it('loads a complete paged Language Master response with trimmed search parameters', () => {
    service.listLanguageMaster(2, 10, '  eng  ').subscribe((page) => expect(page).toEqual({ content: [{ id: 2, name: 'English' }], page: 2, size: 10, totalElements: 11, totalPages: 2 }));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/languages');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('eng');
    request.flush({ data: { content: [{ id: 2, name: 'English' }], page: 2, size: 10, totalElements: 11, totalPages: 2 } });
  });
});
