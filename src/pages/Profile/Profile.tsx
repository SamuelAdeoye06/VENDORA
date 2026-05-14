import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { supabase } from '../../lib/supabase';
import {
  ShoppingBag,
  Settings,
  LogOut,
  CreditCard,
  MessageSquare,

  ChevronRight,
  PlusCircle,
  Trash2,
  ShieldCheck,
  Check,
  X,
  Store,
} from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { signOut, user, isLoading: isAuthLoading, viewMode, toggleViewMode } = useAuth();
  const { showFeedback, showConfirm } = useFeedback();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Sync editName when user data loads
  React.useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user]);

  // ── Real Functions ──────────────────────────────────────────────────────────

  /** Update display name — saves to Supabase user_metadata.full_name.
   *  AuthContext's onAuthStateChange fires automatically and refreshes
   *  the user object everywhere in the app. */
  const handleUpdateProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setIsUpdating(true);
    setUpdateError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },   // matches metadata.full_name in AuthContext
      });
      if (error) throw error;
      // No need to call updateUserName — onAuthStateChange will update the user
      setIsEditing(false);
      showFeedback({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your display name has been saved.',
      });
    } catch (err: any) {
      setUpdateError(err.message || 'Update failed. Try again.');
      showFeedback({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Your profile could not be updated. Try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /** Send a password-reset email via Supabase */
  const handleChangePassword = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: `Reset link sent to ${user.email}` });
      showFeedback({
        type: 'success',
        title: 'Reset Link Sent',
        message: `A password reset link has been sent to ${user.email}.`,
      });
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Could not send reset email.' });
      showFeedback({
        type: 'error',
        title: 'Could Not Send Link',
        message: err.message || 'Could not send reset email.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteRequest = async () => {
    const shouldDelete = await showConfirm({
      type: 'warning',
      title: 'Delete Account?',
      message: 'This permanently removes your account. This cannot be undone.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (shouldDelete) handleDeleteAccount();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await signOut();
      navigate('/auth');
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError('Could not delete account. Please run the SQL setup in your Supabase dashboard first, or contact support.');
      showFeedback({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete account. Please run the SQL setup in your Supabase dashboard first, or contact support.',
      });
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
  };

  if (isAuthLoading || !user) {
    return (
      <div className="profile-page flex-center">
        <div className="loader-main"></div>
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* ── Profile Card ─────────────────────────────────────────────────── */}
      <div className="profile-main-card glass-panel">
        <div className="profile-header-simple">
          <div className="avatar-simple">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name || 'User'} />
            ) : (
              <div className="initials-simple">{getInitials(user.name || '')}</div>
            )}
            <span className="role-badge-simple">{user.role || 'user'}</span>
          </div>

          <div className="user-info-simple">
            {isEditing ? (
              <div className="edit-name-input-group">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="simple-input"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleUpdateProfile()}
                />
                <div className="edit-controls">
                  <button onClick={handleUpdateProfile} disabled={isUpdating} className="save-icon-btn" title="Save">
                    {isUpdating ? <div className="loader-mini" /> : <Check size={20} />}
                  </button>
                  <button onClick={() => { setIsEditing(false); setUpdateError(''); }} className="cancel-icon-btn" title="Cancel">
                    <X size={20} />
                  </button>
                </div>
                {updateError && <p className="field-error">{updateError}</p>}
              </div>
            ) : (
              <div className="name-with-edit">
                <h2>{user.name || 'Vendora User'}</h2>
                <button className="edit-profile-btn" onClick={() => { setEditName(user.name || ''); setIsEditing(true); }}>
                  <Settings size={14} /> Edit Name
                </button>
              </div>
            )}
            <p className="simple-email">{user.email || 'No email provided'}</p>
          </div>
        </div>

        {/* Wallet */}
        <div className="balance-row-simple">
          <div className="balance-info">
            <span className="label">BALANCE</span>
            <h3 className="amount">₦{(user.walletBalance || 0).toLocaleString()}</h3>
          </div>
          <button className="topup-pill" onClick={() => navigate('/payment-settings')}>
            <PlusCircle size={18} /> Top Up
          </button>
        </div>
      </div>

      {/* ── View Mode Switcher (Airbnb Model) - Only for Vendors ─────────────────────────── */}
      {user?.role === 'vendor' && (
        <div className="view-mode-card glass-panel animate-slide-up">
          <div className="mode-info">
            <h3>{viewMode === 'buying' ? 'Start Selling' : 'Back to Buying'}</h3>
            <p>{viewMode === 'buying' ? 'List products and manage your campus business.' : 'Browse the marketplace and shop for items.'}</p>
          </div>
          <button className={`mode-switch-btn ${viewMode}`} onClick={() => {
            toggleViewMode();
            if (viewMode === 'buying') {
              navigate('/vendor-dashboard');
            } else {
              navigate('/');
            }
          }}>
            {viewMode === 'buying' ? (
              <>
                <Store size={20} />
                <span>Switch to Selling</span>
              </>
            ) : (
              <>
                <ShoppingBag size={20} />
                <span>Switch to Buying</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Menu ─────────────────────────────────────────────────────────── */}
      <div className="profile-options-list">

        {/* Vendor Centre — only for vendors who are in selling mode */}
        {user?.role === 'vendor' && viewMode === 'selling' && (
          <div className="option-group">
            <h4 className="group-label">Vendor Centre</h4>
            <div className="option-item" onClick={() => navigate('/vendor-dashboard')}>
              <Store size={20} /> <span>Store Dashboard</span> <ChevronRight size={18} />
            </div>
            <div className="option-item" onClick={() => navigate('/add-product')}>
              <PlusCircle size={20} /> <span>List New Product</span> <ChevronRight size={18} />
            </div>
          </div>
        )}

        {/* Marketplace */}
        <div className="option-group">
          <h4 className="group-label">Marketplace</h4>
          <div className="option-item" onClick={() => navigate('/orders')}>
            <ShoppingBag size={20} /> <span>My Orders</span> <ChevronRight size={18} />
          </div>
          <div className="option-item" onClick={() => navigate('/inbox')}>
            <MessageSquare size={20} /> <span>Messages</span> <ChevronRight size={18} />
          </div>
        </div>

        {/* Security */}
        <div className="option-group">
          <h4 className="group-label">Security</h4>
          <div className="option-item" onClick={handleChangePassword} style={{ cursor: isSendingReset ? 'wait' : 'pointer', opacity: isSendingReset ? 0.7 : 1 }}>
            <ShieldCheck size={20} />
            <div className="option-label-stack">
              <span>{isSendingReset ? 'Sending...' : 'Change Password'}</span>
              <span className="option-subtext">A reset link will be sent to your email</span>
            </div>
            <ChevronRight size={18} />
          </div>
          {passwordMsg && (
            <div className={`password-msg ${passwordMsg.type}`}>
              {passwordMsg.text}
            </div>
          )}
          <div className="option-item" onClick={() => navigate('/payment-settings')}>
            <CreditCard size={20} /> <span>Payment Settings</span> <ChevronRight size={18} />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="option-group">
          <h4 className="group-label danger-label">Danger Zone</h4>
          {deleteError && (
            <p className="field-error" style={{ marginBottom: '0.75rem' }}>{deleteError}</p>
          )}
          <div className="option-item delete" onClick={handleDeleteRequest} style={{ cursor: isDeleting ? 'wait' : 'pointer', opacity: isDeleting ? 0.7 : 1 }}>
            <Trash2 size={20} /> <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span> <ChevronRight size={18} />
          </div>
        </div>

        {/* Logout */}
        <button className="logout-btn-full-simple" onClick={handleLogout}>
          <LogOut size={20} /> Secure Logout
        </button>
        <p className="session-note">Your session stays signed in securely until you log out or Supabase expires it.</p>
      </div>
    </div>
  );
}
