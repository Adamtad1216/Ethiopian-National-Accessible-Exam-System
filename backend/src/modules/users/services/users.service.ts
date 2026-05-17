import bcrypt from "bcryptjs";
import { ApiError } from "../../../common/middleware/errorHandler.js";
import { UserModel } from "../schemas/user.schema.js";

function toPublicUser(u: {
  _id: { toString(): string };
  email: string;
  role: string;
  mustChangePassword: boolean;
  firstName: string;
  lastName?: string | null;
  accountNumber?: string | null;
  isActive: boolean;
}) {
  return {
    id: u._id.toString(),
    email: u.email,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
    firstName: u.firstName,
    lastName: u.lastName ?? "",
    accountNumber: u.accountNumber ?? undefined,
    isActive: u.isActive,
  };
}

export async function getUsers(): Promise<
  Array<{
    id: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
    firstName: string;
    lastName: string;
    accountNumber?: string;
    isActive: boolean;
  }>
> {
  const users = await UserModel.find().lean();
  return users.map(toPublicUser);
}

export async function getById(id: string): Promise<{
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  accountNumber?: string;
  isActive: boolean;
}> {
  const user = await UserModel.findById(id).lean();
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return toPublicUser(user);
}

export async function createUserByAdmin(input: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  accountNumber?: string;
  role: "student" | "examiner";
}): Promise<{
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  accountNumber?: string;
  isActive: boolean;
}> {
  const normalizedEmail = input.email.toLowerCase();
  const normalizedAccountNumber = input.accountNumber?.trim();

  const existingEmail = await UserModel.findOne({
    email: normalizedEmail,
  }).lean();
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
    role: input.role,
    firstName: input.firstName,
    lastName: input.lastName ?? "",
    accountNumber: normalizedAccountNumber,
    isActive: true,
    mustChangePassword: true,
  });

  return toPublicUser(user);
}

export async function updateUserByAdmin(
  userId: string,
  input: {
    firstName: string;
    lastName?: string;
    role: "admin" | "examiner" | "student";
    isActive: boolean;
  },
): Promise<{
  id: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  accountNumber?: string;
  isActive: boolean;
}> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.firstName = input.firstName;
  user.lastName = input.lastName ?? "";
  user.role = input.role;
  user.isActive = input.isActive;

  await user.save();
  return toPublicUser(user);
}

export async function deleteUserByAdmin(
  userId: string,
  actingUserId: string,
): Promise<void> {
  if (userId === actingUserId) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const deleted = await UserModel.findByIdAndDelete(userId);
  if (!deleted) {
    throw new ApiError(404, "User not found");
  }
}
