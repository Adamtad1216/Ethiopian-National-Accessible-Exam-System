import "./setup.js";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { UserModel } from "../../src/modules/users/schemas/user.schema.js";
import { StudentModel } from "../../src/modules/students/schemas/student.schema.js";
import { ExamModel } from "../../src/modules/exams/schemas/exam.schema.js";
import { QuestionModel } from "../../src/modules/questions/schemas/question.schema.js";
async function login(email, password) {
    const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password });
    return response.body.accessToken;
}
describe("grading and response sync", () => {
    it("syncs responses with latest answeredAt and computes score", async () => {
        const password = await bcrypt.hash("demo123", 10);
        const studentUser = await UserModel.create({
            email: "student@enaes.com",
            password,
            role: "student",
            firstName: "Student",
            lastName: "Test",
            mustChangePassword: false,
        });
        await StudentModel.create({ nationalId: "1001", userId: studentUser._id });
        const examiner = await UserModel.create({
            email: "examiner@enaes.com",
            password,
            role: "examiner",
            firstName: "Examiner",
            lastName: "Test",
            mustChangePassword: false,
        });
        const exam = await ExamModel.create({
            title: "Math",
            status: "published",
            duration: 60,
            createdBy: examiner._id,
        });
        const [q1, q2] = await QuestionModel.create([
            {
                examId: exam._id,
                text: "1+1",
                options: ["1", "2", "3"],
                correctAnswer: 1,
                section: "A",
            },
            {
                examId: exam._id,
                text: "2+2",
                options: ["2", "3", "4"],
                correctAnswer: 2,
                section: "A",
            },
        ]);
        const token = await login("student@enaes.com", "demo123");
        const firstTime = new Date(Date.now() - 10000).toISOString();
        const secondTime = new Date().toISOString();
        const sync = await request(app)
            .post("/api/responses/sync")
            .set("Authorization", `Bearer ${token}`)
            .send({
            responses: [
                {
                    examId: exam._id.toString(),
                    questionId: q1._id.toString(),
                    selectedOption: 0,
                    answeredAt: firstTime,
                },
                {
                    examId: exam._id.toString(),
                    questionId: q1._id.toString(),
                    selectedOption: 1,
                    answeredAt: secondTime,
                },
                {
                    examId: exam._id.toString(),
                    questionId: q2._id.toString(),
                    selectedOption: 2,
                    answeredAt: secondTime,
                },
            ],
        });
        expect(sync.status).toBe(200);
        const grade = await request(app)
            .post(`/api/results/grade/${exam._id.toString()}`)
            .set("Authorization", `Bearer ${token}`)
            .send();
        expect(grade.status).toBe(200);
        expect(grade.body.score).toBe(100);
    });
});
