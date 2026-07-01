import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Nexus</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-bold mb-4">Welcome to Nexus!</h2>
          <p className="text-gray-600 mb-4">
            You're logged in as <strong>{user?.email}</strong>
          </p>
          <div className="border-t pt-4 mt-4">
            <p className="text-gray-500">
              Chat features coming soon in Phase 2...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
