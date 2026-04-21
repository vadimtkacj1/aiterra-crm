import axios from "axios";
import type { Env } from "../config/Env";
import type { User, UserRole } from "../domain/User";
import { TranslatableError } from "../domain/errors";
import type { HttpClient } from "../infrastructure/HttpClient";
import type {
  AuthSession,
  CreateUserInput,
  IAuthService,
  LoginCredentials,
  UpdateUserInput,
} from "./interfaces/IAuthService";

interface LoginResponseDto {
  user: User;
  accessToken: string;
}

export class AuthService implements IAuthService {
  private session: AuthSession | null = null;

  constructor(
    private readonly env: Env,
    private readonly http: HttpClient,
  ) {
    this.restoreFromStorage();
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    this.requireApi();
    try {
      const dto = await this.http.post<LoginResponseDto>("/auth/login", {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });
      const user: User = {
        ...dto.user,
        id: String(dto.user.id),
        role: dto.user.role ?? "user",
      };
      const session: AuthSession = {
        user,
        accessToken: dto.accessToken,
      };
      this.persist(session);
      return session;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        throw new TranslatableError("errors.invalidCredentials");
      }
      throw e;
    }
  }

  logout(): void {
    this.session = null;
    localStorage.removeItem(this.env.authTokenKey);
    localStorage.removeItem(`${this.env.authTokenKey}_user`);
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    this.requireApi();
    try {
      await this.http.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        const raw = e.response.data as { detail?: unknown } | undefined;
        const d = typeof raw?.detail === "string" ? raw.detail : "";
        if (d === "invalid_current_password") {
          throw new TranslatableError("errors.invalidCurrentPassword");
        }
        if (d === "password_too_short") {
          throw new TranslatableError("errors.passwordTooShort");
        }
        if (d === "password_unchanged") {
          throw new TranslatableError("errors.passwordUnchanged");
        }
      }
      throw e;
    }
  }

  async listUsers(): Promise<User[]> {
    this.requireAdmin();
    this.requireApi();
    const raw = await this.http.get<unknown>("/admin/users");
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((row): User => {
      const r = row as Record<string, unknown>;
      const id = r.id != null ? String(r.id) : "";
      const email = typeof r.email === "string" ? r.email : "";
      const displayName =
        typeof r.displayName === "string"
          ? r.displayName
          : typeof r.display_name === "string"
            ? r.display_name
            : "";
      const role: UserRole = r.role === "admin" ? "admin" : "user";
      return { id, email, displayName, role };
    });
  }

  async createUser(input: CreateUserInput): Promise<User> {
    this.requireAdmin();
    this.requireApi();
    const body: Record<string, unknown> = {
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      role: input.role,
    };
    const mid = (input.metaCampaignId ?? "").trim();
    if (mid) {
      body.metaCampaignId = mid;
      body.metaCampaignName = input.metaCampaignName;
    }
    const gCid = (input.googleCustomerId ?? "").trim();
    const gDt = (input.googleDeveloperToken ?? "").trim();
    const gRt = (input.googleRefreshToken ?? "").trim();
    if (gCid && gDt && gRt) {
      body.googleCustomerId = gCid;
      body.googleDeveloperToken = gDt;
      body.googleRefreshToken = gRt;
      const gLid = (input.googleLoginCustomerId ?? "").trim();
      if (gLid) body.googleLoginCustomerId = gLid;
    }
    return this.http.post<User>("/admin/users", body);
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<User> {
    this.requireAdmin();
    this.requireApi();
    return this.http.put<User>(`/admin/users/${userId}`, input);
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    this.requireAdmin();
    this.requireApi();
    await this.http.put(`/admin/users/${userId}/password`, { password });
  }

  private requireApi(): void {
    if (!this.env.apiBaseUrl) {
      throw new TranslatableError("errors.apiNotConfigured");
    }
  }

  private requireAdmin(): void {
    const role = this.getSession()?.user.role;
    if (role !== "admin") {
      throw new TranslatableError("errors.forbidden");
    }
  }

  private persist(session: AuthSession): void {
    this.session = session;
    localStorage.setItem(this.env.authTokenKey, session.accessToken);
    localStorage.setItem(`${this.env.authTokenKey}_user`, JSON.stringify(session.user));
  }

  private restoreFromStorage(): void {
    const token = localStorage.getItem(this.env.authTokenKey);
    const raw = localStorage.getItem(`${this.env.authTokenKey}_user`);
    if (!token || !raw) return;
    try {
      // Check token expiry before restoring (JWT payload is base64-encoded JSON).
      const payloadB64 = token.split(".")[1];
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64)) as { exp?: number };
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token already expired — clear storage so user sees the login page.
          this.logout();
          return;
        }
      }

      const parsed = JSON.parse(raw) as Partial<User> & { id?: string; email?: string; displayName?: string };
      const role: UserRole = parsed.role === "admin" ? "admin" : "user";
      const user: User = {
        id: parsed.id ?? "",
        email: parsed.email ?? "",
        displayName: parsed.displayName ?? "",
        role,
      };
      this.session = { user, accessToken: token };
    } catch {
      this.logout();
    }
  }
}
