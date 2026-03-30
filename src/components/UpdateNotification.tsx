import React, { useState } from "react";
import { useLocalization } from "../localization/LocalizationContext";
import { useUpdate } from "../contexts/UpdateContext";
import "./UpdateNotification.css";

export const UpdateNotification: React.FC = () => {
  const { t } = useLocalization();
  const { updateAvailable, downloadProgress, updateDownloaded, downloadUpdate, installUpdate, installInProgress, installError } = useUpdate();
  const [lastDismissedVersion, setLastDismissedVersion] = useState<string | null>(null);

  // Compute dismissed state: dismissed if current version matches last dismissed version
  const currentVersion = updateDownloaded?.version ?? updateAvailable?.version ?? null;
  const dismissed = currentVersion === lastDismissedVersion && currentVersion !== null;

  const handleDismiss = () => {
    setLastDismissedVersion(currentVersion);
  };

  if (dismissed || (!updateAvailable && !updateDownloaded)) return null;

  return (
    <div className="update-notification">
      {updateDownloaded ? (
        <>
          <span className="update-message">
            {t("UpdateDownloaded")} ({updateDownloaded.version})
          </span>
          {installError && <span className="update-error">{installError}</span>}
          <button type="button" className="update-btn update-btn-primary" onClick={installUpdate} disabled={installInProgress}>
            {installInProgress ? t("Updating...") : t("UpdateRestartNow")}
          </button>
          <button type="button" className="update-btn update-btn-secondary" onClick={handleDismiss} disabled={installInProgress}>
            {t("UpdateLater")}
          </button>
        </>
      ) : downloadProgress !== null ? (
        <>
          <span className="update-message">
            {t("UpdateDownloading")} {Math.round(downloadProgress)}%
          </span>
          <div className="update-progress">
            <div className="update-progress-bar" style={{ width: `${downloadProgress}%` }} />
          </div>
        </>
      ) : updateAvailable ? (
        <>
          <span className="update-message">
            {t("UpdateAvailable")} ({updateAvailable.version})
          </span>
          <button type="button" className="update-btn update-btn-primary" onClick={downloadUpdate}>
            {t("UpdateDownload")}
          </button>
          <button type="button" className="update-btn update-btn-secondary" onClick={handleDismiss}>
            {t("UpdateDismiss")}
          </button>
        </>
      ) : null}
    </div>
  );
};
