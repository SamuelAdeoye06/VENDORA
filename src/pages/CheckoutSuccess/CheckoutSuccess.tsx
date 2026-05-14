import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Star } from 'lucide-react';
import Button from '../../components/Button/Button';
import RatingModal from '../../components/RatingModal/RatingModal';
import './CheckoutSuccess.css';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  // In a real app, you would retrieve order ID and details from state/URL

  return (
    <div className="checkout-success-page animate-fade-in">
      <div className="success-content">
        <div className="success-icon-wrapper animate-bounce">
          <CheckCircle2 color="var(--color-success)" size={80} strokeWidth={1.5} />
        </div>
        
        <h1 className="success-title">Payment Successful!</h1>
        <p className="success-message">
          Your order <strong>#CM-{Math.floor(100000 + Math.random() * 900000)}</strong> has been placed successfully. 
          The vendor has been notified and will prepare it shortly.
        </p>
        
        <div className="action-buttons">
          <Button fullWidth onClick={() => navigate('/orders')} variant="primary">
            Track Order
          </Button>
          <Button fullWidth onClick={() => setIsRatingOpen(true)} variant="outline" className="mt-2">
            <Star size={20} />
            Rate Vendor
          </Button>
          <Button fullWidth onClick={() => navigate('/')} className="mt-4" variant="ghost">
            <ShoppingBag size={20} />
            Continue Shopping
          </Button>
        </div>
      </div>
      
      <RatingModal 
        isOpen={isRatingOpen} 
        onClose={() => setIsRatingOpen(false)} 
        vendorName="the Vendor" 
      />
    </div>
  );
}
