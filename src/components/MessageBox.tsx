import React from "react";
import { useLocalization } from "../localization/LocalizationContext";
import "./MessageBox.css";

interface MessageBoxProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onNo?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  noText?: string;
  cancelText?: string;
  showCancel?: boolean;
  /** When true the confirm button is styled as a danger (red) button */
  confirmDanger?: boolean;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  title,
  message,
  onConfirm,
  onNo,
  onCancel,
  confirmText,
  noText,
  cancelText,
  showCancel = true,
  confirmDanger,
}) => {
  const { t } = useLocalization();

  // Use localized defaults if not provided
  const displayTitle = title || t("Confirm");
  const displayConfirmText = confirmText || (onNo ? t("Yes") : t("OK"));
  const displayNoText = noText || t("No");
  const displayCancelText = cancelText || t("Cancel");

  return (
    <div className="messagebox-overlay" onClick={onCancel ? onCancel : undefined}>
      <div className="messagebox-container" onClick={(e) => e.stopPropagation()}>
        <div className="messagebox-header">
          <h5 className="messagebox-title">{displayTitle}</h5>
        </div>
        <div className="messagebox-body">
          <p>{message}</p>
        </div>
        <div className="messagebox-footer">
          {onCancel && showCancel && (
            <button className="btn btn-secondary" onClick={onCancel}>
              {displayCancelText}
            </button>
          )}
          {onNo && (
            <button className="btn btn-outline-secondary" onClick={onNo}>
              {displayNoText}
            </button>
          )}
          <button className={confirmDanger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm} autoFocus>
            {displayConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
