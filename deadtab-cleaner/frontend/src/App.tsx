import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { fetchScore } from './lib/api';

import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArchivePage from './pages/Archive';
import NoteDetail from './pages/NoteDetail';
import Settings from './pages/Settings';

// Route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const apiKey = useAuthStore((state) => state.apiKey);
  if (!apiKey) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Main layout wrapper
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const apiKey = useAuthStore((state) => state.apiKey);
  
  // Optionally fetch score to pass to sidebar
  const { data } = useQuery({
    queryKey: ['habitScore'],
    queryFn: fetchScore,
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentScore={data?.score} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:ml-[240px] relative">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-accent/5 rounded-full blur-[100px] pointer-events-none" />
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/archive" element={<ProtectedRoute><AppLayout><ArchivePage /></AppLayout></ProtectedRoute>} />
          <Route path="/archive/:id" element={<ProtectedRoute><AppLayout><NoteDetail /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: '!bg-slate-100 !text-slate-800 !border !border-slate-200',
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }} 
      />
    </QueryClientProvider>
  );
}
