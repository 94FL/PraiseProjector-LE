import React from "react";
import { useLocalization } from "../localization/LocalizationContext";
import eulaEn from "../localization/eula.en.html?raw";
import eulaHu from "../localization/eula.hu.html?raw";
import "./EulaDialog.css";

/** EULA last-updated date extracted from the HTML. Used to detect EULA changes and re-prompt acceptance. */
const eulaDateMatch = eulaEn.match(/(\d{4}-\d{2}-\d{2})/);
export const EULA_DATE = eulaDateMatch?.[1] ?? "unknown";

interface EulaDialogProps {
  /** Called when user clicks Accept (first-run mode only) */
  onAccept?: () => void;
  /** Called when user clicks Decline — should exit the app */
  onDecline?: () => void;
  /** Called when user closes the dialog (view-only mode) */
  onClose?: () => void;
  /** When true, only shows a Close button (no Accept/Decline). Used from About page. */
  viewOnly?: boolean;
}

const EulaDialog: React.FC<EulaDialogProps> = ({ onAccept, onDecline, onClose, viewOnly = false }) => {
  const { language, t } = useLocalization();
  const eulaHtml = language === "hu" ? eulaHu : eulaEn;

  return (
    <div className="modal-backdrop show eula-backdrop">
      <div className="modal d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable eula-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t("EulaTitle")}</h5>
              {viewOnly && <button type="button" className="btn-close" aria-label={t("Close")} onClick={onClose} />}
            </div>
            <div className="modal-body eula-body" dangerouslySetInnerHTML={{ __html: eulaHtml }} />
            <div className="modal-footer">
              {viewOnly ? (
                <button className="btn btn-secondary" onClick={onClose}>
                  {t("Close")}
                </button>
              ) : (
                <>
                  <button className="btn btn-outline-danger" onClick={onDecline}>
                    {t("EulaDecline")}
                  </button>
                  <button className="btn btn-primary" onClick={onAccept}>
                    {t("EulaAccept")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EulaDialog;
