import React from 'react';
import App from './app/app';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('app') as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

