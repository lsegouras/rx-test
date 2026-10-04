/*
 * main.tsx | Layer: Web (entry point)
 * Mounts the React app. Must NOT hold UI or data logic.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
