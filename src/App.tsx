import React from 'react';
import { Routes, Route, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header/Header';
import BottomNav from './components/BottomNav/BottomNav';

import Home from './pages/Home/Home';
import Category from './pages/Category/Category';
import ProductDetails from './pages/ProductDetails/ProductDetails';
import Cart from './pages/Cart/Cart';
import Checkout from './pages/Checkout/Checkout';
import Profile from './pages/Profile/Profile';
import Orders from './pages/Orders/Orders';
import Chat from './pages/Chat/Chat';
import Auth from './pages/Auth/Auth';
import VendorDashboard from './pages/VendorDashboard/VendorDashboard';
import AddProduct from './pages/AddProduct/AddProduct';
import CheckoutSuccess from './pages/CheckoutSuccess/CheckoutSuccess';
import Wishlist from './pages/Wishlist/Wishlist';
import Inbox from './pages/Inbox/Inbox';
import RecentlyViewed from './pages/RecentlyViewed/RecentlyViewed';
import RecentlySearched from './pages/RecentlySearched/RecentlySearched';
import PaymentSettings from './pages/PaymentSettings/PaymentSettings';

import './App.css';

function App() {
  const { user } = useAuth();
  return (
    <div className="app-container">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="search" element={<Category />} />
          <Route path="product/:id" element={<ProductDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/success" element={<CheckoutSuccess />} />
          <Route path="profile" element={<Profile />} />
          <Route path="orders" element={<Orders />} />
          <Route path="chat/:id" element={<Chat />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="recently-viewed" element={<RecentlyViewed />} />
          <Route path="recently-searched" element={<RecentlySearched />} />
          <Route path="payment-settings" element={<PaymentSettings />} />
          {/* Vendor-only routes */}
          <Route path="vendor-dashboard" element={user?.role === 'vendor' ? <VendorDashboard /> : <Navigate to="/" replace />} />
          <Route path="add-product" element={user?.role === 'vendor' ? <AddProduct /> : <Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { viewMode, user } = useAuth();

  const isVendorSelling = user?.role === 'vendor' && viewMode === 'selling';
  const hideShell = ['/auth'].includes(location.pathname);

  const getActiveTab = () => {
    const path = location.pathname;
    if (isVendorSelling) {
      if (path.startsWith('/vendor-dashboard')) return 'dashboard';
      if (path.startsWith('/add-product')) return 'add-product';
      if (path.startsWith('/orders')) return 'orders';
      if (path.startsWith('/profile')) return 'profile';
    } else {
      if (path === '/') return 'home';
      if (path.startsWith('/search')) return 'search';
      if (path.startsWith('/cart')) return 'cart';
      if (path.startsWith('/profile')) return 'profile';
    }
    return '';
  };

  const handleTabChange = (tabId: string) => {
    const routes: Record<string, string> = {
      home: '/', search: '/search', cart: '/cart',
      dashboard: '/vendor-dashboard', 'add-product': '/add-product',
      orders: '/orders', profile: '/profile',
    };
    if (routes[tabId]) navigate(routes[tabId]);
  };

  const isVendorDashboard = location.pathname.startsWith('/vendor-dashboard');

  return (
    <>
      {!hideShell && <Header title={isVendorSelling ? 'VENDOR HUB' : 'VENDORA'} />}
      <main className={`main-content ${hideShell ? 'no-padding' : ''} ${isVendorDashboard ? 'vendor-full-bleed' : ''}`}>
        <Outlet />
      </main>
      {!hideShell && <BottomNav activeTab={getActiveTab()} onTabChange={handleTabChange} />}
    </>
  );
}

export default App;
