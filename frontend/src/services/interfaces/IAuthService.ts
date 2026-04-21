import type { User, UserRole } from "../../domain/User";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  /** Meta campaign id from Marketing API (one campaign → one business). Omit if this client has no Meta. */
  metaCampaignId?: string;
  metaCampaignName?: string;
  /** Google Ads credentials — all three required together, omit if no Google Ads. */
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleLoginCustomerId?: string;
}

export interface UpdateUserInput {
  displayName: string;
  role: UserRole;
}

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
  /** Authenticated user changes their own password (current password required). */
  changeOwnPassword(currentPassword: string, newPassword: string): Promise<void>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(userId: string, input: UpdateUserInput): Promise<User>;
  resetPassword(userId: string, password: string): Promise<void>;
}
