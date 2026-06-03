import React from 'react';
import { Pizza, LogOut, ClipboardList, ChefHat, Package, User, Sun, Moon } from 'lucide-react';

export default function Navbar({ user, onLogout, currentTab, setCurrentTab, theme, setTheme }) {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => setCurrentTab('menu')}>
          <div className="brand-logo">
            <Pizza size={24} className="logo-icon" />
          </div>
          <span className="brand-text">Pizza Oven</span>
        </div>

        <nav className="navbar-nav">
          {user ? (
            <>
              {user.role === 'admin' ? (
                <>
                  <button 
                    className={`nav-link ${currentTab === 'admin-orders' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-orders')}
                  >
                    <ClipboardList size={18} />
                    <span>Manage Orders</span>
                  </button>
                  <button 
                    className={`nav-link ${currentTab === 'admin-inventory' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('admin-inventory')}
                  >
                    <Package size={18} />
                    <span>Inventory</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`nav-link ${currentTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('menu')}
                  >
                    <ChefHat size={18} />
                    <span>Menu</span>
                  </button>
                  <button 
                    className={`nav-link ${currentTab === 'custom' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('custom')}
                  >
                    <Pizza size={18} />
                    <span>Customize Pizza</span>
                  </button>
                  <button 
                    className={`nav-link ${currentTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('orders')}
                  >
                    <ClipboardList size={18} />
                    <span>My Orders</span>
                  </button>
                  <button 
                    className={`nav-link ${currentTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('profile')}
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button 
                className={`nav-link ${currentTab === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentTab('login')}
              >
                Login
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentTab('register')}
              >
                Register
              </button>
            </>
          )}
        </nav>

        {user && (
          <div className="navbar-user">
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ marginRight: '0.5rem', padding: '0.4rem', border: 'none', background: 'transparent' }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="user-profile">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{user.role}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .navbar-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(18, 22, 26, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.25);
        }

        .navbar-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: var(--transition);
        }

        .brand-logo {
          background: var(--primary);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-glow);
        }

        .logo-icon {
          animation: spin 30s linear infinite;
        }

        .brand-text {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, #fff 30%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-link {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.6rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: var(--transition);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .nav-link.active {
          color: var(--primary);
          background: hsla(var(--primary-hue), 100%, 55%, 0.1);
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          padding-left: 1.25rem;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-input);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .user-info-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-role-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn-logout {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
        }

        .btn-logout:hover {
          color: var(--danger);
          background: rgba(255, 53, 53, 0.1);
        }

        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          
          .navbar-user {
            border-left: none;
            padding-left: 0;
            width: 100%;
            justify-content: space-between;
          }
          
          .navbar-nav {
            width: 100%;
            justify-content: space-around;
            overflow-x: auto;
            padding-bottom: 0.25rem;
          }
        }
      `}</style>
    </header>
  );
}
