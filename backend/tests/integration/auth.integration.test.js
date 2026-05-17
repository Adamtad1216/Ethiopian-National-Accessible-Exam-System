import "./setup.js";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { UserModel } from "../../src/modules/users/schemas/user.schema.js";
describe("auth flow", () => {
    it("logs in and refreshes token", async () => {
        const password = await bcrypt.hash("demo123", 10);
        await UserModel.create({
            email: "student1@enaes.com",
            password,
            role: "student",
            firstName: "Student",
            lastName: "One",
            mustChangePassword: false,
        });
        const loginResponse = await request(app).post("/api/auth/login").send({
            email: "student1@enaes.com",
            password: "demo123",
        });
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.accessToken).toBeTypeOf("string");
        expect(loginResponse.body.refreshToken).toBeTypeOf("string");
        const refreshResponse = await request(app).post("/api/auth/refresh").send({
            refreshToken: loginResponse.body.refreshToken,
        });
        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body.accessToken).toBeTypeOf("string");
    });
});
