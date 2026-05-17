import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectDb, disconnectDb } from "../../src/config/db.js";
beforeAll(async () => {
    await connectDb();
});
beforeEach(async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});
afterAll(async () => {
    await disconnectDb();
});
