import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Calendar, CheckCircle, Star } from 'lucide-react';
import ReviewModal from '../../components/ReviewModal/ReviewModal';
import './Orders.css';

import { useAuth } from '../../context/AuthContext';
import './Orders.css';

export default function Orders() {
  const { orders, addReview } = useShop();
  const { user, viewMode } = useAuth();
  const navigate = useNavigate();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string} | null>(null);

  const handleOpenReview = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = (rating: number, comment: string) => {
    if (selectedProduct) {
      addReview(selectedProduct.id, rating, comment);
      setIsReviewModalOpen(false);
      setSelectedProduct(null);
    }
  };

  // Filter orders based on viewMode
  const displayOrders = viewMode === 'buying' 
    ? orders // All orders placed by the user
    : orders.filter(order => {
        return order.items.some(item => item.vendorId === user?.id.toString());
      });

  return (
    <div className="orders-page animate-fade-in">
      <div className="orders-header">
        <button className="back-btn active-bounce" onClick={() => navigate(viewMode === 'buying' ? '/profile' : '/vendor-dashboard')}>
          <ArrowLeft size={24} />
        </button>
        <h2>{viewMode === 'buying' ? 'My Orders' : 'My Sales'}</h2>
        <div style={{ width: 40 }}></div>
      </div>

      <div className="orders-list">
        {displayOrders.length === 0 ? (
          <div className="empty-orders glass-panel">
            <Package size={48} className="empty-icon" />
            <h3>{viewMode === 'buying' ? 'No orders yet' : 'No sales yet'}</h3>
            <p>{viewMode === 'buying' 
              ? "You haven't placed any orders yet. Start shopping to see them here!" 
              : "You haven't received any orders yet. Keep listing items!"}
            </p>
            {viewMode === 'buying' && (
              <button className="start-btn active-bounce" onClick={() => navigate('/')}>
                Browse Products
              </button>
            )}
          </div>
        ) : (
          displayOrders.map((order) => (
            <div key={order.id} className="order-card glass-panel animate-slide-up">
              <div className="order-card-header">
                <div className="order-id-date">
                  <span className="order-id">{order.id}</span>
                  <div className="order-date">
                    <Calendar size={14} />
                    <span>{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={`order-status-badge ${order.status}`}>
                  <CheckCircle size={14} />
                  <span>{order.status.toUpperCase()}</span>
                </div>
              </div>

              <div className="order-items-preview">
                {order.items.map((item) => (
                  <div key={item.id} className="order-item-row">
                    <img src={item.image} alt={item.name} className="item-thumb" />
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-meta">Qty: {item.quantity} • ₦{item.price.toLocaleString()}</span>
                    </div>
                    {order.status === 'completed' && (
                      <button 
                        className="rate-item-btn active-bounce"
                        onClick={() => handleOpenReview(item.id, item.name)}
                      >
                        <Star size={16} />
                        <span>Rate</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="order-card-footer">
                <div className="order-delivery-info">
                  <span className="delivery-label">{order.deliveryMethod === 'delivery' ? 'Delivered to:' : 'Pickup at:'}</span>
                  <span className="delivery-value">{order.address || 'Campus Store'}</span>
                </div>
                <div className="order-total-price">
                  <span className="total-label">Total</span>
                  <span className="total-value">₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
        productName={selectedProduct?.name || ''}
      />
    </div>
  );
}
