import { PanelResizeHandle } from "react-resizable-panels";
import "./ResizeHandle.css";

export default function ResizeHandle({ className = "", id }: { className?: string; id?: string }) {
  return (
    <PanelResizeHandle className={["resize-handle-outer", className].join(" ")} id={id ?? null}>
      <div className={"resize-handle-inner"} />
    </PanelResizeHandle>
  );
}
