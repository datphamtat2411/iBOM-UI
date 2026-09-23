import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SeniorityService } from './seniority.service';

describe('SeniorityService', () => {
  let service: SeniorityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SeniorityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists Seniority records and unwraps the response data', () => {
    const seniority = { id: 1, name: 'Junior', fromExperience: 0, toExperience: 3, createdAt: '2026-01-01', updatedAt: '2026-01-02' };
    service.list().subscribe((seniorities) => expect(seniorities).toEqual([seniority]));

    const request = http.expectOne('/api/master/seniority');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [seniority] });
  });

  it('creates Seniority with the nullable range payload', () => {
    const payload = { name: 'Senior', fromExperience: 5, toExperience: null };
    service.create(payload).subscribe((seniority) => expect(seniority.id).toBe(2));

    const request = http.expectOne('/api/master/seniority');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ data: { id: 2, ...payload } });
  });

  it('updates Seniority with an encoded id and unwraps the response data', () => {
    const payload = { name: 'Senior', fromExperience: 5, toExperience: 10 };
    service.update('seniority/2', payload).subscribe((seniority) => expect(seniority.name).toBe('Senior'));

    const request = http.expectOne('/api/master/seniority/seniority%2F2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({ data: { id: 2, ...payload } });
  });

  it('deletes Seniority with an encoded id and maps the response to void', () => {
    service.delete('seniority/2').subscribe((result) => expect(result).toBeUndefined());

    const request = http.expectOne('/api/master/seniority/seniority%2F2');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ data: null });
  });
});
