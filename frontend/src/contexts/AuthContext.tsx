import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { User, LoginCredentials, UserPreferences } from "@/types";
import {
  clearTokens,
  getAccessToken,
  getCurrentUserApi,
  getSystemSettingsApi,
  loginApi,
  registerStudentApi,
  setTokens,
} from "@/features/auth/services/authService";
import { ttsService } from "@/services/tts";
import {
  applySystemDefaultsToPreferences,
  defaultSystemSettings,
} from "@/lib/systemSettings";

interface AuthActionResult {
  success: boolean;
  error?: string;
  role?: User["role"];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials,
  ) => Promise<AuthActionResult>;
  registerStudent: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    accountNumber?: string;
  }) => Promise<AuthActionResult>;
  logout: () => void;
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
  theme: "light",
  language: "en",
  tts: {
    enabled: true,
    language: "en",
    speed: 1.0,
    voice: "default",
    autoRead: true,
  },
  highContrast: false,
  fontSize: "normal",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const portalMode = import.meta.env.VITE_PORTAL_MODE as
    | "student"
    | "staff"
    | undefined;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = getAccessToken();
      let me: User | null = null;
      if (accessToken) {
        try {
          me = await getCurrentUserApi();
          setUser(me);
        } catch {
          clearTokens();
        }
      }

      let nextPreferences: UserPreferences = defaultPreferences;
      const prefs = localStorage.getItem("enaes_preferences");
      if (prefs) {
        try {
          nextPreferences = JSON.parse(prefs) as UserPreferences;
        } catch {
          /* ignore */
        }
      }

      const shouldUseSystemDefaults =
        me?.role === "student" || portalMode === "student";
      if (shouldUseSystemDefaults) {
        try {
          const settings = await getSystemSettingsApi();
          nextPreferences = applySystemDefaultsToPreferences(
            nextPreferences,
            settings,
          );
        } catch {
          nextPreferences = applySystemDefaultsToPreferences(
            nextPreferences,
            defaultSystemSettings,
          );
        }
      }

      setPreferences(nextPreferences);
      localStorage.setItem("enaes_preferences", JSON.stringify(nextPreferences));
      setIsLoading(false);
    };

    void bootstrap();
  }, [portalMode]);

  useEffect(() => {
    const shouldUseSystemDefaults =
      user?.role === "student" || portalMode === "student";
    if (!shouldUseSystemDefaults) return;

    let disposed = false;
    const syncFromBackend = async () => {
      try {
        const settings = await getSystemSettingsApi();
        if (disposed) return;
        setPreferences((prev) => {
          const next = applySystemDefaultsToPreferences(prev, settings);
          localStorage.setItem("enaes_preferences", JSON.stringify(next));
          return next;
        });
      } catch {
        // Keep current preferences if refresh fails.
      }
    };

    void syncFromBackend();
    const interval = window.setInterval(() => {
      void syncFromBackend();
    }, 10000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [portalMode, user?.role]);

  useEffect(() => {
    if (preferences.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [preferences.theme]);

  useEffect(() => {
    ttsService.updateSettings(preferences.tts);
    if (!preferences.tts.enabled) {
      ttsService.stop();
    }
  }, [preferences.tts]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await loginApi(credentials.email, credentials.password);
      setTokens(response.accessToken, response.refreshToken);
      const me = await getCurrentUserApi();
      setUser(me);
      return { success: true, role: response.user.role };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Invalid email or password",
      };
    }
  }, []);

  const registerStudent = useCallback(
    async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      accountNumber?: string;
    }) => {
      try {
        const response = await registerStudentApi(payload);
        setTokens(response.accessToken, response.refreshToken);
        const me = await getCurrentUserApi();
        setUser(me);
        return { success: true, role: response.user.role };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create student account",
        };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    clearTokens();
    sessionStorage.removeItem("enaes_manually_muted");
  }, []);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        ...prefs,
        tts: {
          ...prev.tts,
          ...(prefs.tts ?? {}),
        },
      };
      localStorage.setItem("enaes_preferences", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerStudent,
        logout,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
