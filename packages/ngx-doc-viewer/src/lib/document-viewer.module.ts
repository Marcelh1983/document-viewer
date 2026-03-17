import { NgxDocViewerComponent } from './document-viewer.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule, NgxDocViewerComponent],
  exports: [NgxDocViewerComponent],
})
export class NgxDocViewerModule {}
