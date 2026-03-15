import React from "react";
import { useSettings } from "../hooks/useSettings";
import { getAssetPath } from "../utils/assetPath";

export enum IconType {
  // Toolbar icons
  SYNC = "sync",
  LOAD = "load",
  SAVE = "save",
  NEW = "new",
  IMPORT = "import",
  PRINT = "print",
  VIEWER = "viewer",
  SETTINGS = "settings",

  // Playlist icons
  MOVE_UP = "move_up",
  MOVE_DOWN = "move_down",
  TRANSPOSE_UP = "transpose_up",
  TRANSPOSE_DOWN = "transpose_down",
  CAPO_UP = "capo_up",
  CAPO_DOWN = "capo_down",
  REMOVE = "remove",
  EDIT = "edit",
  ADD = "add",

  // Preview panel icons
  BOLD = "bold",
  ITALIC = "italic",
  UNDERLINE = "underline",
  ALIGN_LEFT = "align_left",
  ALIGN_CENTER = "align_center",
  ALIGN_RIGHT = "align_right",
  DISPLAY = "display",
  BG_COLOR = "bg_color",
  TEXT = "text",
  IMAGE = "image",
  MESSAGE = "message",
  CONTENT_FORMAT = "content_format",
  INSTRUCTIONS = "instructions",
  FREEZE = "freeze",

  // Editor panel icons
  TITLE = "title",
  VERSE = "verse",
  CHORUS = "chorus",
  BRIDGE = "bridge",
  GRID = "grid",
  SHIFT_UP = "shift_up",
  SHIFT_DOWN = "shift_down",

  // Other icons
  USER = "user",
  LEADER = "leader",
  CLEAR = "clear",

  // Song tree icons
  FOLDER = "folder",
  MUSIC = "music",
  TEXT_ONLY = "text_only",
  ALERT = "alert",
  STARRED_MUSIC = "starred_music",
  STARRED_TEXT = "starred_text",
  HEART_EMPTY = "heart_empty",
  HEART_FILLED = "heart_filled",
  HEART_IGNORED = "heart_ignored",
  BIG_HEART_EMPTY = "big_heart_empty",
  BIG_HEART_FILLED = "big_heart_filled",
}

interface IconConfig {
  faIcon?: string;
  faContent?: React.ReactNode;
  faContentAlways?: boolean;
  imagePath: string;
  alt: string;
}

const iconMap: Record<IconType, IconConfig> = {
  // Toolbar
  [IconType.SYNC]: { faIcon: "fa fa-cloud", imagePath: "assets/cloud.png", alt: "Sync" },
  [IconType.LOAD]: {
    faIcon: "fa fa-folder-open",
    imagePath: "assets/load.png",
    alt: "Load",
  },
  [IconType.SAVE]: { faIcon: "fa fa-save", imagePath: "assets/save.png", alt: "Save" },
  [IconType.NEW]: { faIcon: "fa fa-plus", imagePath: "assets/add.png", alt: "New" },
  [IconType.IMPORT]: { faIcon: "fa fa-download", imagePath: "assets/import.png", alt: "Import" },
  [IconType.PRINT]: { faIcon: "fa fa-print", imagePath: "assets/print.png", alt: "Print" },
  [IconType.VIEWER]: { faIcon: "fa fa-tablet", imagePath: "assets/tablet.png", alt: "Viewer" },
  [IconType.SETTINGS]: {
    faIcon: "fa fa-cog",
    imagePath: "assets/settings.png",
    alt: "Settings",
  },

  // Playlist
  [IconType.MOVE_UP]: {
    faIcon: "fa fa-arrow-up",
    imagePath: "assets/arrow_up.png",
    alt: "Up",
  },
  [IconType.MOVE_DOWN]: {
    faIcon: "fa fa-arrow-down",
    imagePath: "assets/arrow_down.png",
    alt: "Down",
  },
  [IconType.TRANSPOSE_UP]: {
    faContent: (
      <svg className="pp-svg-icon" viewBox="0 0 40 40" fill="currentColor">
        <text x="1" y="25" fontSize="30" fontFamily="serif" fill="currentColor">
          ♪
        </text>
        <path d="M26 22 L26 8 M22 12 L26 8 L30 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    imagePath: "assets/shift_up.png",
    alt: "T+",
  },
  [IconType.TRANSPOSE_DOWN]: {
    faContent: (
      <svg className="pp-svg-icon" viewBox="0 0 40 40" fill="currentColor">
        <text x="1" y="25" fontSize="30" fontFamily="serif" fill="currentColor">
          ♪
        </text>
        <path d="M26 8 L26 22 M22 18 L26 22 L30 18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    imagePath: "assets/shift_down.png",
    alt: "T-",
  },
  [IconType.CAPO_UP]: {
    faContent: (
      <svg className="pp-svg-icon" viewBox="0 0 40 40" fill="currentColor">
        {/* F/K hybrid capo body */}
        <rect x="0" y="2" width="6" height="28" rx="2" />
        <rect x="4" y="2" width="16" height="5" rx="2" />
        <rect x="4" y="10" width="14" height="4" rx="2" />
        <path d="M10 14 L16 26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Up arrow, spaced right */}
        <path d="M28 26 L28 10 M24 14 L28 10 L32 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    imagePath: "assets/capo_up.png",
    alt: "C+",
  },
  [IconType.CAPO_DOWN]: {
    faContent: (
      <svg className="pp-svg-icon" viewBox="0 0 40 40" fill="currentColor">
        {/* F/K hybrid capo body */}
        <rect x="0" y="2" width="6" height="28" rx="2" />
        <rect x="4" y="2" width="16" height="5" rx="2" />
        <rect x="4" y="10" width="14" height="4" rx="2" />
        <path d="M10 14 L16 26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Down arrow, spaced right */}
        <path d="M28 10 L28 26 M24 22 L28 26 L32 22" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    imagePath: "assets/capo_down.png",
    alt: "C-",
  },
  [IconType.REMOVE]: {
    faIcon: "fa fa-minus",
    imagePath: "assets/delete.png",
    alt: "Remove",
  },
  [IconType.EDIT]: { faIcon: "fa fa-pencil", imagePath: "assets/modify.png", alt: "Edit" },
  [IconType.ADD]: { faIcon: "fa fa-plus", imagePath: "assets/add.png", alt: "Add" },

  // Preview panel
  [IconType.BOLD]: {
    faIcon: "fa fa-bold",
    imagePath: "assets/bold.png",
    alt: "Bold",
  },
  [IconType.ITALIC]: {
    faIcon: "fa fa-italic",
    imagePath: "assets/italic.png",
    alt: "Italic",
  },
  [IconType.UNDERLINE]: {
    faIcon: "fa fa-underline",
    imagePath: "assets/underline.png",
    alt: "Underline",
  },
  [IconType.ALIGN_LEFT]: {
    faIcon: "fa fa-align-left",
    imagePath: "assets/align_left.png",
    alt: "Align Left",
  },
  [IconType.ALIGN_CENTER]: {
    faIcon: "fa fa-align-center",
    imagePath: "assets/align_center.png",
    alt: "Align Center",
  },
  [IconType.ALIGN_RIGHT]: {
    faIcon: "fa fa-align-right",
    imagePath: "assets/align_right.png",
    alt: "Align Right",
  },
  [IconType.DISPLAY]: {
    faIcon: "fa fa-desktop",
    imagePath: "assets/projector-icon.png",
    alt: "Display",
  },
  [IconType.BG_COLOR]: {
    faIcon: "fa fa-paint-brush",
    imagePath: "assets/bgcolor.png",
    alt: "BG Color",
  },
  [IconType.TEXT]: {
    faIcon: "fa fa-font",
    imagePath: "assets/text.png",
    alt: "Text",
  },
  [IconType.IMAGE]: { faIcon: "fa fa-image", imagePath: "assets/image.png", alt: "Image" },
  [IconType.MESSAGE]: {
    faIcon: "fa fa-comment",
    imagePath: "assets/message.png",
    alt: "Message",
  },
  [IconType.CONTENT_FORMAT]: {
    faIcon: "fa fa-align-left",
    imagePath: "assets/content_format.png",
    alt: "Content Format",
  },
  [IconType.INSTRUCTIONS]: {
    faIcon: "fa fa-info-circle",
    imagePath: "assets/instructions.png",
    alt: "Instructions",
  },
  [IconType.FREEZE]: {
    faIcon: "fa fa-snowflake-o",
    imagePath: "assets/snowflake.png",
    alt: "Freeze",
  },

  // Editor panel
  [IconType.TITLE]: { faContent: "Title", imagePath: "assets/title.png", alt: "Title" },
  [IconType.VERSE]: {
    faIcon: "fa fa-user",
    imagePath: "assets/conductor.png",
    alt: "Verse",
  },
  [IconType.CHORUS]: {
    faIcon: "fa fa-users",
    imagePath: "assets/chorus.png",
    alt: "Chorus",
  },
  [IconType.BRIDGE]: {
    faIcon: "fa fa-music",
    imagePath: "assets/bridge.png",
    alt: "Bridge",
  },
  [IconType.GRID]: {
    faContent: (
      <svg
        className="pp-svg-icon pp-svg-icon-dense"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Note dot */}
        <circle cx="4" cy="22" r="3" fill="currentColor" stroke="none" />
        {/* Stem line */}
        <path d="M7 22 H16" />
        {/* Chord box */}
        <rect x="16" y="16" width="10" height="10" rx="2" />
        {/* Dots above chord box */}
        <circle cx="19" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="22" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="25" cy="13" r="1.5" fill="currentColor" stroke="none" />
        {/* Bell connector */}
        <rect x="26" y="20.5" width="6" height="1" rx="2" />
        {/* Bell flare */}
        <path d="M32 21 L40 14 L40 28 L32 21 Z" fill="currentColor" stroke="none" />
      </svg>
    ),
    imagePath: "assets/trumpet.png",
    alt: "Grid",
  },
  [IconType.SHIFT_UP]: { faIcon: "fa fa-arrow-up", imagePath: "assets/shift_up.png", alt: "Up" },
  [IconType.SHIFT_DOWN]: {
    faIcon: "fa fa-arrow-down",
    imagePath: "assets/shift_down.png",
    alt: "Down",
  },

  // Other
  [IconType.USER]: { faIcon: "fa fa-user", imagePath: "assets/user.png", alt: "User" },
  [IconType.LEADER]: { faIcon: "fa fa-user-circle", imagePath: "assets/leader.png", alt: "Leader" },
  [IconType.CLEAR]: { faIcon: "fa fa-times", imagePath: "assets/clear.png", alt: "Clear" },

  // Song tree
  [IconType.FOLDER]: { faIcon: "fa fa-folder", imagePath: "assets/folder.png", alt: "Folder" },
  [IconType.MUSIC]: { faIcon: "fa fa-music", imagePath: "assets/music.png", alt: "Music" },
  [IconType.TEXT_ONLY]: {
    faIcon: "fa fa-file-text-o",
    imagePath: "assets/text.png",
    alt: "Text",
  },
  [IconType.ALERT]: {
    faIcon: "fa fa-exclamation-triangle",
    imagePath: "assets/alert.png",
    alt: "Alert",
  },
  [IconType.STARRED_MUSIC]: {
    faIcon: "fa fa-star",
    imagePath: "assets/starred_music.png",
    alt: "Starred Music",
  },
  [IconType.STARRED_TEXT]: {
    faIcon: "fa fa-star",
    imagePath: "assets/starred_text.png",
    alt: "Starred Text",
  },
  [IconType.HEART_EMPTY]: {
    faIcon: "fa fa-heart-o",
    faContent: (
      <svg className="pp-svg-icon pp-svg-icon-sm" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path
          d="M8 14s-5.5-3.5-6.5-7C.5 3.5 3 1 5.5 1.5 7 1.8 8 3 8 3s1-1.2 2.5-1.5C13 1 15.5 3.5 14.5 7 13.5 10.5 8 14 8 14z"
          strokeLinejoin="round"
        />
      </svg>
    ),
    faContentAlways: true,
    imagePath: "assets/heart_empty.png",
    alt: "Not Preferred",
  },
  [IconType.HEART_FILLED]: {
    faIcon: "fa fa-heart",
    faContent: (
      <svg className="pp-svg-icon pp-svg-icon-sm" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 14s-5.5-3.5-6.5-7C.5 3.5 3 1 5.5 1.5 7 1.8 8 3 8 3s1-1.2 2.5-1.5C13 1 15.5 3.5 14.5 7 13.5 10.5 8 14 8 14z" />
      </svg>
    ),
    faContentAlways: true,
    imagePath: "assets/heart_filled.png",
    alt: "Preferred",
  },
  [IconType.HEART_IGNORED]: {
    faIcon: "fa fa-times",
    faContent: "\u2716",
    faContentAlways: true,
    imagePath: "assets/heart_empty.png",
    alt: "Ignored",
  },
  [IconType.BIG_HEART_EMPTY]: {
    faIcon: "fa fa-heart-o",
    imagePath: "assets/heart_empty.png",
    alt: "Not Preferred",
  },
  [IconType.BIG_HEART_FILLED]: {
    faIcon: "fa fa-heart",
    imagePath: "assets/heart_filled.png",
    alt: "Preferred",
  },
};

export class IconService {
  /**
   * Get icon content based on the icon type and settings
   * @param iconType The type of icon to render
   * @param useFontAwesome Whether to use Font Awesome icons (true) or PNG images (false)
   * @returns JSX element containing the appropriate icon
   */
  static getIcon(iconType: IconType, useFontAwesome: boolean): React.ReactNode {
    const config = iconMap[iconType];

    if (!config) {
      console.warn("General", `Icon config not found for type: ${iconType}`);
      return null;
    }

    if (useFontAwesome || config.faContentAlways) {
      if (config.faContent) {
        return config.faContent;
      }
      if (config.faIcon) {
        return <i className={config.faIcon}></i>;
      }
    }

    // Return PNG image with proper base path
    const className = iconType === IconType.TITLE ? "button-icon title-button-icon" : "button-icon";
    return <img src={getAssetPath(config.imagePath)} alt={config.alt} className={className} />;
  }
}

// React component that uses settings internally
export const Icon: React.FC<{ type: IconType }> = ({ type }) => {
  const { settings } = useSettings();
  const useFontAwesome = settings?.useFontAwesomeIcons ?? false;
  return IconService.getIcon(type, useFontAwesome);
};
