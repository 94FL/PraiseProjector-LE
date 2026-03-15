import React, { useEffect, useRef } from "react";
import "./ContextMenu.css";

export interface ContextMenuItem {
  label: string;
  value: string;
  iconClass?: string;
  disabled?: boolean;
  /** Optional custom React content that replaces the default icon+label rendering */
  customContent?: React.ReactNode;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onSelect, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    onSelect(item.value);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item, index) => (
        <div key={index} className={`context-menu-item ${item.disabled ? "disabled" : ""}`} onClick={() => handleItemClick(item)}>
          {item.customContent ? (
            item.customContent
          ) : (
            <>
              {item.iconClass && <i className={`context-menu-icon ${item.iconClass}`} aria-hidden="true"></i>}
              {item.label}
            </>
          )}
        </div>
      ))}
    </div>
  );
};
