import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon } from './ui/Icon';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center" role="status">
        <div className="text-center">
          <Icon name="progress_activity" className="animate-spin text-primary text-[44px] mx-auto mb-sm" />
          <p className="text-content-muted text-body-md">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
