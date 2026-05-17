import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import type { JwtPayload } from "../../../common/types.js";
import { UserModel } from "../../users/schemas/user.schema.js";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: "admin" | "examiner" | "student";
    mustChangePassword: boolean;
  };
}

interface RegisterStudentInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  accountNumber?: string;
}

function signAccess(payload: Omit<JwtPayload, "tokenType">): string {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

function signRefresh(payload: Omit<JwtPayload, "tokenType">): string {
  return jwt.sign(
    { ...payload, tokenType: "refresh" },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
    },
  );
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(401, "Invalid credentials");
  }

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  } as const;

  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh(payload),
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function refreshToken(
  refreshToken: string,
): Promise<Pick<AuthResponse, "accessToken">> {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (payload.tokenType !== "refresh") {
    throw new ApiError(401, "Invalid token type");
  }

  const user = await UserModel.findById(payload.userId).lean();
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  return {
    accessToken: signAccess({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    }),
  };
}

export async function registerStudent(
  input: RegisterStudentInput,
): Promise<AuthResponse> {
  const normalizedEmail = input.email.toLowerCase();
  const normalizedAccountNumber = input.accountNumber?.trim();

  const existingEmail = await UserModel.findOne({ email: normalizedEmail }).lean();
  if (existingEmail) {
    throw new ApiError(409, "Email already in use");
  }

  if (normalizedAccountNumber) {
    const existingAccountNumber = await UserModel.findOne({
      accountNumber: normalizedAccountNumber,
    }).lean();
    if (existingAccountNumber) {
      throw new ApiError(409, "Account number already in use");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await UserModel.create({
    email: normalizedEmail,
    password: passwordHash,
    role: "student",
    firstName: input.firstName,
    lastName: input.lastName ?? "",
    accountNumber: normalizedAccountNumber,
    isActive: true,
    mustChangePassword: false,
  });

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  } as const;

  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh(payload),
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}
