import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 20,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
  });
  console.info("MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
