import { Component } from '@angular/core';
import { handleFileUpload, ViewerType } from 'ngx-doc-viewer';
import { viewers } from '@document-viewer/data';
@Component({
  selector: 'document-viewer-root',
  templateUrl: 'app.component.html',
  styles: [],
})
export class AppComponent {
  viewers = viewers;
  selectedViewer = this.viewers[0];
  selectedDoc = this.selectedViewer.docs[0];

  selectViewer(viewerName: ViewerType) {
    if (viewerName !== this.selectViewer.name) {
      this.selectedViewer =
        this.viewers.find((v) => v.name === viewerName) || this.viewers[0];
      this.selectedDoc = this.selectedViewer.docs[0];
    }
  }

  getDocExtension(doc: string) {
    const splittedDoc = doc.split('.');
    return splittedDoc[splittedDoc.length - 1];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleFiles(fileInput: any) {
    this.selectedDoc = await handleFileUpload(fileInput);
  }
}
