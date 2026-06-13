import * as React from 'react';
import { createRoot } from 'react-dom/client';
import DijkstraRouter from '../dijkstra_router';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DijkstraRouter />
  </React.StrictMode>
);
