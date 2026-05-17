import "./setup.ts";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.ts";
import { UserModel } from "../../src/modules/users/schemas/user.schema.ts";

async function login(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return response.body.accessToken as string;
}

describe("exam lifecycle", () => {
  it("creates, requests approval, approves and publishes exam", async () => {
    const password = await bcrypt.hash("demo123", 10);
    await UserModel.create([
      {
        email: "admin@enaes.com",
        password,
        role: "admin",
        firstName: "Admin",
        lastName: "User",
        mustChangePassword: false,
      },
      {
        email: "examiner@enaes.com",
        password,
        role: "examiner",
        firstName: "Examiner",
        lastName: "User",
        mustChangePassword: false,
      },
    ]);

    const examinerToken = await login("examiner@enaes.com", "demo123");
    const adminToken = await login("admin@enaes.com", "demo123");

    const create = await request(app)
      .post("/api/exams")
      .set("Authorization", `Bearer ${examinerToken}`)
      .send({ title: "Physics", duration: 90 });

    expect(create.status).toBe(201);
    const examId = create.body.id as string;

    const pending = await request(app)
      .post(`/api/exams/${examId}/request-approval`)
      .set("Authorization", `Bearer ${examinerToken}`)
      .send();
    expect(pending.status).toBe(200);
    expect(pending.body.status).toBe("pending");

    const approved = await request(app)
      .post(`/api/exams/${examId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("approved");

    const published = await request(app)
      .post(`/api/exams/${examId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("published");
  });
});
