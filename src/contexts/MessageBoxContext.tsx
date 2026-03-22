import React, { createContext, useContext, ReactNode, useCallback } from "react";

export interface ConfirmOptions {
  confirmText?: string;
  confirmDanger?: boolean;
}

interface MessageBoxContextType {
  showMessage: (title: string, message: string, onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void, options?: ConfirmOptions) => void;
  /** Promise-returning version of showConfirm for async/await usage */
  showConfirmAsync: (title: string, message: string, options?: ConfirmOptions) => Promise<boolean>;
  /** 3-button dialog returning "yes", "no", or "cancel" */
  showYesNoCancelAsync: (title: string, message: string, options?: ConfirmOptions) => Promise<"yes" | "no" | "cancel">;
}

const MessageBoxContext = createContext<MessageBoxContextType | undefined>(undefined);

export const useMessageBox = () => {
  const context = useContext(MessageBoxContext);
  if (!context) {
    throw new Error("useMessageBox must be used within a MessageBoxProvider");
  }
  return context;
};

export interface MessageBoxConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  onNo?: () => void;
  onCancel?: () => void;
  // When false the Cancel button will NOT be shown (OK-only dialog)
  showCancel?: boolean;
  /** Custom text for the confirm/OK button */
  confirmText?: string;
  /** When true the confirm button will be styled as a danger (red) button */
  confirmDanger?: boolean;
}

interface MessageBoxProviderProps {
  children: ReactNode;
  onMessageBoxChange: (config: MessageBoxConfig | null) => void;
}

export const MessageBoxProvider: React.FC<MessageBoxProviderProps> = ({ children, onMessageBoxChange }) => {
  const showMessage = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      onMessageBoxChange({
        title,
        message,
        onConfirm: () => {
          onConfirm?.();
          onMessageBoxChange(null);
        },
        showCancel: false,
      });
    },
    [onMessageBoxChange]
  );

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, onCancel?: () => void, options?: ConfirmOptions) => {
      onMessageBoxChange({
        title,
        message,
        onConfirm: () => {
          // Close confirm first so any later dialogs triggered by async work
          // (e.g. save errors) are not immediately cleared by this confirm.
          onMessageBoxChange(null);
          Promise.resolve(onConfirm()).catch((error) => {
            console.error("MessageBox", "onConfirm callback failed", error);
          });
        },
        onCancel: () => {
          onMessageBoxChange(null);
          Promise.resolve(onCancel?.()).catch((error) => {
            console.error("MessageBox", "onCancel callback failed", error);
          });
        },
        showCancel: true,
        confirmText: options?.confirmText,
        confirmDanger: options?.confirmDanger,
      });
    },
    [onMessageBoxChange]
  );

  const showConfirmAsync = useCallback(
    (title: string, message: string, options?: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        onMessageBoxChange({
          title,
          message,
          onConfirm: () => {
            onMessageBoxChange(null);
            resolve(true);
          },
          onCancel: () => {
            onMessageBoxChange(null);
            resolve(false);
          },
          showCancel: true,
          confirmText: options?.confirmText,
          confirmDanger: options?.confirmDanger,
        });
      });
    },
    [onMessageBoxChange]
  );

  const showYesNoCancelAsync = useCallback(
    (title: string, message: string, options?: ConfirmOptions): Promise<"yes" | "no" | "cancel"> => {
      return new Promise((resolve) => {
        onMessageBoxChange({
          title,
          message,
          onConfirm: () => {
            onMessageBoxChange(null);
            resolve("yes");
          },
          onNo: () => {
            onMessageBoxChange(null);
            resolve("no");
          },
          onCancel: () => {
            onMessageBoxChange(null);
            resolve("cancel");
          },
          showCancel: true,
          confirmText: options?.confirmText,
          confirmDanger: options?.confirmDanger,
        });
      });
    },
    [onMessageBoxChange]
  );

  return (
    <MessageBoxContext.Provider value={{ showMessage, showConfirm, showConfirmAsync, showYesNoCancelAsync }}>{children}</MessageBoxContext.Provider>
  );
};
