import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { handleFileUpload, ViewerType } from 'ngx-doc-viewer';
import {
  DemoDoc,
  DemoViewer,
  getDemoDoc,
  getDemoViewer,
  viewers,
} from '@document-viewer/data';

@Component({
  selector: 'document-viewer-root',
  standalone: true,
  imports: [NgClass, NgxDocViewerModule],
  templateUrl: 'app.component.html',
  styles: [],
})
export class AppComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  viewers = viewers;
  selectedViewer = signal(getDemoViewer());
  selectedDoc = signal(this.selectedViewer().docs[0]);
  customUrl = signal('');
  selectedUrl = computed(() => this.customUrl() || this.selectedDoc().url);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const previewer = params.get('previewer') ?? undefined;
      const doctype = params.get('doctype') ?? undefined;
      const viewer = getDemoViewer(previewer);
      const doc = getDemoDoc(viewer.name, doctype);

      if (previewer !== viewer.name || doctype !== doc.type) {
        void this.navigate(viewer.name, doc.type, true);
        return;
      }

      this.selectedViewer.set(viewer);
      this.selectedDoc.set(doc);
      this.customUrl.set('');
    });
  }

  selectViewer(viewerName: ViewerType) {
    if (viewerName !== this.selectedViewer().name) {
      const viewer = getDemoViewer(viewerName);
      const doc = viewer.docs[0];
      void this.navigate(viewer.name, doc.type);
    }
  }

  selectDoc(doc: DemoDoc) {
    if (doc.type !== this.selectedDoc().type) {
      void this.navigate(this.selectedViewer().name, doc.type);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleFiles(fileInput: any) {
    this.customUrl.set(await handleFileUpload(fileInput));
  }

  loadCustomUrl(url: string) {
    this.customUrl.set(url);
  }

  trackByDocType(_index: number, doc: DemoDoc) {
    return doc.type;
  }

  private navigate(viewer: DemoViewer['name'], docType: string, replaceUrl = false) {
    return this.router.navigate(['/', viewer, docType], { replaceUrl });
  }
}
