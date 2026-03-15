import React, { useState, useContext, ReactNode, useCallback } from "react";
import { SessionResponse } from "../../common/pp-types";
import { cloudApi } from "../services/cloudApi";
import { Database } from "../classes/Database";

type AuthStatus = "guest" | "authenticated" | "offline";

interface AuthContextType {
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isGuest: boolean;
  username: string | null;
  user: SessionResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changeUser: () => Promise<string | null>;
  loadInitialCredentials: () => Promise<void>;
  updateToken: (newToken: string) => void;
  markSessionExpired: () => void;
  onLoginSuccess?: (leaderId?: string) => void;
  setOnLoginSuccess: (callback: (leaderId?: string) => void) => void;
}

// Use a module-level variable to preserve context across HMR reloads
// This prevents "useAuth must be used within an AuthProvider" errors during development
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);
AuthContext.displayName = "AuthContext";

const shouldUseBearerHeader = typeof window !== "undefined" && !!window.electronAPI;

async function getDeviceClientId(): Promise<string> {
  const key = "pp-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    const randomPart = Math.random().toString(36).slice(2);
    const hostname = (await window.electronAPI?.getHostname?.().catch(() => undefined)) ?? navigator.userAgent.slice(0, 20);
    id = hostname + ":" + randomPart;
    localStorage.setItem(key, id);
  }
  return id;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("guest");
  const [isLoading, setIsLoading] = useState(true);
  const [onLoginSuccess, setOnLoginSuccessCallback] = useState<((leaderId?: string) => void) | undefined>();

  const setOnLoginSuccess = useCallback((callback: (leaderId?: string) => void) => {
    setOnLoginSuccessCallback(() => callback);
  }, []);

  const verifySession = async (username: string, authToken?: string | null): Promise<SessionResponse | null> => {
    try {
      cloudApi.setToken(authToken ?? null);
      const response = await cloudApi.fetchSession(await getDeviceClientId());
      if (response.login === username) {
        return response;
      }
      return null;
    } catch (error) {
      console.error("Auth", "Session verification failed", error);
      return null;
    }
  };

  const loadInitialCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      // In Electron, resolve the cloud API base URL from the main process (proxy-config.json)
      // before any API calls. Without this, the renderer falls back to window.location.origin
      // which is file:// in production builds, causing proxy validation to fail.
      if (window.electronAPI?.getCloudApiHost) {
        const host = await window.electronAPI.getCloudApiHost();
        if (host) {
          cloudApi.setBaseUrl(host);
        }
      }

      const storedUsername = localStorage.getItem("auth_username")?.trim() || "";
      const storedToken = localStorage.getItem("auth_token")?.trim() || "";

      if (storedUsername) {
        setUsername(storedUsername);
        await Database.switchUser(storedUsername);
      } else {
        setUsername(null);
        setUser(null);
        setToken(null);
        cloudApi.setToken(null);
        setAuthStatus("guest");
        if (Database.getCurrentUsername() !== "") {
          await Database.switchUser("");
        }
        return;
      }

      // Prefer secure cookie-based session first.
      let session = await verifySession(storedUsername, null);
      if (!session && storedToken) {
        // Backward-compatible fallback for older deployments.
        session = await verifySession(storedUsername, storedToken);
      }

      if (session) {
        setUser(session);
        setToken(session.token);
        cloudApi.setToken(shouldUseBearerHeader ? session.token : null);
        setAuthStatus("authenticated");
        localStorage.removeItem("auth_token");
        return;
      }

      localStorage.removeItem("auth_token");
      setUser(null);
      setToken(null);
      cloudApi.setToken(null);
      setAuthStatus("offline");
    } catch (error) {
      console.error("Auth", "Failed to load initial credentials", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const authToken = password ? `Basic ${btoa(`${username}:${password}`)}` : null;
      if (!authToken) {
        setIsLoading(false);
        return false;
      }
      const session = await verifySession(username, authToken);
      if (session && session.token) {
        setUser(session);
        setToken(session.token);
        setUsername(username);
        setAuthStatus("authenticated");
        localStorage.setItem("auth_username", username);
        localStorage.removeItem("auth_token");
        cloudApi.setToken(shouldUseBearerHeader ? session.token : null);

        await Database.switchUser(username);

        if (onLoginSuccess) {
          onLoginSuccess(session.leaderId);
        }

        setIsLoading(false);
        return true;
      }
      setAuthStatus(username ? "offline" : "guest");
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Auth", "Login failed", error);
      setAuthStatus(username ? "offline" : "guest");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await cloudApi.logoutSession(await getDeviceClientId());
      }
    } catch (error) {
      console.error("Auth", "Logout API call failed", error);
    } finally {
      setUser(null);
      setToken(null);
      setUsername(null);
      setAuthStatus("guest");
      cloudApi.setToken(null);
      localStorage.removeItem("auth_username");
      localStorage.removeItem("auth_token");

      await Database.switchUser("");

      setIsLoading(false);
    }
  };

  const updateToken = useCallback(
    (newToken: string) => {
      if (newToken) {
        setToken(newToken);
        if (!username) {
          const storedUsername = localStorage.getItem("auth_username")?.trim() || "";
          if (storedUsername) {
            setUsername(storedUsername);
          }
        }
        setAuthStatus("authenticated");
        cloudApi.setToken(shouldUseBearerHeader ? newToken : null);
        localStorage.removeItem("auth_token");
      }
    },
    [username]
  );

  const markSessionExpired = useCallback(() => {
    setUser(null);
    setToken(null);
    cloudApi.setToken(null);
    localStorage.removeItem("auth_token");
    setAuthStatus(username ? "offline" : "guest");
  }, [username]);

  const changeUser = async (): Promise<string | null> => {
    await logout();
    return null;
  };

  const value = {
    authStatus,
    isAuthenticated: authStatus === "authenticated",
    isGuest: authStatus === "guest",
    username,
    user,
    token,
    isLoading,
    login,
    logout,
    changeUser,
    loadInitialCredentials,
    updateToken,
    markSessionExpired,
    onLoginSuccess,
    setOnLoginSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, the context might temporarily be undefined
    // Provide a fallback that doesn't break the app during hot reload
    if (import.meta.hot) {
      console.warn("Auth", "useAuth called outside of AuthProvider - this may be a HMR issue, retrying...");
      return {
        authStatus: "guest",
        isAuthenticated: false,
        isGuest: true,
        username: null,
        user: null,
        token: null,
        isLoading: true,
        login: async () => false,
        logout: async () => {},
        changeUser: async () => null,
        loadInitialCredentials: async () => {},
        updateToken: () => {},
        markSessionExpired: () => {},
        onLoginSuccess: undefined,
        setOnLoginSuccess: () => {},
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
