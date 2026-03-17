import React from 'react';
import './tailwind.css';
import App from './app/app';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const container = document.getElementById('app') as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/google/docx" replace />} />
        <Route path="/:previewer/:doctype" element={<App />} />
        <Route path="*" element={<Navigate to="/google/docx" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
