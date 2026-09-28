import { Injectable } from '@angular/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export interface PdfRenderHandle {
  resize(width: number): void;
  destroy(): void;
}

export interface PdfRenderCallbacks {
  rendered(): void;
  failed(): void;
}

@Injectable({ providedIn: 'root' })
export class PdfDocumentRenderer {
  render(blob: Blob, container: HTMLElement, initialWidth: number, callbacks: PdfRenderCallbacks): PdfRenderHandle {
    return new PdfDocumentRenderSession(blob, container, initialWidth, callbacks);
  }
}

class PdfDocumentRenderSession implements PdfRenderHandle {
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private pdfDocument: PDFDocumentProxy | null = null;
  private renderTasks: RenderTask[] = [];
  private canvases: HTMLCanvasElement[] = [];
  private width = 0;
  private renderGeneration = 0;
  private isDestroyed = false;
  private hasRendered = false;

  constructor(
    private readonly blob: Blob,
    private readonly container: HTMLElement,
    initialWidth: number,
    private readonly callbacks: PdfRenderCallbacks,
  ) {
    this.resize(initialWidth);
    void this.loadDocument();
  }

  resize(width: number): void {
    if (this.isDestroyed || !Number.isFinite(width) || width <= 0 || Math.abs(width - this.width) < 2) return;
    this.width = width;
    if (this.pdfDocument) this.renderPages();
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.renderGeneration++;
    this.cancelRenderTasks();
    this.canvases = [];
    this.container.replaceChildren();

    const loadingTask = this.loadingTask;
    const pdfDocument = this.pdfDocument;
    this.loadingTask = null;
    this.pdfDocument = null;
    if (loadingTask) void loadingTask.destroy();
    else if (pdfDocument) void pdfDocument.destroy();
  }

  private async loadDocument(): Promise<void> {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (this.isDestroyed) return;

      pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', document.baseURI).toString();
      const data = await this.blob.arrayBuffer();
      if (this.isDestroyed) return;

      const loadingTask = pdfjs.getDocument({ data });
      this.loadingTask = loadingTask;
      const pdfDocument = await loadingTask.promise;
      if (this.isDestroyed || this.loadingTask !== loadingTask) return;

      this.pdfDocument = pdfDocument;
      this.createPageCanvases(pdfDocument.numPages);
      this.renderPages();
    } catch {
      if (!this.isDestroyed) this.callbacks.failed();
    }
  }

  private createPageCanvases(pageCount: number): void {
    const fragment = document.createDocumentFragment();
    this.canvases = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = document.createElement('div');
      page.className = 'cv-pdf-page';
      page.setAttribute('role', 'img');
      page.setAttribute('aria-label', `PDF page ${pageNumber} of ${pageCount}`);

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      page.appendChild(canvas);
      fragment.appendChild(page);
      this.canvases.push(canvas);
    }

    this.container.replaceChildren(fragment);
  }

  private renderPages(): void {
    const pdfDocument = this.pdfDocument;
    if (this.isDestroyed || !pdfDocument || this.width <= 0) return;

    const generation = ++this.renderGeneration;
    const previousTasks = this.renderTasks.splice(0);
    previousTasks.forEach((task) => task.cancel());

    void Promise.allSettled(previousTasks.map((task) => task.promise)).then(() => {
      if (!this.isCurrentRender(generation, pdfDocument)) return;
      return this.drawPages(pdfDocument, this.width, generation);
    }).catch(() => {
      if (this.isCurrentRender(generation, pdfDocument)) this.callbacks.failed();
    });
  }

  private async drawPages(pdfDocument: PDFDocumentProxy, width: number, generation: number): Promise<void> {
    try {
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);

      for (let index = 0; index < this.canvases.length; index++) {
        if (!this.isCurrentRender(generation, pdfDocument)) return;

        const page = await pdfDocument.getPage(index + 1);
        if (!this.isCurrentRender(generation, pdfDocument)) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / unscaledViewport.width });
        const canvas = this.canvases[index];
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas rendering is unavailable.');

        canvas.width = Math.ceil(viewport.width * outputScale);
        canvas.height = Math.ceil(viewport.height * outputScale);
        const task = page.render({
          canvasContext: context,
          viewport,
          ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }),
        });
        this.renderTasks.push(task);
        await task.promise;
        this.renderTasks = this.renderTasks.filter((activeTask) => activeTask !== task);
      }

      if (this.isCurrentRender(generation, pdfDocument) && !this.hasRendered) {
        this.hasRendered = true;
        this.callbacks.rendered();
      }
    } catch (error: unknown) {
      if (this.isCurrentRender(generation, pdfDocument) && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
        this.callbacks.failed();
      }
    }
  }

  private cancelRenderTasks(): void {
    const tasks = this.renderTasks.splice(0);
    tasks.forEach((task) => task.cancel());
  }

  private isCurrentRender(generation: number, pdfDocument: PDFDocumentProxy): boolean {
    return !this.isDestroyed && this.renderGeneration === generation && this.pdfDocument === pdfDocument;
  }
}
