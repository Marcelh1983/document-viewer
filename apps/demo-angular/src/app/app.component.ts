import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DisableContent,
  NgxDocViewerComponent,
  ViewerRenderPhase,
  ViewerStateContext,
  ViewerType,
  handleFileUpload,
} from 'ngx-doc-viewer';
import {
  DemoDoc,
  DemoEvent,
  DemoViewer,
  addDemoEvent,
  disableContentModes,
  getDemoDoc,
  getDemoViewer,
  supportsDisableContent,
  viewers,
} from '@document-viewer/data';

const phaseBadges: Record<ViewerRenderPhase, string> = {
  idle: 'bg-slate-100 text-slate-500',
  loading: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

@Component({
  selector: 'document-viewer-root',
  standalone: true,
  imports: [NgClass, NgxDocViewerComponent],
  templateUrl: 'app.component.html',
})
export class AppComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  viewers = viewers;
  disableContentModes = disableContentModes;
  selectedViewer = signal(getDemoViewer());
  selectedDoc = signal(this.selectedViewer().docs[0]);
  customUrl = signal('');
  selectedUrl = computed(() => this.customUrl() || this.selectedDoc().url);
  showDisableContent = computed(() =>
    supportsDisableContent(this.selectedViewer().name),
  );
  disableContent = signal<DisableContent>('none');
  viewerDisableContent = computed(() =>
    this.showDisableContent() ? this.disableContent() : 'none',
  );
  phase = signal<ViewerRenderPhase>('idle');
  phaseBadge = computed(() => phaseBadges[this.phase()]);
  events = signal<DemoEvent[]>([]);

  constructor() {
    // Uploaded files are shown through object urls; release the previous one.
    effect((onCleanup) => {
      const url = this.customUrl();
      onCleanup(() => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
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

  async handleFiles(event: Event) {
    this.customUrl.set(await handleFileUpload(event));
  }

  loadCustomUrl(url: string) {
    this.customUrl.set(url);
  }

  onPhaseChange(state: ViewerStateContext) {
    this.phase.set(state.phase);
    this.log('phaseChange', `${state.viewer}: ${state.phase}`);
  }

  log(name: string, detail = '') {
    this.events.update((events) => addDemoEvent(events, name, detail));
  }

  private navigate(viewer: DemoViewer['name'], docType: string, replaceUrl = false) {
    return this.router.navigate(['/', viewer, docType], { replaceUrl });
  }
}
