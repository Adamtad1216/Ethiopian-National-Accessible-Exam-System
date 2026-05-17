export type UserRole = "admin" | "examiner" | "student";

export interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

export interface JwtPayload extends AuthUser {
  tokenType: "access" | "refresh";
}
