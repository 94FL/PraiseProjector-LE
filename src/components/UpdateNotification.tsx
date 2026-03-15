import React, { useState, useEffect } from "react";
import { useLocalization } from "../localization/LocalizationContext";
import { useUpdate } from "../contexts/UpdateContext";
import "./UpdateNotification.css";

export const UpdateNotification: React.FC = () => {
  const { t } = useLocalization();
  const { updateAvailable, downloadProgress, updateDownloaded, downloadUpdate, installUpdate } = useUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissedVersion, setLastDismissedVersion] = useState<string | null>(null);

  // Re-show popup when a new version becomes available (different from last dismissed)
  useEffect(() => {
    const version = updateDownloaded?.version ?? updateAvailable?.version ?? null;
    if (version && version !== lastDismissedVersion) {
      setDismissed(false);
    }
  }, [updateAvailable?.version, updateDownloaded?.version, lastDismissedVersion]);

  const handleDismiss = () => {
    const version = updateDownloaded?.version ?? updateAvailable?.version ?? null;
    setLastDismissedVersion(version);
    setDismissed(true);
  };

  if (dismissed || (!updateAvailable && !updateDownloaded)) return null;

  return (
    <div className="update-notification">
      {updateDownloaded ? (
        <>
          <span className="update-message">
            {t("UpdateDownloaded")} ({updateDownloaded.version})
          </span>
          <button type="button" className="update-btn update-btn-primary" onClick={installUpdate}>
            {t("UpdateRestartNow")}
          </button>
          <button type="button" className="update-btn update-btn-secondary" onClick={handleDismiss}>
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
