import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { Minus, Plus, ShoppingBag, Store, Star, ArrowLeft } from 'lucide-react';
import Button from '../../components/Button/Button';
import { Product, Vendor } from '../../types';
import './ProductDetails.css';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, vendors, addToCart, reviews, addToRecentlyViewed } = useShop();
  
  const productId = id || '';
  const product = products.find(p => p.id === productId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) {
      addToRecentlyViewed(productId);
    }
  }, [productId]);

  const productReviews = reviews.filter(r => r.productId === productId);
  const averageRating = productReviews.length > 0 
    ? (productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length).toFixed(1)
    : '0.0';
  const reviewCount = productReviews.length;
  
  if (!product) {
    return <div className="p-4 text-center">Product not found. <button onClick={() => navigate(-1)}>Go Back</button></div>;
  }
  
  const vendor = vendors.find(v => v.id === product.vendorId);
  
  const handleAddToCart = () => {
    addToCart(product);
  };
  
  const maxStock = product.stock || 99;
  
  return (
    <div className="product-details-page animate-fade-in">
      <div className="product-details-layout">
        {/* Left Side: Product Image */}
        <div className="product-image-column">
          <div className="sticky-image-container">
            <img src={product.image} alt={product.name} className="product-hero-image" />
            <button className="back-btn-absolute active-bounce" onClick={() => navigate(-1)}>
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>
        
        {/* Right Side: Product Info */}
        <div className="product-info-column">
          <div className="product-header-section">
            <div className="product-header-row">
              <h1 className="product-title">{product.name}</h1>
              <div className="product-rating-badge glass-panel">
                <Star size={16} fill="#ffb800" color="#ffb800" />
                <span>{averageRating}</span>
                <span className="count">({reviewCount} reviews)</span>
              </div>
            </div>
            <p className="product-price-lg">₦{product.price.toLocaleString()}</p>
            
            {product.stock !== undefined && product.stock <= 5 && (
              <div className="stock-warning">⚠️ Low stock: Only {product.stock} items left!</div>
            )}
          </div>
          
          <div className="vendor-card glass-panel">
            <div className="vendor-icon"><Store size={24} /></div>
            <div className="vendor-texts">
              <h4 className="vendor-name-bold">{vendor?.name}</h4>
              <span className="vendor-rating">⭐ {vendor?.rating} Rating</span>
            </div>
            <Button variant="outline" onClick={() => navigate(`/chat/${product.vendorId}`)}>Message Vendor</Button>
          </div>
          
          <div className="description-section">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>

          <div className="quantity-selection-row">
            <div className="quantity-label">Quantity</div>
            <div className="quantity-selector">
              <button 
                className="qty-btn" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              ><Minus size={18} /></button>
              <span className="qty-value">{quantity}</span>
              <button 
                className="qty-btn" 
                onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                disabled={quantity >= maxStock}
              ><Plus size={18} /></button>
            </div>
          </div>

          <div className="product-actions-desktop">
            <Button fullWidth size="lg" onClick={handleAddToCart} className="add-to-cart-big-btn">
              <ShoppingBag size={20} />
              Add to Cart • ₦{(product.price * quantity).toLocaleString()}
            </Button>
          </div>

          <div className="reviews-section">
            <div className="section-header">
              <h3>Customer Reviews</h3>
              {reviewCount > 0 && <span className="view-all">View All</span>}
            </div>

            {productReviews.length > 0 ? (
              <div className="reviews-list">
                {productReviews.slice(0, 3).map(review => (
                  <div key={review.id} className="review-item glass-panel">
                    <div className="review-user">
                      <div className="avatar-wrapper">
                        {review.userImage ? (
                          <img src={review.userImage} alt={review.userName} className="review-avatar" />
                        ) : (
                          <div className="review-avatar-placeholder">{review.userName[0]}</div>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{review.userName}</span>
                        <div className="user-rating">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                              key={s} 
                              size={12} 
                              fill={s <= review.rating ? "#ffb800" : "none"} 
                              color={s <= review.rating ? "#ffb800" : "#475569"} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="review-date">{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <p className="review-comment">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-reviews glass-panel">
                <p>No reviews yet. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Sticky Action Bar */}
      <div className="product-action-bar-mobile">
        <Button fullWidth onClick={handleAddToCart} className="add-to-cart-big-btn">
          <ShoppingBag size={20} />
          Add to Cart • ₦{(product.price * quantity).toLocaleString()}
        </Button>
      </div>
    </div>
  );
}
