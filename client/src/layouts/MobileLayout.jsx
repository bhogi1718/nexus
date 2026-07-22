import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const MobileLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold">N</span>
          </div>
          <h1 className="text-lg font-bold">Nexus</h1>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMenu && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 z-30">
          <div className="text-sm text-gray-700 mb-3 pb-3 border-b">
            <p className="font-medium">{user?.name}</p>
            <p className="text-gray-500 text-xs">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};
