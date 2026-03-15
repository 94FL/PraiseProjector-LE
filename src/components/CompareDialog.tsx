import React, { useState } from "react";
import { Song } from "../classes/Song";
import { useLocalization, StringKey } from "../localization/LocalizationContext";
import ChordProEditor from "./ChordProEditor/ChordProEditor";
import "./CompareDialog.css";

// Result type for Import mode decisions
export interface ImportDecision {
  action: "import" | "import-and-group";
  groupWithSong?: Song; // the song to group with (for "import-and-group")
}

interface CompareDialogProps {
  originalSong: Song | null;
  songsToCompare: Song[];
  mode: "ViewOnly" | "Verify" | "Import" | "Conflict" | "History";
  onClose: (mergedSong?: Song, importDecision?: ImportDecision) => void;
  leftLabel?: string;
  rightLabel?: string;
  leftButtonLabel?: string;
  rightButtonLabel?: string;
}

// Helper to get version display text from song's Change property
const getVersionLabel = (
  song: Song,
  isActual: boolean,
  actualSongText: string,
  t: (key: StringKey) => string,
  actualChangeOverride?: string
): string => {
  const change = (isActual ? actualChangeOverride : song.Change) || "";
  if (isActual && song.Text === actualSongText) {
    return change ? `${change} (${t("ActualSong")})` : t("ActualSong");
  }
  return change || t("UnknownVersion");
};

const CompareDialog: React.FC<CompareDialogProps> = ({
  originalSong,
  songsToCompare,
  mode,
  onClose,
  leftLabel,
  rightLabel,
  leftButtonLabel,
  rightButtonLabel,
}) => {
  const { t } = useLocalization();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(false);

  // For History mode: track selected indices for left and right panels
  const [leftVersionIndex, setLeftVersionIndex] = useState(0);
  const [rightVersionIndex, setRightVersionIndex] = useState(Math.min(1, songsToCompare.length - 1));

  // In History mode, all versions are in songsToCompare (including current)
  // Left panel shows the version at leftVersionIndex, right shows rightVersionIndex
  const isHistoryMode = mode === "History";
  const isImportMode = mode === "Import";

  // Build version list for History mode dropdowns
  const buildVersionList = (): { label: string; song: Song }[] => {
    const versions: { label: string; song: Song }[] = [];
    const actualText = originalSong?.Text || "";
    let actualChange = originalSong?.Change || "";

    // If current song has no embedded change metadata, reuse it from matching history entry.
    // History entries carry uploader@timestamp in Song.Change.
    if (!actualChange && originalSong) {
      const matchingHistory = songsToCompare.find((s) => s.Text === originalSong.Text && s.Change);
      if (matchingHistory) {
        actualChange = matchingHistory.Change;
      }
    }

    // Add original song as first item if available
    if (originalSong) {
      versions.push({
        label: getVersionLabel(originalSong, true, actualText, t, actualChange),
        song: originalSong,
      });
    }

    // Add all history versions
    for (const s of songsToCompare) {
      // Skip if it's the same as original
      if (originalSong && s.Text === originalSong.Text) continue;
      versions.push({
        label: getVersionLabel(s, false, actualText, t),
        song: s,
      });
    }

    return versions;
  };

  const versionList = isHistoryMode ? buildVersionList() : [];

  // Get the actual songs to display based on selected indices
  const getLeftSongForHistory = () => versionList[leftVersionIndex]?.song || originalSong;
  const getRightSongForHistory = () => versionList[rightVersionIndex]?.song || songsToCompare[0];

  // Get current compared song for non-History modes
  const comparedSong = songsToCompare[currentIndex];

  const leftContent = isHistoryMode ? getLeftSongForHistory()?.Text || "" : originalSong?.Text || "";
  const rightContent = isHistoryMode ? getRightSongForHistory()?.Text || "" : comparedSong?.Text || "";

  const handleSaveLeft = () => {
    if (originalSong) {
      const merged = new Song(leftContent, originalSong.System);
      onClose(merged);
    }
  };

  const handleSaveRight = () => {
    const song = isHistoryMode ? getRightSongForHistory() : comparedSong;
    if (song) {
      const merged = new Song(rightContent, song.System);
      onClose(merged);
    }
  };

  // Import mode handlers
  const handleImportIndependent = () => {
    onClose(undefined, { action: "import" });
  };

  const handleImportAndGroup = () => {
    onClose(undefined, { action: "import-and-group", groupWithSong: comparedSong });
  };

  const handleNext = () => {
    if (currentIndex < songsToCompare.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const renderHistoryVersionSelector = (selectedIndex: number, onChange: (index: number) => void, ariaLabel: string) => {
    return (
      <select
        className="form-select form-select-sm history-version-select"
        value={selectedIndex}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label={ariaLabel}
      >
        {versionList.map((v, idx) => (
          <option key={idx} value={idx}>
            {v.label}
          </option>
        ))}
      </select>
    );
  };

  const renderContent = () => {
    // When showing diff, all editors should be read-only (like C# EnableEditMode(false))
    const editableInConflict = mode === "Conflict" && !showDiff;
    // Always hide toolbar/tabs in CompareDialog (like C# PreviewOnly) - this is a compare view, not an editor
    const usePreviewOnly = true;

    return (
      <div className={`compare-view ${showDiff ? "compare-view-with-diff" : ""}`}>
        {/* Left panel - Original/Local version */}
        <div className="compare-panel">
          {isHistoryMode ? (
            renderHistoryVersionSelector(leftVersionIndex, setLeftVersionIndex, t("LeftVersion"))
          ) : (
            <label>{leftLabel || (isImportMode ? t("SongToImport") : mode === "Conflict" ? t("LocallyModifiedVersion") : t("ActualSong"))}</label>
          )}
          <ChordProEditor
            key={`left-${isHistoryMode ? leftVersionIndex : currentIndex}`}
            song={new Song(leftContent)}
            initialEditMode={editableInConflict}
            previewOnly={usePreviewOnly}
          />
          {mode === "Conflict" && !showDiff && (
            <button className="btn btn-primary mt-2" onClick={handleSaveLeft}>
              {leftButtonLabel || t("KeepThisOne")}
            </button>
          )}
        </div>

        {/* Middle panel - Diff view using ChordProEditor's built-in diff functionality */}
        {showDiff && (
          <div className="compare-panel diff-panel">
            <label>{t("Differences")}</label>
            <ChordProEditor
              key={`diff-${isHistoryMode ? `${leftVersionIndex}-${rightVersionIndex}` : currentIndex}`}
              song={new Song(rightContent)}
              compareBase={leftContent}
              initialEditMode={false}
            />
          </div>
        )}

        {/* Right panel - Compared/Server version */}
        <div className="compare-panel">
          {isHistoryMode ? (
            renderHistoryVersionSelector(rightVersionIndex, setRightVersionIndex, t("RightVersion"))
          ) : (
            <label>
              {rightLabel || (isImportMode ? t("SimilarSongInDatabase") : mode === "Conflict" ? t("NewVersionOnServer") : t("SimilarSongInDatabase"))}
            </label>
          )}
          <ChordProEditor
            key={`right-${isHistoryMode ? rightVersionIndex : currentIndex}`}
            song={new Song(rightContent)}
            initialEditMode={editableInConflict}
            previewOnly={usePreviewOnly}
          />
          {mode === "Conflict" && !showDiff && (
            <button className="btn btn-primary mt-2" onClick={handleSaveRight}>
              {rightButtonLabel || t("KeepThisOne")}
            </button>
          )}
        </div>
      </div>
    );
  };

  // In History mode, hide prev/next buttons; in Import mode show them for navigating similar songs
  const showNavButtons = !isHistoryMode;

  return (
    <div className="modal-backdrop show compare-dialog-backdrop">
      <div className="modal d-block">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{isHistoryMode ? t("SongHistory") : isImportMode ? t("ImportSong") : t("CompareSongs")}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">{renderContent()}</div>
            <div className="modal-footer">
              {showNavButtons && (
                <button className="btn btn-secondary" onClick={handlePrev} disabled={currentIndex === 0}>
                  &lt;&lt;
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowDiff(!showDiff)}>
                {showDiff ? t("HideDifferences") : t("ShowDifferences")}
              </button>
              {showNavButtons && (
                <button className="btn btn-secondary" onClick={handleNext} disabled={currentIndex >= songsToCompare.length - 1}>
                  &gt;&gt;
                </button>
              )}
              {isImportMode && (
                <>
                  <button type="button" className="btn btn-primary" onClick={handleImportIndependent}>
                    {t("Import")}
                  </button>
                  <button type="button" className="btn btn-success" onClick={handleImportAndGroup} disabled={songsToCompare.length === 0}>
                    {t("ImportAndGroup")}
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => onClose()}>
                {isImportMode ? t("Cancel") : t("Close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareDialog;
