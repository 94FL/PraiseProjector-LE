import React, { useState, useCallback, useRef, useEffect, Suspense, lazy } from "react";
import { DocumentImporter } from "../../services/DocumentImporter";
import { ChordProConverter } from "../../services/ChordProConverter";
import { ImportLines } from "../../classes/ImportLine";
import { ChordMap, ChordNormalizer } from "../../classes/ChordMap";
import { Song } from "../../classes/Song";
import { Database } from "../../classes/Database";
import ChordProEditorComponent from "../ChordProEditor/ChordProEditor";
import { ChordProEditor } from "../ChordProEditor/ChordProEditor";
import { setEditedSong } from "../../state/CurrentSongStore";
import MessageBox from "../MessageBox";
import { ContextMenu, ContextMenuItem } from "../ContextMenu/ContextMenu";
import { useLocalization, StringKey } from "../../localization/LocalizationContext";
import type { ImportDecision } from "../CompareDialog";
import "./SongImporterWizard.css";

const CompareDialog = lazy(() => import("../CompareDialog"));

interface SongImporterWizardProps {
  database: Database;
  onClose: () => void;
  onSongImported?: (song: Song) => void;
  initialFiles?: File[];
}

/**
 * Complete port of C# SongImporterForm to React/TypeScript
 * 4-step wizard for importing songs from documents
 */
export const SongImporterWizard: React.FC<SongImporterWizardProps> = ({ database, onClose, onSongImported, initialFiles }) => {
  const { t } = useLocalization();

  const format = useCallback((key: StringKey, ...args: string[]) => args.reduce((text, arg, index) => text.replace(`{${index}}`, arg), t(key)), [t]);

  const getLineTypeLabel = useCallback(
    (lineType?: string | null) => {
      switch (lineType) {
        case "title":
          return t("SongImportLineTypeTitle");
        case "chord":
          return t("SongImportLineTypeChord");
        case "lyrics":
          return t("SongImportLineTypeLyrics");
        case "comment":
          return t("SongImportLineTypeComment");
        default:
          return t("SongImportLineTypeUnset");
      }
    },
    [t]
  );
  // Wizard state
  const [currentTab, setCurrentTab] = useState(0);

  // File selection state (Tab 0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedFiles, setImportedFiles] = useState<File[]>([]);

  // Line classification state (Tab 1)
  const [allLines, setAllLines] = useState<ImportLines>(new ImportLines());
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [filteredLines, setFilteredLines] = useState<ImportLines>(new ImportLines());

  // Long press tracking
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Chord normalization state (Tab 2)
  const [chordMap, setChordMap] = useState<ChordMap>(new ChordMap());
  const [useH, setUseH] = useState(false);
  const [lcMoll, setLcMoll] = useState(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);

  // ChordPro editor state (Tab 3)
  const [generatedChordPro, setGeneratedChordPro] = useState("");

  // MessageBox state
  const [messageBox, setMessageBox] = useState<{
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // ContextMenu state
  const [contextMenu, setContextMenu] = useState<{
    items: ContextMenuItem[];
    position: { x: number; y: number };
    onSelect: (value: string) => void;
  } | null>(null);

  // CompareDialog state for similarity check when saving imported songs
  const [compareDialogState, setCompareDialogState] = useState<{
    song: Song;
    similarSongs: Song[];
    onDecision: (decision: ImportDecision) => void;
  } | null>(null);

  // Refs
  const chordProEditorRef = useRef<ChordProEditor>(null);

  // Services
  const documentImporter = useRef(new DocumentImporter());

  // === Tab 0: File Selection ===

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!DocumentImporter.isSupportedFile(file.name)) {
        setMessageBox({
          title: t("SongImportUnsupportedFormatTitle"),
          message: format("SongImportUnsupportedFormatMessage", file.name),
          onConfirm: () => setMessageBox(null),
          onCancel: () => setMessageBox(null),
        });
        return;
      }

      setSelectedFile(file);
      setImportedFiles([file]);

      // Auto-load if it's a .chp file
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".chp") {
        const text = await file.text();
        setGeneratedChordPro(text);
        setCurrentTab(3); // Jump to editor
        return;
      }
    },
    [format, t]
  );

  const parseFileAndAdvance = useCallback(
    async (file: File) => {
      try {
        const lines = await documentImporter.current.parseDocument(file);
        setAllLines(lines);

        ChordProConverter.autoDetectLineTypes(lines);

        const allIndices = new Set<number>();
        for (let i = 0; i < lines.count; i++) {
          allIndices.add(i);
        }
        setSelectedLines(allIndices);

        setCurrentTab(1);
      } catch (error) {
        console.error("Import", "Failed to parse document", error);

        let errorMessage = t("SongImportParseUnknownError");

        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          if (message.includes("pdf") || message.includes("worker")) {
            errorMessage = t("SongImportParsePdfError");
          } else if (message.includes("unsupported file format")) {
            errorMessage = t("SongImportParseUnsupportedError");
          } else if (message.includes("network") || message.includes("fetch")) {
            errorMessage = t("SongImportParseNetworkError");
          } else if (message.includes("encoding") || message.includes("charset")) {
            errorMessage = t("SongImportParseEncodingError");
          } else {
            errorMessage = format("SongImportParseErrorWithDetails", error.message);
          }
        }

        setMessageBox({
          title: t("SongImportErrorTitle"),
          message: errorMessage,
          onConfirm: () => setMessageBox(null),
          onCancel: () => setMessageBox(null),
        });
      }
    },
    [format, t]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleNextFromFileSelection = useCallback(async () => {
    if (!selectedFile) {
      setMessageBox({
        title: t("SongImportNoFileSelectedTitle"),
        message: t("SongImportNoFileSelectedMessage"),
        onConfirm: () => setMessageBox(null),
        onCancel: () => setMessageBox(null),
      });
      return;
    }

    await parseFileAndAdvance(selectedFile);
  }, [parseFileAndAdvance, selectedFile, t]);

  useEffect(() => {
    if (!initialFiles || initialFiles.length === 0) return;

    const supportedFiles = initialFiles.filter((file) => DocumentImporter.isSupportedFile(file.name));
    if (supportedFiles.length === 0) {
      const firstName = initialFiles[0]?.name || "";
      setMessageBox({
        title: t("SongImportUnsupportedFormatTitle"),
        message: format("SongImportUnsupportedFormatMessage", firstName),
        onConfirm: () => setMessageBox(null),
        onCancel: () => setMessageBox(null),
      });
      return;
    }

    const firstFile = supportedFiles[0];
    setImportedFiles(supportedFiles);
    setSelectedFile(firstFile);

    const ext = firstFile.name.substring(firstFile.name.lastIndexOf(".")).toLowerCase();
    if (ext === ".chp") {
      void firstFile.text().then((text) => {
        setGeneratedChordPro(text);
        setCurrentTab(3);
      });
      return;
    }

    void parseFileAndAdvance(firstFile);
  }, [format, initialFiles, parseFileAndAdvance, t]);

  // === Tab 1: Line Classification ===

  const handleLineCheckToggle = useCallback((index: number) => {
    setSelectedLines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleLineTypeBadgeClick = useCallback(
    (index: number) => {
      const line = allLines.get(index);
      if (!line) return;

      // Toggle between 'lyrics' and 'chord'
      if (line.line_type === "lyrics") {
        line.line_type = "chord";
      } else {
        line.line_type = "lyrics";
      }

      setAllLines(new ImportLines(allLines.getAll())); // Trigger re-render
    },
    [allLines]
  );

  const handleLineTypeBadgeLongPress = useCallback(
    (index: number, event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      const line = allLines.get(index);
      if (!line) return;

      // Get position for context menu
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.bottom + 5,
      };

      // Show context menu with all options
      const items: ContextMenuItem[] = [
        { label: t("SongImportLineTypeTitle"), value: "title" },
        { label: t("SongImportLineTypeChord"), value: "chord" },
        { label: t("SongImportLineTypeLyrics"), value: "lyrics" },
        { label: t("SongImportLineTypeComment"), value: "comment" },
      ];

      setContextMenu({
        items,
        position,
        onSelect: (value: string) => {
          line.line_type = value;
          setAllLines(new ImportLines(allLines.getAll())); // Trigger re-render
        },
      });
    },
    [allLines, t]
  );

  const handleLineTypeChange = useCallback(
    (lineType: string) => {
      // Apply to selected lines
      for (const index of selectedLines) {
        const line = allLines.get(index);
        if (line) {
          line.line_type = lineType;
        }
      }
      setAllLines(new ImportLines(allLines.getAll())); // Trigger re-render
    },
    [selectedLines, allLines]
  );

  const handleSelectAll = useCallback(() => {
    const newSet = new Set<number>();
    for (let i = 0; i < allLines.count; i++) {
      newSet.add(i);
    }
    setSelectedLines(newSet);
  }, [allLines]);

  const handleSelectNone = useCallback(() => {
    setSelectedLines(new Set());
  }, []);

  const handleSelectInvert = useCallback(() => {
    const newSet = new Set<number>();
    for (let i = 0; i < allLines.count; i++) {
      if (!selectedLines.has(i)) {
        newSet.add(i);
      }
    }
    setSelectedLines(newSet);
  }, [selectedLines, allLines]);

  const handleLyricsOnly = useCallback(() => {
    // Select all lines with 'lyrics' type, deselect others
    const newSet = new Set<number>();
    for (let i = 0; i < allLines.count; i++) {
      const line = allLines.get(i);
      if (line && line.line_type === "lyrics") {
        newSet.add(i);
      }
    }
    setSelectedLines(newSet);
  }, [allLines]);

  const handleNextFromLineClassification = useCallback(() => {
    // Filter only selected lines
    const selectedLinesArray = allLines.getAll().filter((_, index) => selectedLines.has(index));
    const filtered = new ImportLines(selectedLinesArray);
    setFilteredLines(filtered);

    // Collect chords and build chord map from selected lines only
    const chords = ChordProConverter.collectChords(filtered);
    const map = ChordNormalizer.buildChordMap(chords, useH, lcMoll);
    setChordMap(map);
    setCurrentTab(2);
  }, [allLines, selectedLines, useH, lcMoll]);

  // === Tab 2: Chord Normalization ===

  const handleUseHChange = useCallback(
    (checked: boolean) => {
      setUseH(checked);
      // Rebuild chord map with new setting
      const chords = ChordProConverter.collectChords(filteredLines);
      const map = ChordNormalizer.buildChordMap(chords, checked, lcMoll);
      setChordMap(map);
    },
    [filteredLines, lcMoll]
  );

  const handleLcMollChange = useCallback(
    (checked: boolean) => {
      setLcMoll(checked);
      // Rebuild chord map with new setting
      const chords = ChordProConverter.collectChords(filteredLines);
      const map = ChordNormalizer.buildChordMap(chords, useH, checked);
      setChordMap(map);
    },
    [filteredLines, useH]
  );

  const handleChordEdit = useCallback(
    (original: string, newValue: string) => {
      chordMap.set(original, newValue);
      setChordMap(new ChordMap()); // Trigger re-render
      // Copy entries
      for (const [k, v] of chordMap.getEntries()) {
        chordMap.set(k, v);
      }
    },
    [chordMap]
  );

  const handleNextFromChordNormalization = useCallback(() => {
    // Generate ChordPro from selected lines only
    const chordPro = ChordProConverter.convertToChordPro(filteredLines, chordMap);
    // Create preview song for ChordProEditor
    setGeneratedChordPro(chordPro);
    setCurrentTab(3);
  }, [filteredLines, chordMap]);

  // === Tab 3: ChordPro Editor ===

  const handleChordProChange = useCallback((value: string) => {
    setGeneratedChordPro(value);
  }, []);

  const handleSaveAndRestart = useCallback(async () => {
    try {
      // Parse ChordPro and create song
      const song = new Song(generatedChordPro, "G");

      if (!song.Title || !song.Title.trim()) {
        // force user to set title before saving
        setMessageBox({
          title: t("SongImportMissingTitleTitle"),
          message: t("SongImportMissingTitleMessage"),
          onConfirm: () => {
            setMessageBox(null);
            // Navigate to meta tab and focus the title input
            chordProEditorRef.current?.focusMetaTitle();
          },
          onCancel: () => setMessageBox(null),
        });
        return;
      }

      const completeSave = (groupWithSong?: Song) => {
        setEditedSong(song);

        // Add to database
        database.addSong(song);

        // If user chose to group with an existing song, create the group
        if (groupWithSong) {
          database.MakeGroup(song, groupWithSong);
        }

        // Notify parent
        if (onSongImported) {
          onSongImported(song);
        }

        // Reset wizard for next file
        if (importedFiles.length > 1) {
          // Remove current file from list
          const remainingFiles = importedFiles.filter((f) => f !== selectedFile);
          setImportedFiles(remainingFiles);

          if (remainingFiles.length > 0) {
            // Load next file
            setSelectedFile(remainingFiles[0]);
            setCurrentTab(0);
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      };

      // Check for similar songs in the database before saving
      const similarSongs = database.findSimilarSongs(song, true);
      if (similarSongs.length > 0) {
        // Show CompareDialog in Import mode so user can decide
        setCompareDialogState({
          song,
          similarSongs,
          onDecision: (decision) => {
            setCompareDialogState(null);
            if (decision.action === "import-and-group" && decision.groupWithSong) {
              completeSave(decision.groupWithSong);
            } else {
              // "import" — save as independent song
              completeSave();
            }
          },
        });
        return;
      }

      completeSave();
    } catch (error) {
      console.error("Import", "Failed to save song", error);
      setMessageBox({
        title: t("SongImportSaveErrorTitle"),
        message: format("SongImportSaveErrorMessage", error instanceof Error ? error.message : t("SongImportSaveErrorUnknown")),
        onConfirm: () => setMessageBox(null),
        onCancel: () => setMessageBox(null),
      });
    }
  }, [database, format, generatedChordPro, importedFiles, onClose, onSongImported, selectedFile, t]);

  // === Navigation ===

  const handlePrevious = useCallback(() => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  }, [currentTab]);

  const handleNext = useCallback(() => {
    switch (currentTab) {
      case 0:
        handleNextFromFileSelection();
        break;
      case 1:
        handleNextFromLineClassification();
        break;
      case 2:
        handleNextFromChordNormalization();
        break;
      case 3:
        handleSaveAndRestart();
        break;
    }
  }, [currentTab, handleNextFromFileSelection, handleNextFromLineClassification, handleNextFromChordNormalization, handleSaveAndRestart]);

  // === Render ===

  const renderTab0 = () => (
    <div className="wizard-tab file-selection-tab">
      <h2>{t("SongImportSelectInputFileTitle")}</h2>
      <div className="file-input-container">
        <input
          type="file"
          accept=".chp,.txt,.pdf,.docx,.htm,.html"
          onChange={handleFileUpload}
          className="file-input"
          aria-label={t("SongImportSelectFileAria")}
        />
        {selectedFile && (
          <div className="selected-file-info">
            <strong>{t("SongImportSelectedLabel")}</strong> {selectedFile.name}
          </div>
        )}
      </div>
      <div className="supported-formats">
        <p>
          <strong>{t("SongImportSupportedFormatsTitle")}</strong>
        </p>
        <ul>
          <li>{t("SongImportFormatChp")}</li>
          <li>{t("SongImportFormatTxt")}</li>
          <li>{t("SongImportFormatDocx")}</li>
          <li>{t("SongImportFormatPdf")}</li>
          <li>{t("SongImportFormatHtml")}</li>
        </ul>
      </div>
    </div>
  );

  const renderTab1 = () => {
    const handleBadgeMouseDown = (index: number, event: React.MouseEvent) => {
      isLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        handleLineTypeBadgeLongPress(index, event);
      }, 500); // 500ms for long press
    };

    const handleBadgeTouchStart = (index: number, event: React.TouchEvent) => {
      isLongPressRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        handleLineTypeBadgeLongPress(index, event);
      }, 500); // 500ms for long press
    };

    const handleBadgeMouseUp = (index: number) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!isLongPressRef.current) {
        handleLineTypeBadgeClick(index);
      }
    };

    const handleBadgeTouchEnd = (index: number) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!isLongPressRef.current) {
        handleLineTypeBadgeClick(index);
      }
    };

    return (
      <div className="wizard-tab line-classification-tab">
        <h2>{t("SongImportClassifyLinesTitle")}</h2>
        <div className="line-controls">
          <button onClick={handleSelectAll}>{t("SongImportSelectAll")}</button>
          <button onClick={handleSelectNone}>{t("SongImportSelectNone")}</button>
          <button onClick={handleSelectInvert}>{t("SongImportInvertSelection")}</button>
          <button onClick={handleLyricsOnly}>{t("SongImportLyricsOnly")}</button>
        </div>
        <div className="line-list">
          {Array.from({ length: allLines.count }, (_, i) => {
            const line = allLines.get(i);
            if (!line) return null;

            return (
              <div key={i} className={`line-item ${selectedLines.has(i) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={selectedLines.has(i)}
                  onChange={() => handleLineCheckToggle(i)}
                  aria-label={format("SongImportSelectLineAria", String(i + 1))}
                />
                <span
                  className={`line-type-badge ${line.line_type || "unset"}`}
                  onMouseDown={(e) => handleBadgeMouseDown(i, e)}
                  onMouseUp={() => handleBadgeMouseUp(i)}
                  onMouseLeave={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onTouchStart={(e) => handleBadgeTouchStart(i, e)}
                  onTouchEnd={() => handleBadgeTouchEnd(i)}
                  onTouchCancel={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title={t("SongImportLineTypeToggleTitle")}
                >
                  {getLineTypeLabel(line.line_type)}
                </span>
                <span className="line-text">{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTab2 = () => (
    <div className="wizard-tab chord-normalization-tab">
      <h2>{t("SongImportNormalizeChordsTitle")}</h2>
      <div className="chord-options">
        <label>
          <input type="checkbox" checked={useH} onChange={(e) => handleUseHChange(e.target.checked)} />
          {t("SongImportUseH")}
        </label>
        <label>
          <input type="checkbox" checked={lcMoll} onChange={(e) => handleLcMollChange(e.target.checked)} />
          {t("SongImportLowercaseMoll")}
        </label>
      </div>
      <div className="chord-list">
        <table>
          <thead>
            <tr>
              <th>{t("SongImportNormalizedHeader")}</th>
              <th>{t("SongImportOriginalHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {chordMap.getEntries().map(([original, normalized]) => (
              <tr key={original} className={selectedChord === original ? "selected" : ""}>
                <td>
                  <input
                    type="text"
                    value={normalized}
                    onChange={(e) => handleChordEdit(original, e.target.value)}
                    aria-label={format("SongImportNormalizedChordAria", original)}
                  />
                </td>
                <td>{original}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTab3 = () => (
    <div className="wizard-tab chordpro-editor-tab">
      <h2>{t("SongImportEditChordProTitle")}</h2>
      <div className="chordpro-editor-wrapper">
        <ChordProEditorComponent
          ref={chordProEditorRef}
          song={new Song(generatedChordPro)}
          onTextChange={handleChordProChange}
          initialEditMode={true}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="song-importer-backdrop" onClick={onClose}></div>
      <div className="song-importer-wizard">
        <div className="wizard-header">
          <h1>{t("SongImportWizardTitle")}</h1>
          <button onClick={onClose} className="close-button" aria-label={t("Close")}>
            ×
          </button>
        </div>

        <div className="wizard-tabs">
          <button className={currentTab === 0 ? "active" : ""} onClick={() => setCurrentTab(0)} disabled={currentTab < 0}>
            {t("SongImportTabFileSelection")}
          </button>
          <button className={currentTab === 1 ? "active" : ""} onClick={() => setCurrentTab(1)} disabled={currentTab < 1}>
            {t("SongImportTabLineClassification")}
          </button>
          <button className={currentTab === 2 ? "active" : ""} onClick={() => setCurrentTab(2)} disabled={currentTab < 2}>
            {t("SongImportTabChordNormalization")}
          </button>
          <button className={currentTab === 3 ? "active" : ""} onClick={() => setCurrentTab(3)} disabled={currentTab < 3}>
            {t("SongImportTabChordProEditor")}
          </button>
        </div>

        <div className="wizard-content">
          {currentTab === 0 && renderTab0()}
          {currentTab === 1 && renderTab1()}
          {currentTab === 2 && renderTab2()}
          {currentTab === 3 && renderTab3()}
        </div>

        <div className="wizard-footer">
          <button onClick={handlePrevious} disabled={currentTab === 0} className="prev-button">
            {t("SongImportPrevious")}
          </button>
          <button onClick={handleNext} className="next-button">
            {currentTab === 3 ? t("SongImportSaveClose") : t("SongImportNext")}
          </button>
        </div>

        {messageBox && (
          <MessageBox title={messageBox.title} message={messageBox.message} onConfirm={messageBox.onConfirm} onCancel={messageBox.onCancel} />
        )}

        {contextMenu && (
          <ContextMenu
            items={contextMenu.items}
            position={contextMenu.position}
            onSelect={contextMenu.onSelect}
            onClose={() => setContextMenu(null)}
          />
        )}

        {compareDialogState && (
          <Suspense
            fallback={
              <div className="loading-overlay">
                <div className="loading-spinner" />
              </div>
            }
          >
            <CompareDialog
              originalSong={compareDialogState.song}
              songsToCompare={compareDialogState.similarSongs}
              mode="Import"
              onClose={(_mergedSong, importDecision) => {
                if (importDecision) {
                  compareDialogState.onDecision(importDecision);
                } else {
                  // User closed dialog without choosing — cancel the save
                  setCompareDialogState(null);
                }
              }}
            />
          </Suspense>
        )}
      </div>
    </>
  );
};
