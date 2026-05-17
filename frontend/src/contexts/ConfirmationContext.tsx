import React, { createContext, useContext, useState, useCallback } from "react";

export interface ConfirmationOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  icon?: React.ReactNode;
}

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface ConfirmationContextType {
  state: ConfirmationState;
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  close: () => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined,
);

export function ConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    title: "",
  });

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          isOpen: true,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },
    [],
  );

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmationContext.Provider value={{ state, confirm, close }}>
      {children}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "useConfirmation must be used within ConfirmationProvider",
    );
  }
  return context;
}
