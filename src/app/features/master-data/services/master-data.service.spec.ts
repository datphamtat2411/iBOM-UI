import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MasterDataService } from './master-data.service';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(MasterDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists Skills with the paged, trimmed search contract and unwraps data', () => {
    const page = { content: [{ id: 2, name: 'Java', categoryId: 1, categoryCode: 'BACKEND', categoryName: 'Backend', createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-02T08:00:00Z' }], page: 2, size: 10, totalElements: 21, totalPages: 3 };
    service.listSkills(2, 10, '  jav  ').subscribe((result) => expect(result).toEqual(page));

    const request = http.expectOne((candidate) => candidate.url === '/api/master/skills');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('search')).toBe('jav');
    request.flush({ data: page });
  });

  it('loads controlled Skill Categories', () => {
    const categories = [{ id: 1, code: 'BACKEND', name: 'Backend' }];
    service.listSkillCategories().subscribe((result) => expect(result).toEqual(categories));

    const request = http.expectOne('/api/master/skill-categories');
    expect(request.request.method).toBe('GET');
    request.flush({ data: categories });
  });

  it('uses exact Skill mutation payloads and encoded mutation URLs', () => {
    const payload = { name: 'Java', categoryId: 1 };
    const skill = { id: 4, ...payload, categoryCode: 'BACKEND', categoryName: 'Backend', createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' };

    service.createSkill(payload).subscribe((result) => expect(result).toEqual(skill));
    const create = http.expectOne('/api/master/skills');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ data: skill });

    service.updateSkill('skill/4', payload).subscribe((result) => expect(result).toEqual(skill));
    const update = http.expectOne('/api/master/skills/skill%2F4');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(payload);
    update.flush({ data: skill });

    service.deleteSkill('skill/4').subscribe((result) => expect(result).toBeUndefined());
    const deletion = http.expectOne('/api/master/skills/skill%2F4');
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toBeNull();
    deletion.flush({ data: null });
  });
});
