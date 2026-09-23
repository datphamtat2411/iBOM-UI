import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LanguageMasterService } from './language-master.service';

describe('LanguageMasterService', () => {
  let service: LanguageMasterService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(LanguageMasterService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists Languages with the trimmed search and requested page parameters', () => {
    const page = {
      content: [{ id: 2, name: 'English', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' }],
      page: 2,
      size: 10,
      totalElements: 11,
      totalPages: 2,
    };

    service.list(2, 10, '  eng  ').subscribe((result) => expect(result).toEqual(page));
    const request = http.expectOne((candidate) => candidate.url === '/api/master/languages');

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('eng');
    request.flush({ data: page });
  });

  it('uses the exact mutation methods, encoded ids, and name payload', () => {
    const language = { id: 3, name: '  Japanese  ', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' };

    service.create({ name: 'Japanese' }).subscribe((result) => expect(result).toEqual(language));
    const createRequest = http.expectOne('/api/master/languages');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ name: 'Japanese' });
    createRequest.flush({ data: language });

    service.update('language/3', { name: 'Japanese' }).subscribe((result) => expect(result).toEqual(language));
    const updateRequest = http.expectOne('/api/master/languages/language%2F3');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ name: 'Japanese' });
    updateRequest.flush({ data: language });

    service.delete('language/3').subscribe((result) => expect(result).toBeUndefined());
    const deleteRequest = http.expectOne('/api/master/languages/language%2F3');
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.body).toBeNull();
    deleteRequest.flush({ data: null });
  });
});
