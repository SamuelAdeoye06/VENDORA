import React, { ReactNode } from 'react';
import { ArrowLeft, Bell, Home, LayoutGrid, ShoppingCart, User as UserIcon, Store, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

interface HeaderProps {
  title: string; showBack?: boolean; onBack?: () => void; rightElement?: ReactNode;
}

interface NavLink {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

export default function Header({ title, showBack = false, onBack, rightElement }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItemCount } = useShop();
  const { user, viewMode, setViewMode } = useAuth();

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const isVendorSelling = user?.role === 'vendor' && viewMode === 'selling';

  const buyingLinks: NavLink[] = [
    { id: 'home',    icon: Home,         label: 'Home',       path: '/' },
    { id: 'search',  icon: LayoutGrid,   label: 'Categories', path: '/search' },
    { id: 'cart',    icon: ShoppingCart, label: 'Cart',       path: '/cart', badge: cartItemCount },
    { id: 'profile', icon: UserIcon,     label: 'Account',    path: '/profile' },
  ];

  const sellingLinks: NavLink[] = [
    { id: 'dashboard',   icon: LayoutGrid,   label: 'Dashboard',  path: '/vendor-dashboard' },
    { id: 'add-product', icon: ShoppingCart, label: 'Add Product',path: '/add-product' },
    { id: 'orders',      icon: Bell,         label: 'My Sales',   path: '/orders' },
    { id: 'profile',     icon: UserIcon,     label: 'Account',    path: '/profile' },
  ];

  const navLinks = isVendorSelling ? sellingLinks : buyingLinks;

  return (
    <header className="cmp-header glass-panel">
      <div className="header-inner">
        <div className="header-left">
          {showBack ? (
            <button className="icon-btn active-bounce" onClick={onBack} aria-label="Go back"><ArrowLeft size={24} /></button>
          ) : (
            <div className="brand-logo" onClick={() => navigate('/')}>
              <span className="logo-v">V</span>
              <span className="logo-text-desktop">VENDORA</span>
            </div>
          )}
        </div>

        <nav className="desktop-nav">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <button key={link.id} className={`desktop-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(link.path)}>
                <Icon size={20} /><span>{link.label}</span>
                {link.badge && link.badge > 0 && <span className="nav-badge-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="header-right">
          {rightElement || (
            <div className="header-actions">
              {user?.role === 'vendor' && (
                <button className={`header-switch-btn desktop-only ${viewMode}`}
                  onClick={() => {
                    const newMode = viewMode === 'buying' ? 'selling' : 'buying';
                    setViewMode(newMode);
                    navigate(newMode === 'selling' ? '/vendor-dashboard' : '/');
                  }}>
                  {viewMode === 'buying'
                    ? <><Store size={18} /><span>Switch to Selling</span></>
                    : <><ShoppingBag size={18} /><span>Switch to Buying</span></>}
                </button>
              )}
              <button className="icon-btn active-bounce notification-btn" aria-label="Notifications">
                <Bell size={22} />
                {user && <span className="notification-dot" />}
              </button>
              <div className="header-user-avatar" onClick={() => navigate('/profile')}>
                <div className="avatar-inner">
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.name} className="avatar-img" />
                    : user ? getInitials(user.name) : '?'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
