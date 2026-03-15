import React from "react";
import { Settings } from "../../types";
import { useLocalization } from "../../localization/LocalizationContext";

interface SearchingSettingsProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const ENGINES = [
  { value: "traditional" as const, labelKey: "TraditionalSearch", descKey: "TraditionalSearchDesc" },
  { value: "fuse" as const, labelKey: "FuseSearch", descKey: "FuseSearchDesc" },
] as const;

const SearchingSettings: React.FC<SearchingSettingsProps> = ({ settings, updateSetting }) => {
  const { t } = useLocalization();
  const method = settings.searchMethod;
  const isTraditional = method === "traditional";
  const isFuzzyEngine = !isTraditional;

  return (
    <div className="container-fluid">
      {/* Search Engine Selection */}
      <div className="row mb-3">
        <div className="col-md-12">
          <h5>{t("SearchEngineSelection")}</h5>
          <div className="d-flex gap-3 flex-wrap">
            {ENGINES.map((eng) => (
              <label key={eng.value} className={`card flex-fill mb-0 ${method === eng.value ? "border-primary" : ""}`}>
                <div className="card-body">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="searchMethod"
                      checked={method === eng.value}
                      onChange={() => updateSetting("searchMethod", eng.value)}
                    />
                    <span className="form-check-label fw-bold">{t(eng.labelKey)}</span>
                  </div>
                  <small className="text-muted d-block mt-1">{t(eng.descKey)}</small>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <hr className="my-3" />

      {/* Common Search Settings */}
      <div className="row mb-3">
        <div className="col-md-12">
          <h5>{t("CommonSearchSettings")}</h5>
          <div className="form-group">
            <label htmlFor="searchMaxResults">{t("MaximumResults")}</label>
            <input
              type="number"
              className="form-control"
              id="searchMaxResults"
              min="0"
              max="1000"
              step="10"
              value={settings.searchMaxResults ?? 0}
              onChange={(e) => updateSetting("searchMaxResults", parseInt(e.target.value) || 0)}
            />
            <small className="form-text text-muted">{t("MaximumResultsHint")}</small>
          </div>
        </div>
      </div>

      <hr className="my-3" />

      {/* Traditional Search Settings */}
      <div className="row mb-3">
        <div className="col-md-12">
          <h5>
            {t("TraditionalSearchSettings")}
            {isFuzzyEngine && <small className="text-muted ms-2">({t("CurrentlyDisabled")})</small>}
          </h5>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="enableSimilarTextSearch"
              checked={settings.useTextSimilarities}
              disabled={isFuzzyEngine}
              onChange={(e) => updateSetting("useTextSimilarities", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="enableSimilarTextSearch">
              {t("EnableSimilarTextSearch")}
            </label>
            <small className="form-text text-muted d-block">{t("EnableSimilarTextSearchHint")}</small>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="traditionalSearchCaseSensitive"
              checked={settings.traditionalSearchCaseSensitive ?? false}
              disabled={isFuzzyEngine}
              onChange={(e) => updateSetting("traditionalSearchCaseSensitive", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="traditionalSearchCaseSensitive">
              {t("CaseSensitiveSearch")}
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="traditionalSearchWholeWords"
              checked={settings.traditionalSearchWholeWords ?? false}
              disabled={isFuzzyEngine}
              onChange={(e) => updateSetting("traditionalSearchWholeWords", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="traditionalSearchWholeWords">
              {t("MatchWholeWordsOnly")}
            </label>
          </div>
        </div>
      </div>

      <hr className="my-3" />

      {/* Fuzzy Engine Settings (shared by Orama / MiniSearch) */}
      <div className="row mb-3">
        <div className="col-md-12">
          <h5>
            {t("FuzzySearchSettings")}
            {isTraditional && <small className="text-muted ms-2">({t("CurrentlyDisabled")})</small>}
          </h5>

          <div className="form-group mb-2">
            <label htmlFor="fuseMinMatchCharLength">{t("FuseMinMatchCharLength")}</label>
            <input
              type="number"
              className="form-control"
              id="fuseMinMatchCharLength"
              min="0"
              max="3"
              step="1"
              value={settings.fuseMinMatchCharLength ?? 1}
              disabled={isTraditional}
              onChange={(e) => updateSetting("fuseMinMatchCharLength", parseInt(e.target.value) || 0)}
            />
            <small className="form-text text-muted">{t("FuseMinMatchCharLengthHint")}</small>
          </div>

          <div className="form-group mb-2">
            <label htmlFor="fuseThreshold">
              {t("FuseThreshold")}: {(settings.fuseThreshold ?? 0).toFixed(2)}
            </label>
            <input
              type="range"
              className="form-range"
              id="fuseThreshold"
              min="0"
              max="1"
              step="0.05"
              value={settings.fuseThreshold ?? 0}
              disabled={isTraditional}
              onChange={(e) => updateSetting("fuseThreshold", parseFloat(e.target.value) || 0)}
            />
            <small className="form-text text-muted">{t("FuseThresholdHint")}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchingSettings;
