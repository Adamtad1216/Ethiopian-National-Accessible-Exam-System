import "./setup.ts";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.ts";
import { UserModel } from "../../src/modules/users/schemas/user.schema.ts";

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

  it("registers a student account", async () => {
    const registerResponse = await request(app).post("/api/auth/register").send({
      email: "newstudent@enaes.com",
      password: "demo123",
      firstName: "New",
      lastName: "Student",
      accountNumber: "STU-2026-001",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.role).toBe("student");
    expect(registerResponse.body.accessToken).toBeTypeOf("string");
    expect(registerResponse.body.refreshToken).toBeTypeOf("string");
  });

  it("allows admin to create examiner and student accounts", async () => {
    const password = await bcrypt.hash("demo123", 10);
    await UserModel.create({
      email: "admin2@enaes.com",
      password,
      role: "admin",
      firstName: "Admin",
      lastName: "Two",
      mustChangePassword: false,
    });

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "admin2@enaes.com",
      password: "demo123",
    });

    const adminToken = adminLogin.body.accessToken as string;

    const createExaminer = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "examiner-created@enaes.com",
        password: "demo123",
        firstName: "Created",
        lastName: "Examiner",
        role: "examiner",
      });

    expect(createExaminer.status).toBe(201);
    expect(createExaminer.body.role).toBe("examiner");

    const createStudent = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "student-created@enaes.com",
        password: "demo123",
        firstName: "Created",
        lastName: "Student",
        accountNumber: "STU-2026-002",
        role: "student",
      });

    expect(createStudent.status).toBe(201);
    expect(createStudent.body.role).toBe("student");
    expect(createStudent.body.accountNumber).toBe("STU-2026-002");
  });
});
