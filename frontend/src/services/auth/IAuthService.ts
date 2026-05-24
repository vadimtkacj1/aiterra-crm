import type { User, UserRole } from "@/domain/User";

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
  phone?: string | null;
  metaCampaignId?: string;
  metaCampaignName?: string;
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleLoginCustomerId?: string;
  withSite?: boolean;
  siteUrl?: string;
}

export interface UpdateUserInput {
  displayName: string;
  role: UserRole;
}

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  logout(): void;
  getSession(): AuthSession | null;
  changeOwnPassword(currentPassword: string, newPassword: string): Promise<void>;
  listUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(userId: string, input: UpdateUserInput): Promise<User>;
  resetPassword(userId: string, password: string): Promise<void>;
}
