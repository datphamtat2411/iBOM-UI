import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FileNameFormatService } from './file-name-format.service';

describe('FileNameFormatService', () => {
  let service: FileNameFormatService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FileNameFormatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists paginated formats with the backend page contract', () => {
    const page = { content: [{ id: 1, name: 'Last name', pattern: '{LastName}', isDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-02' }], page: 1, size: 10, totalElements: 11, totalPages: 2 };
    service.list(1, 10).subscribe((result) => expect(result).toEqual(page));

    const request = http.expectOne((candidate) => candidate.url === '/api/master/file-name-formats');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    request.flush({ data: page });
  });

  it('creates and updates with only the name and controlled pattern', () => {
    const body = { name: 'Last name', pattern: '{LastName}-{FirstName}' };
    service.create(body).subscribe((result) => expect(result.id).toBe(2));
    const createRequest = http.expectOne('/api/master/file-name-formats');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(body);
    createRequest.flush({ data: { id: 2, ...body, isDefault: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' } });

    service.update('format/2', body).subscribe((result) => expect(result.id).toBe(2));
    const updateRequest = http.expectOne('/api/master/file-name-formats/format%2F2');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(body);
    updateRequest.flush({ data: { id: 2, ...body, isDefault: false, createdAt: '2026-01-01', updatedAt: '2026-01-02' } });
  });

  it('deletes an encoded format URL and propagates HTTP errors', () => {
    let error: unknown;
    service.delete('format/2').subscribe({ error: (value) => error = value });
    const request = http.expectOne('/api/master/file-name-formats/format%2F2');
    expect(request.request.method).toBe('DELETE');
    request.flush({ errorCode: 'FILE_NAME_FORMAT_REFERENCED_BY_PROFILE' }, { status: 409, statusText: 'Conflict' });
    expect(error).toEqual(jasmine.anything());
  });
});
