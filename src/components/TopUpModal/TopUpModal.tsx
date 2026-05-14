import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { usePaystackPayment } from 'react-paystack';
import { useFeedback } from '../../context/FeedbackContext';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { Wallet, CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react';
import './TopUpModal.css';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const { user, topUpWallet } = useShop();
  const { showFeedback } = useFeedback();
  const [amount, setAmount] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  if (!user) return null;

  const config = {
    reference: `WAL-${new Date().getTime()}`,
    email: user.email,
    amount: (parseInt(amount) || 0) * 100, // in kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  };

  const onSuccess = (reference: any) => {
    setTransactionRef(reference.reference);
    topUpWallet(parseInt(amount));
    setIsSuccess(true);
    // Reset after success view
    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  const onClosePaystack = () => {
    console.log('Top up cancelled');
  };

  const initializePayment = usePaystackPayment(config);

  const handleTopUp = () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 100) {
      showFeedback({
        type: 'warning',
        title: 'Amount Too Low',
        message: 'Minimum wallet top up is ₦100.',
      });
      return;
    }
    // @ts-ignore
    initializePayment(onSuccess, onClosePaystack);
  };

  const handleClose = () => {
    setAmount('');
    setIsSuccess(false);
    setTransactionRef('');
    onClose();
  };

  if (isSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Success!">
        <div className="topup-success animate-fade-in">
          <div className="success-icon-wrapper">
            <CheckCircle2 size={64} className="success-icon" />
          </div>
          <h3>Wallet Funded!</h3>
          <p>₦{parseInt(amount).toLocaleString()} has been added to your balance.</p>
          <div className="ref-box">
            <span>Ref: {transactionRef}</span>
          </div>
          <Button fullWidth onClick={handleClose} className="mt-4">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Top Up Wallet"
      footer={
        <Button 
          fullWidth 
          variant="primary" 
          size="lg" 
          onClick={handleTopUp}
          disabled={!amount || parseInt(amount) < 100}
        >
          <CreditCard size={18} className="mr-2" />
          Fund Wallet ₦{(parseInt(amount) || 0).toLocaleString()}
        </Button>
      }
    >
      <div className="topup-container">
        <div className="current-balance-card glass-panel">
          <div className="balance-info">
            <span className="label">Current Balance</span>
            <span className="value">₦{user?.walletBalance.toLocaleString()}</span>
          </div>
          <Wallet size={24} className="text-secondary" />
        </div>

        <div className="amount-section">
          <label className="input-label">Enter Amount (₦)</label>
          <div className="amount-input-wrapper">
            <span className="currency-prefix">₦</span>
            <input 
              type="number" 
              className="amount-input" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="presets-grid">
          {PRESET_AMOUNTS.map(preset => (
            <button 
              key={preset}
              className={`preset-btn active-bounce ${parseInt(amount) === preset ? 'active' : ''}`}
              onClick={() => setAmount(preset.toString())}
            >
              ₦{preset.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="info-strip">
          <ChevronRight size={16} />
          <span>Top up via secure Bank Transfer, Card, or USSD</span>
        </div>
      </div>
    </Modal>
  );
}
