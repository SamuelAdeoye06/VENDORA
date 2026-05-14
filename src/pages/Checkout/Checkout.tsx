import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { usePaystackPayment } from 'react-paystack';
import Button from '../../components/Button/Button';
import { ArrowLeft, MapPin, Package, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { CartItem } from '../../types';
import './Checkout.css';

export default function Checkout() {
  const { cart, cartTotal, clearCart, addOrder, user, deductFromWallet } = useShop();
  const navigate = useNavigate();

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'wallet'>('bank');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const deliveryFee = deliveryMethod === 'delivery' ? 500 : 0;
  const finalTotal = cartTotal + deliveryFee;

  // Paystack config — amount in kobo
  const paystackConfig = {
    reference: `VDR-${Date.now()}`,
    email: user?.email || `${user?.id || 'guest'}@vendora.app`,
    amount: finalTotal * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  };

  const onPaystackSuccess = async (reference: any) => {
    console.log('Payment successful:', reference);
    try {
      await addOrder(cart, finalTotal, deliveryMethod, address);
      clearCart();
      navigate('/checkout/success', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment succeeded, but we could not save the order. Please contact support.');
    }
  };

  const onPaystackClose = () => {
    setErrorMsg('Payment was cancelled. You can try again when ready.');
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  // Guard — hooks must be above this
  if (!user) return null;

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (deliveryMethod === 'delivery' && !address.trim()) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }
    if (deliveryMethod === 'delivery' && !phone.trim()) {
      setErrorMsg('Please enter a phone number for delivery.');
      return;
    }

    if (paymentMethod === 'wallet') {
      if (user.walletBalance < finalTotal) {
        setErrorMsg(`Insufficient wallet balance. You need ₦${(finalTotal - user.walletBalance).toLocaleString()} more.`);
        return;
      }
      const success = deductFromWallet(finalTotal);
      if (success) {
        try {
          await addOrder(cart, finalTotal, deliveryMethod, address);
          clearCart();
          navigate('/checkout/success', { replace: true });
        } catch (err: any) {
          setErrorMsg(err.message || 'Wallet payment succeeded, but we could not save the order. Please contact support.');
        }
      } else {
        setErrorMsg('Wallet payment failed. Please try again.');
      }
    } else {
      // @ts-ignore — react-paystack typings vary by version
      initializePayment(onPaystackSuccess, onPaystackClose);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="checkout-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Package size={48} color="#94a3b8" strokeWidth={1.5} />
        <h2 style={{ color: '#1e293b', fontWeight: 700 }}>Your cart is empty</h2>
        <Button onClick={() => navigate('/')}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="checkout-page animate-fade-in">
      <div className="checkout-header">
        <button className="back-btn active-bounce" onClick={() => navigate('/cart')}>
          <ArrowLeft size={24} />
        </button>
        <h2>Checkout</h2>
        <div style={{ width: 40 }} />
      </div>

      <form className="checkout-form" onSubmit={handlePayment}>

        {/* Error Banner */}
        {errorMsg && (
          <div className="checkout-error-banner">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delivery Method */}
        <section className="checkout-section border-subtle">
          <h3>Delivery Method</h3>
          <div className="method-toggles">
            <button
              type="button"
              className={`method-toggle ${deliveryMethod === 'pickup' ? 'active' : ''}`}
              onClick={() => { setDeliveryMethod('pickup'); setErrorMsg(''); }}
            >
              <Package size={20} />
              <span>Pickup</span>
            </button>
            <button
              type="button"
              className={`method-toggle ${deliveryMethod === 'delivery' ? 'active' : ''}`}
              onClick={() => { setDeliveryMethod('delivery'); setErrorMsg(''); }}
            >
              <MapPin size={20} />
              <span>Delivery (+₦500)</span>
            </button>
          </div>

          {deliveryMethod === 'delivery' && (
            <div className="delivery-details animate-slide-up">
              <label className="input-label">
                Hostel / Location on Campus
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Block A, Room 102"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </label>
              <label className="input-label mt-3">
                Phone Number
                <input
                  type="tel"
                  className="input-field"
                  placeholder="080..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </label>
            </div>
          )}
        </section>

        {/* Payment Method */}
        <section className="checkout-section border-subtle">
          <h3>Payment Method</h3>
          <div className="method-toggles">
            <button
              type="button"
              className={`method-toggle ${paymentMethod === 'bank' ? 'active' : ''}`}
              onClick={() => { setPaymentMethod('bank'); setErrorMsg(''); }}
            >
              <CreditCard size={20} />
              <span>Card / Bank</span>
            </button>
            <button
              type="button"
              className={`method-toggle ${paymentMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => { setPaymentMethod('wallet'); setErrorMsg(''); }}
            >
              <Wallet size={20} />
              <span>Wallet</span>
            </button>
          </div>

          {/* Wallet balance info */}
          {paymentMethod === 'wallet' && (
            <div className={`wallet-info-row ${user.walletBalance < finalTotal ? 'insufficient' : 'sufficient'}`}>
              <Wallet size={16} />
              <span>
                Balance: <strong>₦{user.walletBalance.toLocaleString()}</strong>
                {user.walletBalance < finalTotal
                  ? ` — ₦${(finalTotal - user.walletBalance).toLocaleString()} short`
                  : ' — enough to cover this order ✓'}
              </span>
            </div>
          )}
        </section>

        {/* Order Summary */}
        <section className="checkout-section border-subtle">
          <h3>Order Summary</h3>
          <div className="order-items-minimal">
            {cart.map((item: CartItem) => (
              <div key={item.id} className="summary-item">
                <div className="summary-item-left">
                  <img src={item.image} alt={item.name} className="summary-item-img" />
                  <div>
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-qty">Qty: {item.quantity}</span>
                  </div>
                </div>
                <span className="summary-item-price">₦{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="summary-divider mt-2 mb-2" />

          <div className="summary-row">
            <span>Subtotal</span>
            <span>₦{cartTotal.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span>Delivery Fee</span>
            <span>{deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}</span>
          </div>
          <div className="summary-row total mt-2">
            <span>Total to Pay</span>
            <span className="text-primary">₦{finalTotal.toLocaleString()}</span>
          </div>
        </section>

        {/* CTA */}
        <div className="checkout-action-bar">
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={paymentMethod === 'wallet' && user.walletBalance < finalTotal}
          >
            {paymentMethod === 'wallet' ? <Wallet size={20} /> : <CreditCard size={20} />}
            {paymentMethod === 'wallet'
              ? `Pay ₦${finalTotal.toLocaleString()} from Wallet`
              : `Pay ₦${finalTotal.toLocaleString()} via Card`}
          </Button>
          <p className="secure-badge">
            {paymentMethod === 'wallet'
              ? '🔒 Instant wallet deduction — no card needed'
              : '🔒 Secure payment powered by Paystack'}
          </p>
        </div>
      </form>
    </div>
  );
}
