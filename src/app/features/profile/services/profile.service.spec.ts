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

  it('requests the backend-generated Preview PDF with an encoded Profile ID and Blob response', () => {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' });
    service.preview('profile/1').subscribe((result) => expect(result).toBe(pdf));
    const request = http.expectOne('/api/cv/preview/profile%2F1');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(pdf, { headers: { 'Content-Type': 'application/pdf' } });
  });

  it('loads paginated File Name Formats and unwraps the response page', () => {
    const page = { content: [{ id: 4, name: 'Name - Title' }], page: 1, size: 10, totalElements: 11, totalPages: 2 };
    service.listFileNameFormats(1, 10).subscribe((result) => expect(result).toEqual(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/file-name-formats');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    request.flush({ data: page });
  });

  it('requests an encoded export with a format, optional File Name Format, Blob response, and response headers', () => {
    const docx = new Blob(['docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    service.download('profile/1', 'docx', 7).subscribe((response) => {
      expect(response.body).toBe(docx);
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="backend.docx"');
    });
    const request = http.expectOne((candidate) => candidate.url === '/api/cv/download/profile%2F1');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('format')).toBe('docx');
    expect(request.request.params.get('fileNameFormatId')).toBe('7');
    expect(request.request.responseType).toBe('blob');
    request.flush(docx, { headers: { 'Content-Disposition': 'attachment; filename="backend.docx"' } });
  });

  it('omits File Name Format from Automatic exports', () => {
    service.download('profile-1', 'pdf').subscribe();
    const request = http.expectOne((candidate) => candidate.url === '/api/cv/download/profile-1');
    expect(request.request.params.get('format')).toBe('pdf');
    expect(request.request.params.has('fileNameFormatId')).toBeFalse();
    request.flush(new Blob(['pdf'], { type: 'application/pdf' }), { headers: { 'Content-Disposition': 'attachment; filename="backend.pdf"' } });
  });

  it('creates a Profile with the backend field names and unwraps the response', () => {
    const profile = { profileName: 'Backend CV', firstName: 'A', lastName: 'User', jobTitle: 'Engineer', yearsOfExperience: 5, personality: 'Methodical', technicalSummary: 'Angular and Java' };
    service.create(profile).subscribe((created) => expect(created.id).toBe(2));
    const request = http.expectOne('/api/profiles');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(profile);
    request.flush({ data: { id: 2, ...profile } });
  });

  it('copies a Profile with an encoded source URL and only the new Profile name', () => {
    const requestBody = { profileName: 'Copied CV' };
    service.copy('profile/1', requestBody).subscribe((copied) => expect(copied.id).toBe(2));
    const request = http.expectOne('/api/profiles/profile%2F1/copy');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ data: { id: 2, profileName: 'Copied CV' } });
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

  it('lists Projects for the selected Profile and unwraps data in backend order', () => {
    const projects = [{ id: 4, name: 'Orders', description: 'Order flow', startDate: null, endDate: null, status: 'ONGOING' as const, position: 'Lead', teamSize: null, responsibilities: null, programmingLanguages: null, tools: null }];
    service.listProjects('profile/1').subscribe((result) => expect(result).toEqual(projects));
    const request = http.expectOne('/api/profiles/profile%2F1/projects');
    expect(request.request.method).toBe('GET');
    request.flush({ data: projects });
  });

  it('creates and updates Projects with the current Profile version', () => {
    const project = {
      name: 'Orders',
      description: 'Modernized order flow',
      startDate: '2025-01-01',
      endDate: null,
      status: 'ONGOING' as const,
      position: 'Lead',
      teamSize: 5,
      responsibilities: 'Design services',
      programmingLanguages: 'Java',
      tools: 'Kafka',
      version: 3,
    };
    service.createProject('profile-1', project).subscribe((result) => expect(result.profileVersion).toBe(4));
    const createRequest = http.expectOne('/api/profiles/profile-1/projects');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(project);
    createRequest.flush({ data: { project: { id: 5, ...project }, profileVersion: 4 } });

    service.updateProject('profile-1', 'project/2', { ...project, name: 'Updated Orders', version: 4 }).subscribe((result) => expect(result.project.name).toBe('Updated Orders'));
    const updateRequest = http.expectOne('/api/profiles/profile-1/projects/project%2F2');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ ...project, name: 'Updated Orders', version: 4 });
    updateRequest.flush({ data: { project: { id: 2, ...project, name: 'Updated Orders' }, profileVersion: 5 } });
  });

  it('deletes a Project with the Profile version in the JSON request body', () => {
    service.deleteProject('profile-1', 8, 9).subscribe((result) => expect(result).toEqual({ profileVersion: 10 }));
    const request = http.expectOne('/api/profiles/profile-1/projects/8');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ profileVersion: 9 });
    request.flush({ data: { profileVersion: 10 } });
  });

  it('lists Certificates for the selected Profile and unwraps data', () => {
    service.listCertificates('profile/1').subscribe((certificates) => expect(certificates).toEqual([{ id: 4, certificateName: 'AWS Developer', issueDate: '2025-04-01' }]));
    const request = http.expectOne('/api/profiles/profile%2F1/certificates');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 4, certificateName: 'AWS Developer', issueDate: '2025-04-01' }] });
  });

  it('creates and updates Certificates with the current Profile version', () => {
    const certificate = { certificateName: 'AWS Developer', issueDate: '2025-04-01', version: 3 };
    service.createCertificate('profile-1', certificate).subscribe((result) => expect(result.profileVersion).toBe(4));
    const createRequest = http.expectOne('/api/profiles/profile-1/certificates');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(certificate);
    createRequest.flush({ data: { certificate: { id: 5, ...certificate }, profileVersion: 4 } });

    service.updateCertificate('profile-1', 'certificate/2', { ...certificate, issueDate: '2024-04-01', version: 4 }).subscribe((result) => expect(result.certificate.issueDate).toBe('2024-04-01'));
    const updateRequest = http.expectOne('/api/profiles/profile-1/certificates/certificate%2F2');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ ...certificate, issueDate: '2024-04-01', version: 4 });
    updateRequest.flush({ data: { certificate: { id: 2, certificateName: 'AWS Developer', issueDate: '2024-04-01' }, profileVersion: 5 } });
  });

  it('deletes a Certificate with the Profile version in the JSON request body', () => {
    service.deleteCertificate('profile-1', 8, 9).subscribe((result) => expect(result).toEqual({ profileVersion: 10 }));
    const request = http.expectOne('/api/profiles/profile-1/certificates/8');
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

  it('lists Profile Skills from the selected Profile endpoint and unwraps data', () => {
    const skills = [{ profileSkillId: 4, skillId: 2, skillName: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', experienceYears: 7.5, lastUsed: null }];
    service.listProfileSkills('profile/1').subscribe((result) => expect(result).toEqual(skills));
    const request = http.expectOne('/api/profiles/profile%2F1/skills');
    expect(request.request.method).toBe('GET');
    request.flush({ data: skills });
  });

  it('creates and updates Profile Skills with the current Profile version', () => {
    const skill = { skillId: 2, experienceYears: 7.5, lastUsed: '2025-04-01', version: 3 };
    service.createProfileSkill('profile-1', skill).subscribe((result) => expect(result.profileVersion).toBe(4));
    const createRequest = http.expectOne('/api/profiles/profile-1/skills');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(skill);
    createRequest.flush({ data: { profileSkill: { profileSkillId: 5, ...skill, skillName: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' }, profileVersion: 4 } });

    service.updateProfileSkill('profile-1', 'skill/2', { ...skill, experienceYears: 8, version: 4 }).subscribe((result) => expect(result.profileSkill.experienceYears).toBe(8));
    const updateRequest = http.expectOne('/api/profiles/profile-1/skills/skill%2F2');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ ...skill, experienceYears: 8, version: 4 });
    updateRequest.flush({ data: { profileSkill: { profileSkillId: 2, ...skill, experienceYears: 8, skillName: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' }, profileVersion: 5 } });
  });

  it('deletes Profile Skills with the Profile version in the JSON request body', () => {
    service.deleteProfileSkill('profile-1', 8, 9).subscribe((result) => expect(result).toEqual({ profileVersion: 10 }));
    const request = http.expectOne('/api/profiles/profile-1/skills/8');
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

  it('loads a complete paged Skill Master response with trimmed search parameters', () => {
    const page = { content: [{ id: 2, name: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend' }], page: 2, size: 10, totalElements: 21, totalPages: 3 };
    service.listSkillMaster(2, 10, '  jav  ').subscribe((result) => expect(result).toEqual(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/skills');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('jav');
    request.flush({ data: page });
  });
});
