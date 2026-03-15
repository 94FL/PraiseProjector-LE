import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface UpdateInfo {
  version: string;
}

interface UpdateContextValue {
  updateAvailable: UpdateInfo | null;
  downloadProgress: number | null;
  updateDownloaded: UpdateInfo | null;
  checking: boolean;
  hasUpdate: boolean;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanupFns: (() => void)[] = [];

    if (api.onUpdateAvailable) {
      cleanupFns.push(
        api.onUpdateAvailable((info) => {
          setUpdateAvailable(info);
        })
      );
    }

    if (api.onUpdateDownloadProgress) {
      cleanupFns.push(
        api.onUpdateDownloadProgress((progress) => {
          setDownloadProgress(progress.percent);
        })
      );
    }

    if (api.onUpdateDownloaded) {
      cleanupFns.push(
        api.onUpdateDownloaded((info) => {
          setUpdateDownloaded(info);
          setDownloadProgress(null);
        })
      );
    }

    return () => cleanupFns.forEach((fn) => fn());
  }, []);

  const checkForUpdates = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.checkForUpdates) return;
    setChecking(true);
    try {
      await api.checkForUpdates();
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.downloadUpdate) return;
    setDownloadProgress(0);
    await api.downloadUpdate();
  }, []);

  const installUpdate = useCallback(() => {
    window.electronAPI?.installUpdate?.();
  }, []);

  const hasUpdate = updateAvailable !== null || updateDownloaded !== null;

  return (
    <UpdateContext.Provider
      value={{ updateAvailable, downloadProgress, updateDownloaded, checking, hasUpdate, checkForUpdates, downloadUpdate, installUpdate }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = (): UpdateContextValue => {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdate must be used within UpdateProvider");
  return ctx;
};
