import React from "react";
import { useLocalization } from "../../localization/LocalizationContext";
import { cloudApi } from "../../../common/cloudApi";
import { useUpdate } from "../../contexts/UpdateContext";
import { getSettingsAboutLicenseSections } from "../../about-licenses";
import "./AboutSettings.css";

// Version is injected by Vite from package.json
declare const __APP_VERSION__: string;

const AboutSettings: React.FC = () => {
  const { t } = useLocalization();
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
  const isElectronRuntime = !!window.electronAPI;
  const licenseSections = getSettingsAboutLicenseSections(isElectronRuntime ? "full-electron" : "frontend-only");

  // Derive site URL from API base URL (remove the path portion)
  const apiBaseUrl = cloudApi.getBaseUrl();
  const siteUrl = apiBaseUrl.replace(/(https?:\/\/[^/]+).*/, "$1");

  const { updateAvailable, downloadProgress, updateDownloaded, checking, checkForUpdates, downloadUpdate, installUpdate } = useUpdate();

  const renderUpdateStatus = () => {
    if (!window.electronAPI) return null;

    if (updateDownloaded) {
      return (
        <p className="text-success mb-1">
          {t("UpdateDownloaded")} ({updateDownloaded.version})
        </p>
      );
    }
    if (downloadProgress !== null) {
      return (
        <>
          <p className="mb-1">
            {t("UpdateDownloading")} {Math.round(downloadProgress)}%
          </p>
          <div className="about-update-progress mb-2">
            <div className="about-update-progress-bar" style={{ width: `${downloadProgress}%` }} />
          </div>
        </>
      );
    }
    if (updateAvailable) {
      return (
        <p className="text-warning mb-1">
          {t("UpdateAvailable")} ({updateAvailable.version})
        </p>
      );
    }
    if (checking) {
      return <p className="text-muted mb-1">{t("UpdateChecking")}</p>;
    }
    return <p className="text-success mb-1">{t("UpdateUpToDate")}</p>;
  };

  const renderUpdateActions = () => {
    if (!window.electronAPI) return null;

    return (
      <p>
        {updateDownloaded ? (
          <button type="button" className="btn btn-success btn-sm me-2" onClick={installUpdate}>
            {t("UpdateInstall")}
          </button>
        ) : updateAvailable && downloadProgress === null ? (
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={downloadUpdate}>
            {t("UpdateDownload")}
          </button>
        ) : null}
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={checkForUpdates} disabled={checking || downloadProgress !== null}>
          {t("UpdateCheckNow")}
        </button>
      </p>
    );
  };

  return (
    <div className="container-fluid">
      <h3>{t("AboutTitle")}</h3>
      <p>{t("AboutDescription")}</p>
      <p>{t("AboutVersion").replace("{version}", version)}</p>
      {renderUpdateStatus()}
      {renderUpdateActions()}
      <p>
        {t("AboutMoreInfo")}{" "}
        <a href={siteUrl} target="_blank" rel="noopener noreferrer">
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>
        .
      </p>
      <hr />
      <h5>{t("AboutLicensesTitle")}</h5>
      {licenseSections.map((section) => (
        <div key={section.id} className="mb-3">
          <div className="fw-semibold">{t(section.titleKey) || section.title}</div>
          <ul className="mb-0">
            {section.entries.map((entry) => (
              <li key={entry.name + entry.licenceUrl}>
                <a href={entry.url} target="_blank" rel="noopener noreferrer">
                  {entry.name}
                </a>{" "}
                (
                <a href={entry.licenceUrl} target="_blank" rel="noopener noreferrer">
                  {entry.licence}
                </a>
                )
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent("pp-open-eula-dialog"))}
        >
          {t("EulaViewLicense")}
        </button>
      </p>
    </div>
  );
};

export default AboutSettings;
