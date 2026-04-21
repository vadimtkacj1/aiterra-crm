export type UserId = string;

export type UserRole = "admin" | "user";

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  role: UserRole;
}
