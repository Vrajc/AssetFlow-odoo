import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { SocketProvider } from './stores/socket';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SocketProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1A1E23', color: '#F4F5F6', border: '1px solid rgba(255,255,255,0.08)' },
            }}
          />
        </SocketProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
