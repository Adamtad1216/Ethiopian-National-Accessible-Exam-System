import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db.js";
import { UserModel } from "../modules/users/schemas/user.schema.js";

async function upsertUser(payload: {
  email: string;
  passwordHash: string;
  role: "admin" | "examiner" | "student";
  firstName: string;
  lastName: string;
  mustChangePassword?: boolean;
}) {
  return UserModel.findOneAndUpdate(
    { email: payload.email.toLowerCase() },
    {
      email: payload.email.toLowerCase(),
      password: payload.passwordHash,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      isActive: true,
      mustChangePassword: payload.mustChangePassword ?? false,
    },
    { upsert: true, new: true },
  );
}

async function run(): Promise<void> {
  await connectDb();

  const passwordHash = await bcrypt.hash("demo123", 12);

  const admin = await upsertUser({
    email: "admin@enaes.com",
    passwordHash,
    role: "admin",
    firstName: "System",
    lastName: "Admin",
  });

  console.info("Seed completed", {
    adminId: admin._id.toString(),
  });

  await disconnectDb();
}

run().catch(async (error) => {
  console.error("Seed failed", error);
  await disconnectDb();
  process.exit(1);
});
