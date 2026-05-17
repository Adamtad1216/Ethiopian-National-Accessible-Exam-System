import { describe, expect, it } from "vitest";
import { calculateScore } from "../../src/modules/results/services/results.service.js";
describe("results service unit", () => {
    it("calculates total and section scores", () => {
        const questions = [
            { id: "q1", section: "A", correctAnswer: 1 },
            { id: "q2", section: "A", correctAnswer: 2 },
            { id: "q3", section: "B", correctAnswer: 0 },
        ];
        const responses = new Map([
            ["q1", 1],
            ["q2", 0],
            ["q3", 0],
        ]);
        const result = calculateScore(questions, responses);
        expect(result.score).toBe(67);
        expect(result.sectionScores.find((s) => s.section === "A")).toEqual({
            section: "A",
            score: 1,
            total: 2,
        });
        expect(result.sectionScores.find((s) => s.section === "B")).toEqual({
            section: "B",
            score: 1,
            total: 1,
        });
    });
});
