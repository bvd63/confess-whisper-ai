import { createContext, useContext, useState, ReactNode } from 'react';

export type ConfirmVariant = 'default' | 'warning' | 'danger';

export interface ConfirmOptions {
  titleKey: string;
  messageKey: string;
  variant?: ConfirmVariant;
  confirmTextKey?: string;
  cancelTextKey?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    titleKey: '',
    messageKey: '',
    variant: 'default',
    resolve: () => {},
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        variant: options.variant || 'default',
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    confirmState.resolve(true);
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const handleCancel = () => {
    confirmState.resolve(false);
    setConfirmState({ ...confirmState, isOpen: false });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState.isOpen && (
        <ConfirmDialog
          {...confirmState}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
};

// Import the dialog component
import { ConfirmDialog } from '@/components/GlobalConfirmDialog';
