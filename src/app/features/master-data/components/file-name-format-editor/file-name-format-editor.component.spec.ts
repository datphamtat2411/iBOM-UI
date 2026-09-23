import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { FileNameFormatService } from '../../services/file-name-format.service';
import { FileNameFormatEditorComponent, parseFileNamePattern, serializeFileNamePattern } from './file-name-format-editor.component';

describe('FileNameFormatEditorComponent', () => {
  let fixture: ComponentFixture<FileNameFormatEditorComponent>;
  let formats: { create: jasmine.Spy; update: jasmine.Spy };

  const savedFormat = {
    id: 4,
    name: 'Last first date',
    pattern: '{LastName}__{FirstName}-{Date}',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(async () => {
    formats = { create: jasmine.createSpy('create'), update: jasmine.createSpy('update') };
    await TestBed.configureTestingModule({
      imports: [FileNameFormatEditorComponent],
      providers: [{ provide: FileNameFormatService, useValue: formats }],
    }).compileComponents();
    fixture = TestBed.createComponent(FileNameFormatEditorComponent);
    fixture.detectChanges();
  });

  it('parses and serializes only supported placeholders and separator runs', () => {
    const segments = parseFileNamePattern('{LastName}__{Role}-{Date}');
    expect(segments).toEqual([
      { kind: 'placeholder', value: 'LastName' },
      { kind: 'separator', value: '__' },
      { kind: 'placeholder', value: 'Role' },
      { kind: 'separator', value: '-' },
      { kind: 'placeholder', value: 'Date' },
    ]);
    expect(serializeFileNamePattern(segments!)).toBe('{LastName}__{Role}-{Date}');
    expect(parseFileNamePattern('{Unknown}')).toBeNull();
    expect(parseFileNamePattern('plain-text')).toBeNull();
  });

  it('supports controlled add, duplicate prevention, separator changes, removal, and placeholder reordering', () => {
    const editor = fixture.componentInstance;
    editor.addPlaceholder('LastName');
    editor.addSeparator('-');
    editor.addPlaceholder('FirstName');
    editor.addPlaceholder('FirstName');
    expect(editor.patternSegments.length).toBe(3);

    editor.movePlaceholder(2, -1);
    expect(editor.serializedPattern()).toBe('{FirstName}-{LastName}');
    editor.changeSeparator(1, { target: { value: '_' } } as unknown as Event);
    expect(editor.serializedPattern()).toBe('{FirstName}_{LastName}');
    editor.removeSegment(1);
    expect(editor.serializedPattern()).toBe('{FirstName}{LastName}');
  });

  it('requires a placeholder and sends a trimmed name with the serialized builder pattern', () => {
    const editor = fixture.componentInstance;
    formats.create.and.returnValue(of(savedFormat));
    editor.formatForm.controls.name.setValue('  Export format  ');
    editor.submit();
    expect(formats.create).not.toHaveBeenCalled();
    expect(editor.patternError).toContain('at least one placeholder');

    editor.addPlaceholder('Role');
    editor.submit();
    expect(formats.create).toHaveBeenCalledWith({ name: 'Export format', pattern: '{Role}' });
  });

  it('reconstructs an existing pattern and disables unsafe edit patterns', () => {
    fixture.componentInstance.format = savedFormat;
    fixture.detectChanges();
    expect(fixture.componentInstance.serializedPattern()).toBe(savedFormat.pattern);
    expect(fixture.componentInstance.isBuilderValid()).toBeTrue();

    fixture.componentInstance.format = { ...savedFormat, id: 5, pattern: '{LastName}/bad' };
    fixture.detectChanges();
    expect(fixture.componentInstance.invalidExistingPattern).toBeTrue();
    expect(fixture.componentInstance.canSubmit()).toBeFalse();
  });

  it('keeps the dialog values after duplicate and validation failures', () => {
    const editor = fixture.componentInstance;
    editor.formatForm.controls.name.setValue('Existing');
    editor.addPlaceholder('LastName');
    formats.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'FILE_NAME_FORMAT_NAME_ALREADY_EXISTS' } })));
    editor.submit();
    expect(editor.formatForm.controls.name.value).toBe('Existing');
    expect(editor.patternSegments).toEqual([{ kind: 'placeholder', value: 'LastName' }]);
    expect(editor.errorMessage).toContain('different Format Name');

    formats.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'pattern', message: 'Pattern invalid' }] } } })));
    editor.submit();
    expect(editor.patternSegments).toEqual([{ kind: 'placeholder', value: 'LastName' }]);
    expect(editor.patternError).toBe('Pattern invalid');
  });
});
