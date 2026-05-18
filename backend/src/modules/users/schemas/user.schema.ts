import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: false, default: "", trim: true },
    accountNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "examiner", "student"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
    school: { type: String, required: false, trim: true },
    grade: { type: String, required: false, trim: true },
    region: { type: String, required: false, trim: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
