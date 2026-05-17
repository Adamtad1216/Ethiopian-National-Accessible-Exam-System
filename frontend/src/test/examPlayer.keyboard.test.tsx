import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ExamPlayer from "@/pages/student/ExamPlayer";

const { submitResponseApi, gradeExamApi } = vi.hoisted(() => ({
  submitResponseApi: vi.fn(),
  gradeExamApi: vi.fn(),
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
      totalQuestions: 2,
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
    {
      _id: "q2",
      examId: "exam1",
      sectionId: "s1",
      questionNumber: 2,
      text: "Q2",
      options: [
        { _id: "q2-0", label: "A", text: "A2" },
        { _id: "q2-1", label: "B", text: "B2" },
      ],
      correctOption: "q2-1",
      points: 1,
      status: "approved",
      createdAt: new Date().toISOString(),
    },
  ],
  submitResponseApi,
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

describe("ExamPlayer keyboard", () => {
  it("supports keyboard option selection and enter-to-next navigation", async () => {
    render(
      <MemoryRouter initialEntries={["/student/exam/exam1"]}>
        <Routes>
          <Route path="/student/exam/:examId" element={<ExamPlayer />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/A1/i);

    fireEvent.keyDown(window, { key: "1" });
    await waitFor(() => expect(submitResponseApi).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByText(/A2/i);
  });
});
