import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import {
  Plus, TrendingUp, Package, DollarSign,
  Edit, Trash2, ExternalLink, LayoutDashboard, ShoppingBag,
  MessageSquare, Settings, LogOut, ChevronRight,
  BarChart3, Store, ArrowUpRight, Sparkles, X, Check,
  Loader2, AlertCircle,
} from 'lucide-react';
import { Product } from '../../types';
import './VendorDashboard.css';

export default function VendorDashboard() {
  const { getProductsByVendor, orders, deleteProduct, updateProduct, categories } = useShop() as any;
  const { user, signOut, toggleViewMode } = useAuth();
  const { showConfirm } = useFeedback();
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', description: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  if (!user) return <div className="unauthorized-message">Please log in to access the dashboard.</div>;

  const vendorProducts = getProductsByVendor(user.id.toString());
  const vendorSales = orders.filter((order: any) =>
    order.items.some((item: any) => item.vendorId === user.id.toString())
  );
  const totalRevenue = vendorSales.reduce((acc: number, curr: any) => acc + curr.total, 0);

  // Only show real data — no fake trends or hardcoded client counts
  const stats = [
    {
      label: 'Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      icon: DollarSign, color: '#10b981', bg: '#d1fae5',
      sub: vendorSales.length > 0 ? `from ${vendorSales.length} order${vendorSales.length !== 1 ? 's' : ''}` : 'No sales yet',
    },
    {
      label: 'Listings',
      value: vendorProducts.length.toString(),
      icon: Package, color: '#6366f1', bg: '#e0e7ff',
      sub: vendorProducts.length > 0 ? 'products listed' : 'Add your first product',
    },
    {
      label: 'Orders',
      value: vendorSales.length.toString(),
      icon: TrendingUp, color: '#f59e0b', bg: '#fef3c7',
      sub: vendorSales.length > 0 ? 'orders received' : 'No orders yet',
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await signOut(); navigate('/auth'); }
    catch (e) { setIsLoggingOut(false); }
  };

  const handleDelete = async (productId: string) => {
    const shouldDelete = await showConfirm({
      type: 'warning',
      title: 'Delete Product?',
      message: 'This listing will be removed from your store and the marketplace.',
      confirmText: 'Delete',
      cancelText: 'Keep Product',
      destructive: true,
    });
    if (!shouldDelete) return;
    setDeletingId(productId);
    setDeleteError('');
    try {
      await deleteProduct(productId);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete product. Check Supabase RLS policy.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      description: product.description,
    });
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      await updateProduct(editingProduct.id, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        category: editForm.category,
        description: editForm.description,
      });
      setEditingProduct(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="vendor-dashboard-layout">
      {/* ── Sidebar (desktop only) ─────────────────────────────────── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><Sparkles size={16} /></div>
          <span>Vendor Hub</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <div className="nav-item active"><LayoutDashboard size={20} /><span>Overview</span></div>
          <div className="nav-item" onClick={() => navigate('/add-product')}><Plus size={20} /><span>Add Product</span></div>
          <div className="nav-item" onClick={() => navigate('/orders')}><ShoppingBag size={20} /><span>Orders</span></div>
          <div className="nav-item" onClick={() => navigate('/inbox')}><MessageSquare size={20} /><span>Messages</span></div>
          <div className="nav-divider" />
          <div className="nav-section-label">Account</div>
          <div className="nav-item" onClick={() => navigate('/profile')}><Settings size={20} /><span>Settings</span></div>
        </nav>
        <div className="sidebar-footer">
          <button className="switch-buying-btn" onClick={() => { toggleViewMode(); navigate('/'); }}>
            <Store size={18} /><span>Switch to Buying</span>
          </button>
          <button className="logout-side-btn" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut size={18} /><span>{isLoggingOut ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        <header className="dashboard-top-bar">
          <div className="welcome-block">
            <p className="welcome-sub">Good day,</p>
            <h1 className="welcome-name">{user.name.split(' ')[0]}'s Store</h1>
          </div>
          <button className="primary-action-btn" onClick={() => navigate('/add-product')}>
            <Plus size={18} strokeWidth={2.5} /><span>New Listing</span>
          </button>
        </header>

        {/* Stats — real data only */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-card" style={{ animationDelay: `${idx * 0.08}s` }}>
              <div className="stat-top">
                <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  <stat.icon size={22} strokeWidth={2} />
                </div>
                {parseInt(stat.value) > 0 && (
                  <span className="stat-badge" style={{ color: stat.color }}>
                    <ArrowUpRight size={13} /> Active
                  </span>
                )}
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-sub">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Global error */}
        {deleteError && (
          <div className="vd-error-banner">
            <AlertCircle size={16} /><span>{deleteError}</span>
            <button onClick={() => setDeleteError('')}><X size={14} /></button>
          </div>
        )}

        <div className="dashboard-content-grid">
          {/* Products Table */}
          <section className="dashboard-section products-section">
            <div className="section-header">
              <div>
                <h2>Inventory</h2>
                <p className="section-sub">{vendorProducts.length} product{vendorProducts.length !== 1 ? 's' : ''} listed</p>
              </div>
              <button className="text-link-btn" onClick={() => navigate('/add-product')}>
                <Plus size={15} /><span>Add New</span>
              </button>
            </div>

            {vendorProducts.length > 0 ? (
              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="hide-mobile">Category</th>
                      <th>Price</th>
                      <th className="hide-mobile">Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorProducts.map((product: Product) => (
                      <tr key={product.id}>
                        <td className="product-cell">
                          <img src={product.image} alt="" />
                          <div className="product-name-info">
                            <span className="p-name">{product.name}</span>
                            <span className="p-id">#{product.id.slice(-6).toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="hide-mobile"><span className="table-tag">{product.category}</span></td>
                        <td className="price-cell">₦{product.price.toLocaleString()}</td>
                        <td className="hide-mobile"><span className="status-pill active">In Stock</span></td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn-sml" title="View" onClick={() => navigate(`/product/${product.id}`)}>
                              <ExternalLink size={15} />
                            </button>
                            <button className="icon-btn-sml" title="Edit" onClick={() => openEdit(product)}>
                              <Edit size={15} />
                            </button>
                            <button
                              className="icon-btn-sml delete"
                              title="Delete"
                              disabled={deletingId === product.id}
                              onClick={() => handleDelete(product.id)}
                            >
                              {deletingId === product.id
                                ? <Loader2 size={15} className="spin" />
                                : <Trash2 size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <div className="empty-icon-box"><Package size={44} strokeWidth={1.2} /></div>
                <h3>No products yet</h3>
                <p>Add your first product to start selling on the marketplace.</p>
                <button className="secondary-btn" onClick={() => navigate('/add-product')}>
                  <Plus size={16} /> Add Product
                </button>
              </div>
            )}
          </section>

          {/* Recent Sales */}
          <section className="dashboard-section sales-section">
            <div className="section-header">
              <div>
                <h2>Recent Orders</h2>
                <p className="section-sub">{vendorSales.length} order{vendorSales.length !== 1 ? 's' : ''} received</p>
              </div>
              <BarChart3 size={18} color="#94a3b8" />
            </div>
            <div className="activity-list">
              {vendorSales.length > 0 ? (
                vendorSales.slice(0, 8).map((order: any) => (
                  <div key={order.id} className="activity-item">
                    <div className="activity-icon-box"><TrendingUp size={17} /></div>
                    <div className="activity-details">
                      <div className="activity-title">Order #{order.id.slice(-6).toUpperCase()}</div>
                      <div className="activity-meta">
                        ₦{order.total.toLocaleString()} · {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {order.deliveryMethod}
                      </div>
                    </div>
                    <span className={`activity-status ${order.status}`}>{order.status}</span>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty-state small">
                  <TrendingUp size={30} strokeWidth={1.2} color="#cbd5e1" />
                  <p>No orders yet.</p>
                  <span>Share your listings to start getting orders.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="vd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingProduct(null); }}>
          <div className="vd-modal">
            <div className="vd-modal-header">
              <h3>Edit Product</h3>
              <button onClick={() => setEditingProduct(null)}><X size={20} /></button>
            </div>

            {editError && (
              <div className="vd-modal-error">
                <AlertCircle size={15} /><span>{editError}</span>
              </div>
            )}

            <div className="vd-modal-body">
              <label>
                Product Name
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                Price (₦)
                <input
                  type="number"
                  value={editForm.price}
                  min="0"
                  step="0.01"
                  onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                />
              </label>
              <label>
                Category
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                >
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="vd-modal-footer">
              <button className="vd-btn-cancel" onClick={() => setEditingProduct(null)}>Cancel</button>
              <button className="vd-btn-save" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Check size={16} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
