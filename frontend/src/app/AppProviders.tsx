import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Env } from "../config/Env";
import type { User } from "../domain/User";
import type { AuthSession, CreateUserInput, LoginCredentials, UpdateUserInput } from "../services/interfaces/IAuthService";
import type { AppServices } from "../services/AppServices";
import { createAppServices } from "../services/createAppServices";

interface AppContextValue {
  services: AppServices;
  session: AuthSession | null;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  /** Cached user list — fetched once when an admin session is active. */
  users: User[];
  usersLoading: boolean;
  /** Force a refresh of the cached user list (e.g. after create/update). */
  refreshUsers: () => Promise<void>;
  /** @deprecated Use `users` + `refreshUsers` instead. */
  listUsers: () => Promise<User[]>;
  createUser: (input: CreateUserInput) => Promise<User>;
  updateUser: (userId: string, input: UpdateUserInput) => Promise<User>;
  resetPassword: (userId: string, password: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const services = useMemo(() => createAppServices(new Env()), []);
  const [session, setSession] = useState<AuthSession | null>(() => services.auth.getSession());
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const fetchingRef = useRef(false);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const next = await services.auth.login(credentials);
      setSession(next);
    },
    [services],
  );

  const logout = useCallback(() => {
    services.auth.logout();
    setSession(null);
    setUsers([]);
  }, [services]);

  const refreshUsers = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setUsersLoading(true);
    try {
      const rows = await services.auth.listUsers();
      setUsers(rows);
    } catch {
      // caller can show its own error; don't swallow silently in production
    } finally {
      setUsersLoading(false);
      fetchingRef.current = false;
    }
  }, [services]);

  const isAdmin = session?.user.role === "admin";

  // Load user list once when an admin logs in.
  useEffect(() => {
    if (isAdmin) {
      void refreshUsers();
    }
  }, [isAdmin, refreshUsers]);

  const listUsers = useCallback(() => services.auth.listUsers(), [services]);

  const createUser = useCallback(
    async (input: CreateUserInput) => {
      const user = await services.auth.createUser(input);
      await refreshUsers();
      return user;
    },
    [services, refreshUsers],
  );

  const updateUser = useCallback(
    async (userId: string, input: UpdateUserInput) => {
      const user = await services.auth.updateUser(userId, input);
      await refreshUsers();
      return user;
    },
    [services, refreshUsers],
  );

  const resetPassword = useCallback(
    async (userId: string, password: string) => services.auth.resetPassword(userId, password),
    [services],
  );

  const value = useMemo(
    () => ({
      services,
      session,
      isAdmin,
      login,
      logout,
      users,
      usersLoading,
      refreshUsers,
      listUsers,
      createUser,
      updateUser,
      resetPassword,
    }),
    [services, session, isAdmin, login, logout, users, usersLoading, refreshUsers, listUsers, createUser, updateUser, resetPassword],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProviders");
  }
  return ctx;
}
