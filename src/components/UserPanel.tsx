import React, { useState, useEffect, useRef } from "react";
import { Icon, IconType } from "../services/IconService";
import { useLeader } from "../contexts/LeaderContext";
import { useAuth } from "../contexts/AuthContext";
import { useMessageBox } from "../contexts/MessageBoxContext";
import { useLocalization } from "../localization/LocalizationContext";
import { useTooltips } from "../localization/TooltipContext";
import AuthDialog from "./AuthDialog";

interface UserPanelProps {
  onOpenLeaderSettings?: (leaderId: string | null) => void;
  onSyncClick?: () => void;
  onExportDatabase?: () => void;
  onImportDatabase?: () => void;
  onReplaceDatabase?: () => void;
  onSettingsClick?: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({
  onOpenLeaderSettings,
  onSyncClick,
  onExportDatabase,
  onImportDatabase,
  onReplaceDatabase,
  onSettingsClick,
}) => {
  const { selectedLeader, setSelectedLeaderId, allLeaders } = useLeader();
  const { isGuest, username, user, logout, login, setOnLoginSuccess } = useAuth();
  const { showMessage } = useMessageBox();
  const { t } = useLocalization();
  const { tt } = useTooltips();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const syncMenuRef = useRef<HTMLDivElement>(null);
  const pendingSyncAfterLoginRef = useRef(false);

  // Register callback for auto-selecting leader after login
  useEffect(() => {
    setOnLoginSuccess((leaderId?: string) => {
      if (leaderId) {
        setSelectedLeaderId(leaderId);
      }
    });
  }, [setOnLoginSuccess, setSelectedLeaderId]);

  // Close sync menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(event.target as Node)) {
        setShowSyncMenu(false);
      }
    };

    if (showSyncMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSyncMenu]);

  // Allow other parts of the app to request the login dialog
  useEffect(() => {
    const handleOpenAuthDialog = () => {
      pendingSyncAfterLoginRef.current = true;
      setShowAuthDialog(true);
    };

    window.addEventListener("pp-open-auth-dialog", handleOpenAuthDialog);
    return () => window.removeEventListener("pp-open-auth-dialog", handleOpenAuthDialog);
  }, []);

  // Handle leader selection change (matching C# cmbLeader.SelectedIndexChanged)
  const handleLeaderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const leaderId = event.target.value || null;
    setSelectedLeaderId(leaderId);
  };

  const handleUserButtonClick = () => {
    setShowAuthDialog(true);
  };

  const handleAuthConfirm = async (username: string, password: string, token: string) => {
    // If token is provided, use it; otherwise use password for authentication
    const success = await login(username, token || password);
    if (success) {
      setShowAuthDialog(false);
      if (pendingSyncAfterLoginRef.current) {
        pendingSyncAfterLoginRef.current = false;
        onSyncClick?.();
      }
    } else {
      showMessage(t("LoginFailed"), t("LoginFailedCheckCredentials"));
    }
  };

  const handleLogout = async () => {
    await logout();
    pendingSyncAfterLoginRef.current = false;
    setShowAuthDialog(false);
  };

  const handleLeaderSettingsClick = () => {
    onOpenLeaderSettings?.(selectedLeader?.id || null);
  };

  const showSyncControls = !!(onSyncClick || onExportDatabase || onImportDatabase || onReplaceDatabase);

  return (
    <div>
      <div className="form-group d-flex align-items-center mb-1">
        <button className="btn btn-light mr-2 sidebar-icon-btn" aria-label="User" onClick={handleUserButtonClick}>
          <Icon type={IconType.USER} />
        </button>
        <div className="user-login-input-wrapper mr-2">
          <input
            type="text"
            readOnly
            className="form-control user-login-input"
            value={isGuest ? t("Guest") : user?.login || username || "Authenticated"}
            aria-label="User Name"
            onClick={handleUserButtonClick}
            style={{ cursor: "pointer" }}
          />
        </div>
        {showSyncControls && (
          <div className="btn-group position-relative user-sync-group mr-2" ref={syncMenuRef}>
            <button className="btn btn-light user-sync-main-btn" aria-label="Sync" title={tt("toolbar_sync")} onClick={onSyncClick}>
              <Icon type={IconType.SYNC} />
            </button>
            <button
              className="btn btn-light dropdown-toggle-split sync-menu-toggle"
              aria-label="Sync Menu"
              title={t("SyncMenu")}
              onClick={() => setShowSyncMenu(!showSyncMenu)}
            >
              <span className="sync-menu-indicator">▾</span>
            </button>
            {showSyncMenu && (
              <div className="dropdown-menu show sync-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowSyncMenu(false);
                    onSyncClick?.();
                  }}
                >
                  {t("MenuSyncDatabase")}
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowSyncMenu(false);
                    onExportDatabase?.();
                  }}
                >
                  {t("MenuExportDatabase")}
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowSyncMenu(false);
                    onImportDatabase?.();
                  }}
                >
                  {t("MenuImportDatabase")}
                </button>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item text-danger"
                  onClick={() => {
                    setShowSyncMenu(false);
                    onReplaceDatabase?.();
                  }}
                >
                  {t("MenuReplaceDatabase")}
                </button>
              </div>
            )}
          </div>
        )}
        {onSettingsClick && (
          <button
            className="btn btn-light user-sync-main-btn user-sync-height-btn"
            aria-label="Settings"
            title={tt("toolbar_settings")}
            onClick={onSettingsClick}
          >
            <Icon type={IconType.SETTINGS} />
          </button>
        )}
      </div>
      <div className="form-group d-flex align-items-center mb-1">
        <button className="btn btn-light mr-2 sidebar-icon-btn" aria-label="Leader" onClick={handleLeaderSettingsClick}>
          <Icon type={IconType.LEADER} />
        </button>
        <div className="flex-grow-1 user-leader-select-wrapper">
          <select
            className="form-control"
            aria-label="Leader Selection"
            value={selectedLeader?.id || ""}
            onChange={handleLeaderChange}
            disabled={allLeaders.length === 0}
          >
            <option value=""></option>
            {[...allLeaders]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      {showAuthDialog && (
        <AuthDialog
          onConfirm={handleAuthConfirm}
          onCancel={() => {
            pendingSyncAfterLoginRef.current = false;
            setShowAuthDialog(false);
          }}
          showOffline={true}
          onLogout={handleLogout}
          initialUsername={user?.login}
        />
      )}
    </div>
  );
};

export default UserPanel;
