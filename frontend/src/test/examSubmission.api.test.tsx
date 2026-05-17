import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ExamPlayer from "@/pages/student/ExamPlayer";

const { gradeExamApi } = vi.hoisted(() => ({
  gradeExamApi: vi.fn(async () => ({
    id: "r1",
    score: 80,
    examId: "exam1",
    sectionScores: [],
  })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { _id: "u1", role: "student" },
    preferences: { language: "en", tts: { enabled: false } },
  }),
}));

vi.mock("@/features/student/services/studentService", () => ({
  getAssignedExamsApi: async () => [
    {
      _id: "exam1",
      title: "Math",
      description: "",
      subject: "General",
      grade: "12",
      duration: 60,
      totalQuestions: 1,
      status: "published",
      createdBy: "x",
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  getExamQuestionsApi: async () => [
    {
      _id: "q1",
      examId: "exam1",
      sectionId: "s1",
      questionNumber: 1,
      text: "Q1",
      options: [
        { _id: "q1-0", label: "A", text: "A1" },
        { _id: "q1-1", label: "B", text: "B1" },
      ],
      correctOption: "q1-1",
      points: 1,
      status: "approved",
      createdAt: new Date().toISOString(),
    },
  ],
  submitResponseApi: async () => ({ id: "x", ignored: false }),
  syncResponsesApi: async () => ({ synced: [] }),
  gradeExamApi,
}));

vi.mock("@/services/offlineDb", () => ({
  saveResponse: async () => undefined,
  getUnsyncedResponses: async () => [],
  markResponsesSynced: async () => undefined,
}));

vi.mock("@/services/tts", () => ({
  ttsService: {
    stop: vi.fn(),
    speakQuestion: vi.fn(),
    speakOption: vi.fn(),
    speakTimeAlert: vi.fn(),
  },
}));

describe("Exam submission flow", () => {
  it("submits and calls grade API", async () => {
    render(
      <MemoryRouter initialEntries={["/student/exam/exam1"]}>
        <Routes>
          <Route path="/student/exam/:examId" element={<ExamPlayer />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/A1/i);

    fireEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm submit/i }));

    await waitFor(() => expect(gradeExamApi).toHaveBeenCalledWith("exam1"));
    await screen.findByText("Exam Completed");
  });
});
