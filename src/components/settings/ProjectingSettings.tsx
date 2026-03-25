import React from "react";
import { Settings } from "../../types";
import { useLocalization } from "../../localization/LocalizationContext";
import "./ProjectingSettings.css";

const MAX_MARGIN_SUM = 95;

type MarginSide = "top" | "left" | "right" | "bottom";

interface ProjectingSettingsProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const ProjectingSettings: React.FC<ProjectingSettingsProps> = ({ settings, updateSetting }) => {
  const { t } = useLocalization();
  const marginPreviewRef = React.useRef<HTMLDivElement | null>(null);
  const marginPreviewInnerRef = React.useRef<HTMLDivElement | null>(null);
  const [draggingMarginSide, setDraggingMarginSide] = React.useState<MarginSide | null>(null);
  const [draggingBox, setDraggingBox] = React.useState<{
    startX: number;
    startY: number;
    startLeft: number;
    startRightMargin: number;
    startTop: number;
    startBottomMargin: number;
  } | null>(null);

  const clampMarginValue = (value: number, oppositeValue: number) => {
    const normalizedValue = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(MAX_MARGIN_SUM - oppositeValue, Math.round(normalizedValue)));
  };

  const updateDisplayMargin = (side: MarginSide, nextValue: number) => {
    const currentRect = settings.displayBorderRect;

    switch (side) {
      case "top":
        updateSetting("displayBorderRect", {
          ...currentRect,
          top: clampMarginValue(nextValue, currentRect.height),
        });
        return;
      case "bottom":
        updateSetting("displayBorderRect", {
          ...currentRect,
          height: clampMarginValue(nextValue, currentRect.top),
        });
        return;
      case "left":
        updateSetting("displayBorderRect", {
          ...currentRect,
          left: clampMarginValue(nextValue, currentRect.width),
        });
        return;
      case "right":
        updateSetting("displayBorderRect", {
          ...currentRect,
          width: clampMarginValue(nextValue, currentRect.left),
        });
    }
  };

  const handleMarginInputChange = (side: MarginSide) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDisplayMargin(side, parseInt(e.target.value || "0", 10) || 0);
  };

  const startMarginDrag = (side: MarginSide) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingMarginSide(side);
  };

  const startBoxDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingBox({
      startX: e.clientX,
      startY: e.clientY,
      startLeft: settings.displayBorderRect.left,
      startRightMargin: settings.displayBorderRect.width,
      startTop: settings.displayBorderRect.top,
      startBottomMargin: settings.displayBorderRect.height,
    });
  };

  React.useEffect(() => {
    if (!draggingMarginSide) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const previewBounds = marginPreviewRef.current?.getBoundingClientRect();
      if (!previewBounds || !previewBounds.width || !previewBounds.height) {
        return;
      }

      switch (draggingMarginSide) {
        case "left":
          updateDisplayMargin("left", ((event.clientX - previewBounds.left) / previewBounds.width) * 100);
          return;
        case "right":
          updateDisplayMargin("right", ((previewBounds.right - event.clientX) / previewBounds.width) * 100);
          return;
        case "top":
          updateDisplayMargin("top", ((event.clientY - previewBounds.top) / previewBounds.height) * 100);
          return;
        case "bottom":
          updateDisplayMargin("bottom", ((previewBounds.bottom - event.clientY) / previewBounds.height) * 100);
      }
    };

    const handlePointerUp = () => {
      setDraggingMarginSide(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingMarginSide, settings.displayBorderRect]);

  React.useEffect(() => {
    if (!draggingBox) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const previewBounds = marginPreviewRef.current?.getBoundingClientRect();
      if (!previewBounds || !previewBounds.width || !previewBounds.height) {
        return;
      }

      const dx = ((event.clientX - draggingBox.startX) / previewBounds.width) * 100;
      const dy = ((event.clientY - draggingBox.startY) / previewBounds.height) * 100;

      // Clamp so neither margin goes below 0
      const clampedDx = Math.max(-draggingBox.startLeft, Math.min(draggingBox.startRightMargin, dx));
      const clampedDy = Math.max(-draggingBox.startTop, Math.min(draggingBox.startBottomMargin, dy));

      updateSetting("displayBorderRect", {
        left: Math.round(draggingBox.startLeft + clampedDx),
        width: Math.round(draggingBox.startRightMargin - clampedDx),
        top: Math.round(draggingBox.startTop + clampedDy),
        height: Math.round(draggingBox.startBottomMargin - clampedDy),
      });
    };

    const handlePointerUp = () => {
      setDraggingBox(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingBox, updateSetting]);

  React.useEffect(() => {
    if (!marginPreviewInnerRef.current) {
      return;
    }

    marginPreviewInnerRef.current.style.left = `${settings.displayBorderRect.left}%`;
    marginPreviewInnerRef.current.style.top = `${settings.displayBorderRect.top}%`;
    marginPreviewInnerRef.current.style.right = `${settings.displayBorderRect.width}%`;
    marginPreviewInnerRef.current.style.bottom = `${settings.displayBorderRect.height}%`;
  }, [settings.displayBorderRect]);

  return (
    <div className="container-fluid general-settings-root">
      <div className="row">
        <div className="col-md-6 general-settings-left-col">
          <div className="form-check mt-3 mt-md-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="enableExternalWebDisplay"
              checked={settings.externalWebDisplayEnabled}
              onChange={(e) => updateSetting("externalWebDisplayEnabled", e.target.checked)}
            />
            <label className="form-check-label" htmlFor="enableExternalWebDisplay">
              {t("SettingsExternalWebDisplay")}
            </label>
          </div>

          <div className="form-group mt-3 non-breaking-words-group">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="useNonBreakingWords"
                checked={settings.useNonSplittingWords}
                onChange={(e) => updateSetting("useNonSplittingWords", e.target.checked)}
              />
              <label className="form-check-label" htmlFor="useNonBreakingWords">
                {t("SettingsUseNonBreakingWords")}
              </label>
            </div>
            <textarea
              className="form-control"
              id="nonBreakingWordsList"
              placeholder={t("SettingsNonBreakingWordsPlaceholder")}
              value={settings.nonSplittingWordList.join("\n")}
              onChange={(e) => updateSetting("nonSplittingWordList", e.target.value.split("\n"))}
              disabled={!settings.useNonSplittingWords}
            ></textarea>
          </div>
        </div>

        <div className="col-md-6 general-settings-right-col">
          <div className="border p-2 margin-fieldset">
            <div className="margin-editor">
              <div className="margin-title">{t("SettingsMargins")}</div>
              <div className="margin-input-top margin-input">
                <label htmlFor="marginTop">{t("SettingsMarginTop")}</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="marginTop"
                  value={settings.displayBorderRect.top}
                  min={0}
                  max={MAX_MARGIN_SUM - settings.displayBorderRect.height}
                  onChange={handleMarginInputChange("top")}
                />
              </div>

              <div className="margin-input-left margin-input">
                <label htmlFor="marginLeft">{t("SettingsMarginLeft")}</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="marginLeft"
                  value={settings.displayBorderRect.left}
                  min={0}
                  max={MAX_MARGIN_SUM - settings.displayBorderRect.width}
                  onChange={handleMarginInputChange("left")}
                />
              </div>

              <div
                className={`margin-preview-box${draggingMarginSide || draggingBox ? " is-dragging" : ""}${draggingBox ? " is-moving" : ""}`}
                ref={marginPreviewRef}
              >
                <div className="margin-preview-inner" ref={marginPreviewInnerRef} onPointerDown={startBoxDrag}>
                  <div className="margin-drag-handle margin-drag-handle-top" onPointerDown={startMarginDrag("top")} />
                  <div className="margin-drag-handle margin-drag-handle-right" onPointerDown={startMarginDrag("right")} />
                  <div className="margin-drag-handle margin-drag-handle-bottom" onPointerDown={startMarginDrag("bottom")} />
                  <div className="margin-drag-handle margin-drag-handle-left" onPointerDown={startMarginDrag("left")} />
                  <span className="margin-preview-text">Hallelujah!</span>
                </div>
              </div>

              <div className="margin-input-right margin-input">
                <label htmlFor="marginRight">{t("SettingsMarginRight")}</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="marginRight"
                  value={settings.displayBorderRect.width}
                  min={0}
                  max={MAX_MARGIN_SUM - settings.displayBorderRect.left}
                  onChange={handleMarginInputChange("right")}
                />
              </div>

              <div className="margin-input-bottom margin-input">
                <label htmlFor="marginBottom">{t("SettingsMarginBottom")}</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  id="marginBottom"
                  value={settings.displayBorderRect.height}
                  min={0}
                  max={MAX_MARGIN_SUM - settings.displayBorderRect.top}
                  onChange={handleMarginInputChange("bottom")}
                />
              </div>
            </div>
            <div className="margin-preview-help text-muted">{t("SettingsMarginPreviewHelp")}</div>
          </div>
        </div>
        <div className="col-12">
          <div className="form-group mt-3 shadow-settings-group">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="displayTextShadowEnabled"
                checked={settings.displayTextShadowEnabled}
                onChange={(e) => updateSetting("displayTextShadowEnabled", e.target.checked)}
              />
              <label className="form-check-label" htmlFor="displayTextShadowEnabled">
                {t("SettingsTextShadowEnabled")}
              </label>
            </div>

            {settings.displayTextShadowEnabled && (
              <div className="shadow-controls mt-3 ps-4 border-start border-2 border-secondary">
                <div className="form-group">
                  <label htmlFor="displayTextShadowOffset">{t("SettingsTextShadowOffset")}</label>
                  <input
                    type="range"
                    className="form-range"
                    id="displayTextShadowOffset"
                    min={0}
                    max={20}
                    step={1}
                    value={settings.displayTextShadowOffset}
                    onChange={(e) => updateSetting("displayTextShadowOffset", parseInt(e.target.value, 10))}
                  />
                  <small className="text-muted d-block mt-1">
                    {t("SettingsTextShadowOffsetHelp")} ({settings.displayTextShadowOffset}px)
                  </small>
                </div>

                <div className="form-group mt-3">
                  <label htmlFor="displayTextShadowBlur">{t("SettingsTextShadowBlur")}</label>
                  <input
                    type="range"
                    className="form-range"
                    id="displayTextShadowBlur"
                    min={0}
                    max={20}
                    step={1}
                    value={settings.displayTextShadowBlur}
                    onChange={(e) => updateSetting("displayTextShadowBlur", parseInt(e.target.value, 10))}
                  />
                  <small className="text-muted d-block mt-1">
                    {t("SettingsTextShadowBlurHelp")} ({settings.displayTextShadowBlur}px)
                  </small>
                </div>

                <div className="form-group mt-3">
                  <label htmlFor="displayTextShadowColor">{t("SettingsTextShadowColor")}</label>
                  <input
                    type="color"
                    className="form-control form-control-color"
                    id="displayTextShadowColor"
                    value={settings.displayTextShadowColor}
                    onChange={(e) => updateSetting("displayTextShadowColor", e.target.value)}
                  />
                  <small className="text-muted d-block mt-1">{t("SettingsTextShadowColorHelp")}</small>
                </div>

                <div className="form-group mt-3">
                  <label htmlFor="displayTextShadowOpacity">{t("SettingsTextShadowOpacity")}</label>
                  <input
                    type="range"
                    className="form-range"
                    id="displayTextShadowOpacity"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(settings.displayTextShadowOpacity * 100)}
                    onChange={(e) => updateSetting("displayTextShadowOpacity", parseInt(e.target.value, 10) / 100)}
                  />
                  <small className="text-muted d-block mt-1">
                    {t("SettingsTextShadowOpacityHelp")} ({Math.round(settings.displayTextShadowOpacity * 100)}%)
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectingSettings;
