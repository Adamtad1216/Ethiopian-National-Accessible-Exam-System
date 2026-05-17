import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "./index.js";
import { UserModel } from "../modules/users/schemas/user.schema.js";

export async function seedDatabase(): Promise<void> {
  await connectDb();

  const passwordHash = await bcrypt.hash("demo123", 12);

  await UserModel.findOneAndUpdate(
    { email: "admin@enaes.com" },
    {
      email: "admin@enaes.com",
      password: passwordHash,
      role: "admin",
      firstName: "System",
      lastName: "Admin",
      isActive: true,
      mustChangePassword: false,
    },
    { upsert: true, new: true },
  );

  await disconnectDb();
}
