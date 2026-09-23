import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { FileNameFormatService } from '../../services/file-name-format.service';
import { FileNameFormatEditorComponent, analyzeFileNamePattern, parseFileNamePattern, serializeFileNamePattern } from './file-name-format-editor.component';

describe('FileNameFormatEditorComponent', () => {
  let fixture: ComponentFixture<FileNameFormatEditorComponent>;
  let formats: { create: jasmine.Spy; update: jasmine.Spy };

  const savedFormat = {
    id: 4,
    name: 'Last first date',
    pattern: '{LastName}_{FirstName}_{Date}',
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

  it('reconstructs and serializes None, underscore, and hyphen patterns exactly', () => {
    expect(parseFileNamePattern('{LastName}{Role}{Date}')).toEqual({
      placeholders: ['LastName', 'Role', 'Date'],
      separator: 'none',
    });
    expect(parseFileNamePattern('{LastName}_{Role}_{Date}')).toEqual({
      placeholders: ['LastName', 'Role', 'Date'],
      separator: '_',
    });
    expect(parseFileNamePattern('{LastName}-{Role}-{Date}')).toEqual({
      placeholders: ['LastName', 'Role', 'Date'],
      separator: '-',
    });
    expect(serializeFileNamePattern({ placeholders: ['LastName', 'Role'], separator: 'none' })).toBe('{LastName}{Role}');
    expect(serializeFileNamePattern({ placeholders: ['LastName', 'Role'], separator: '_' })).toBe('{LastName}_{Role}');
    expect(serializeFileNamePattern({ placeholders: ['LastName', 'Role'], separator: '-' })).toBe('{LastName}-{Role}');
  });

  it('keeps placeholders unique, exposes only unused choices, and updates preview immediately', () => {
    const editor = fixture.componentInstance;
    editor.addPlaceholder('LastName');
    editor.addPlaceholder('FirstName');
    editor.addPlaceholder('FirstName');
    expect(editor.patternState.placeholders).toEqual(['LastName', 'FirstName']);
    expect(editor.availablePlaceholders().map((option) => option.value)).toEqual(['Role', 'Date']);

    editor.setSeparator('_');
    expect(editor.serializedPattern()).toBe('{LastName}_{FirstName}');
    editor.removePlaceholder(0);
    expect(editor.patternState.placeholders).toEqual(['FirstName']);
    expect(editor.availablePlaceholders().map((option) => option.value)).toEqual(['LastName', 'Role', 'Date']);
  });

  it('reconstructs recoverable separator arrangements and requires explicit normalization', () => {
    const editor = fixture.componentInstance;
    const pattern = '{LastName}-{FirstName}_{Role}_{Date}';
    editor.format = { ...savedFormat, id: 10, pattern };
    fixture.detectChanges();

    expect(analyzeFileNamePattern(pattern)).toEqual({
      kind: 'recoverable',
      placeholders: ['LastName', 'FirstName', 'Role', 'Date'],
    });
    expect(editor.invalidExistingPattern).toBeFalse();
    expect(editor.normalizationPending).toBeTrue();
    expect(editor.patternState.placeholders).toEqual(['LastName', 'FirstName', 'Role', 'Date']);
    expect(editor.serializedPattern()).toBe(pattern);
    expect(editor.canSubmit()).toBeFalse();

    const separatorButtons = Array.from(fixture.nativeElement.querySelectorAll('.separator-control button')) as HTMLButtonElement[];
    expect(separatorButtons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);

    editor.addPlaceholder('Role');
    editor.removePlaceholder(0);
    editor.replacePlaceholder(0, 'Role');
    editor.movePlaceholder(0, 1);
    expect(editor.patternState.placeholders).toEqual(['LastName', 'FirstName', 'Role', 'Date']);
  });

  it('keeps patterns with mixed empty and separator gaps pending until explicit selection', () => {
    const patterns = [
      '{LastName}{FirstName}_{Date}',
      '{LastName}_{FirstName}{Date}',
      '{LastName}{FirstName}-{Date}',
    ];

    for (const [index, pattern] of patterns.entries()) {
      const editor = fixture.componentInstance;
      editor.format = { ...savedFormat, id: `mixed-gap-${index}`, pattern };
      fixture.detectChanges();

      expect(analyzeFileNamePattern(pattern)).toEqual({
        kind: 'recoverable',
        placeholders: ['LastName', 'FirstName', 'Date'],
      });
      expect(editor.normalizationPending).toBeTrue();
      expect(editor.patternState).toEqual({ placeholders: ['LastName', 'FirstName', 'Date'], separator: 'none' });
      expect(editor.serializedPattern()).toBe(pattern);
      expect(editor.canSubmit()).toBeFalse();

      editor.submit();
      expect(formats.update).not.toHaveBeenCalled();
    }
  });

  it('normalizes the complete recovered Pattern only after selecting one global separator', () => {
    const editor = fixture.componentInstance;
    const pattern = '{LastName}-{FirstName}_{Role}_{Date}';
    const normalizedPatterns = new Map([
      ['_', '{LastName}_{FirstName}_{Role}_{Date}'],
      ['-', '{LastName}-{FirstName}-{Role}-{Date}'],
      ['none', '{LastName}{FirstName}{Role}{Date}'],
    ]);

    for (const [separator, normalizedPattern] of normalizedPatterns) {
      editor.format = { ...savedFormat, id: `normalize-${separator}`, pattern };
      fixture.detectChanges();
      editor.setSeparator(separator);

      expect(editor.normalizationPending).toBeFalse();
      expect(editor.serializedPattern()).toBe(normalizedPattern);
      expect(editor.canSubmit()).toBeTrue();
    }
  });

  it('re-enables builder edits and sends the normalized Pattern after resolution', () => {
    const editor = fixture.componentInstance;
    const pattern = '{LastName}-{FirstName}_{Date}';
    formats.update.and.returnValue(of(savedFormat));
    editor.format = { ...savedFormat, id: 11, pattern };
    fixture.detectChanges();

    editor.setSeparator('_');
    editor.addPlaceholder('Role');
    editor.submit();

    expect(formats.update).toHaveBeenCalledWith(11, {
      name: savedFormat.name,
      pattern: '{LastName}_{FirstName}_{Date}_{Role}',
    });
  });

  it('allows replacement only with an unused placeholder and hides replacement when all are selected', () => {
    const editor = fixture.componentInstance;
    editor.addPlaceholder('LastName');
    editor.addPlaceholder('FirstName');
    editor.addPlaceholder('Role');
    expect(editor.availablePlaceholdersFor(1).map((option) => option.value)).toEqual(['Date']);
    editor.replacePlaceholder(1, 'Date');
    expect(editor.patternState.placeholders).toEqual(['LastName', 'Date', 'Role']);
    editor.addPlaceholder('FirstName');
    expect(editor.availablePlaceholdersFor(0).length).toBe(0);

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.replacement-control').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.placeholder-value').length).toBe(4);

    editor.removePlaceholder(3);
    fixture.detectChanges();
    const replacementSelects = Array.from(fixture.nativeElement.querySelectorAll('.replacement-control select')) as HTMLSelectElement[];
    expect(replacementSelects.map((select) => select.value)).toEqual(['LastName', 'Date', 'Role']);
    expect((replacementSelects[0].options[0] as HTMLOptionElement).disabled).toBeFalse();
    const replacementSelect = replacementSelects[0];
    replacementSelect.value = 'FirstName';
    replacementSelect.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(editor.patternState.placeholders).toEqual(['FirstName', 'Date', 'Role']);
    expect(editor.availablePlaceholders().map((option) => option.value)).toEqual(['LastName']);
  });

  it('requires at least one placeholder and sends a trimmed name with the builder pattern', () => {
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

  it('keeps Create patterns limited to one global separator', () => {
    const editor = fixture.componentInstance;
    editor.formatForm.controls.name.setValue('Export format');
    editor.addPlaceholder('LastName');
    editor.addPlaceholder('FirstName');
    editor.setSeparator('_');

    expect(editor.serializedPattern()).toBe('{LastName}_{FirstName}');
    expect(editor.serializedPattern()).not.toBe('{LastName}-{FirstName}');
  });

  it('shows the exact blank Format Name message and does not submit', () => {
    const editor = fixture.componentInstance;
    editor.addPlaceholder('Role');
    editor.formatForm.controls.name.setValue('   ');
    editor.submit();
    fixture.detectChanges();

    expect(formats.create).not.toHaveBeenCalled();
    expect(editor.nameFieldError()).toBe('Please enter Format Name.');
    expect(fixture.nativeElement.textContent).toContain('Please enter Format Name.');
  });

  it('accepts Format Names through 255 characters', () => {
    const editor = fixture.componentInstance;
    formats.create.and.returnValue(of(savedFormat));
    editor.formatForm.controls.name.setValue('a'.repeat(255));
    editor.addPlaceholder('Date');
    editor.submit();
    expect(formats.create).toHaveBeenCalledWith({ name: 'a'.repeat(255), pattern: '{Date}' });
  });

  it('recovers repeated, prefix, and suffix separator-only literals', () => {
    const recoverablePatterns = [
      '{LastName}__{FirstName}',
      '_{LastName}_{FirstName}',
      '{LastName}_{FirstName}_',
    ];

    for (const [index, pattern] of recoverablePatterns.entries()) {
      fixture.componentInstance.format = { ...savedFormat, id: index + 20, pattern };
      fixture.detectChanges();
      expect(fixture.componentInstance.invalidExistingPattern).toBeFalse();
      expect(fixture.componentInstance.normalizationPending).toBeTrue();
      expect(fixture.componentInstance.patternState.placeholders).toEqual(['LastName', 'FirstName']);
    }
  });

  it('preserves genuinely incompatible patterns read-only and blocks save', () => {
    const incompatiblePatterns = [
      '{LastName}_{LastName}',
      '{LastName}_{Unknown}',
      '{LastName',
      '{LastName}_free_{Date}',
    ];

    for (const [index, pattern] of incompatiblePatterns.entries()) {
      fixture.componentInstance.format = { ...savedFormat, id: index + 5, pattern };
      fixture.detectChanges();
      expect(parseFileNamePattern(pattern)).toBeNull();
      expect(fixture.componentInstance.invalidExistingPattern).toBeTrue();
      expect(fixture.componentInstance.serializedPattern()).toBe(pattern);
      expect(fixture.componentInstance.canSubmit()).toBeFalse();
    }
  });

  it('reorders with native drop and keyboard arrows without visible Up or Down controls', () => {
    const editor = fixture.componentInstance;
    editor.addPlaceholder('LastName');
    editor.addPlaceholder('Role');
    editor.addPlaceholder('Date');
    editor.dropPlaceholder(0, {
      preventDefault: jasmine.createSpy('preventDefault'),
      dataTransfer: { getData: () => '2' },
    } as unknown as DragEvent);
    expect(editor.patternState.placeholders).toEqual(['Date', 'LastName', 'Role']);

    editor.handleReorderKeydown(2, { key: 'ArrowUp', preventDefault: jasmine.createSpy('preventDefault') } as unknown as KeyboardEvent);
    expect(editor.patternState.placeholders).toEqual(['Date', 'Role', 'LastName']);
    expect(editor.reorderAnnouncement).toContain('position 2 of 3');
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.some((button) => button.textContent?.trim() === 'Up' || button.textContent?.trim() === 'Down')).toBeFalse();
  });

  it('keeps values after duplicate and validation failures and emits stale on not found', () => {
    const editor = fixture.componentInstance;
    editor.formatForm.controls.name.setValue('Existing');
    editor.addPlaceholder('LastName');
    formats.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'FILE_NAME_FORMAT_NAME_ALREADY_EXISTS' } })));
    editor.submit();
    expect(editor.formatForm.controls.name.value).toBe('Existing');
    expect(editor.errorMessage).toContain('different Format Name');

    formats.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'VALIDATION_ERROR', data: { errors: [{ field: 'pattern', message: 'Pattern invalid' }] } } })));
    editor.submit();
    expect(editor.patternError).toBe('Pattern invalid');

    const stale = jasmine.createSpy('stale');
    editor.stale.subscribe(stale);
    formats.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { errorCode: 'FILE_NAME_FORMAT_NOT_FOUND' } })));
    editor.submit();
    expect(stale).toHaveBeenCalled();
  });
});
