import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { AppShellComponent } from './app/app-shell.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'google/docx' },
  { path: ':previewer/:doctype', component: AppComponent },
  { path: '**', redirectTo: 'google/docx' },
];

bootstrapApplication(AppShellComponent, {
  providers: [provideRouter(routes)],
}).catch((err) => console.error(err));
