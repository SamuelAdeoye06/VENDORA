import React, { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import Modal from '../components/Modal/Modal';
import Button from '../components/Button/Button';
import './FeedbackContext.css';

type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackOptions {
  title: string;
  message: string;
  type?: FeedbackType;
  confirmText?: string;
}

interface ConfirmOptions extends FeedbackOptions {
  cancelText?: string;
  destructive?: boolean;
}

interface FeedbackContextType {
  showFeedback: (options: FeedbackOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

const feedbackIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<(FeedbackOptions & {
    cancelText?: string;
    destructive?: boolean;
    mode: 'notice' | 'confirm';
  }) | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = (result = false) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setFeedback(null);
  };

  const showFeedback = (options: FeedbackOptions) => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setFeedback({ ...options, type: options.type ?? 'info', mode: 'notice' });
  };

  const showConfirm = (options: ConfirmOptions) => {
    resolverRef.current?.(false);
    setFeedback({ ...options, type: options.type ?? 'warning', mode: 'confirm' });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const type = feedback?.type ?? 'info';
  const Icon = feedbackIcons[type];

  return (
    <FeedbackContext.Provider value={{ showFeedback, showConfirm }}>
      {children}

      <Modal
        isOpen={Boolean(feedback)}
        onClose={() => close(false)}
        title={feedback?.title ?? ''}
        footer={
          feedback ? (
            feedback.mode === 'confirm' ? (
              <>
                <Button variant="ghost" fullWidth onClick={() => close(false)}>
                  {feedback.cancelText ?? 'Cancel'}
                </Button>
                <Button
                  variant={feedback.destructive ? 'danger' : 'primary'}
                  fullWidth
                  onClick={() => close(true)}
                >
                  {feedback.confirmText ?? 'Continue'}
                </Button>
              </>
            ) : (
              <Button fullWidth onClick={() => close(false)}>
                {feedback.confirmText ?? 'Done'}
              </Button>
            )
          ) : null
        }
      >
        {feedback && (
          <div className={`feedback-content feedback-${type}`}>
            <div className="feedback-icon">
              <Icon size={34} strokeWidth={2} />
            </div>
            <p>{feedback.message}</p>
          </div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within a FeedbackProvider');
  return context;
}
