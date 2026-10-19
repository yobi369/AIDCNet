import React from 'react';
import { createRoot } from 'react-dom/client';
import AIDCNetPrototype from '../aidcnet_prototype';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing root element');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AIDCNetPrototype />
  </React.StrictMode>
);
