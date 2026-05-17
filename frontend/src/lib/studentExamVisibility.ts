const examVisibilityKey = (userId: string) => `enaes_hidden_exams_${userId}`;

function readExamIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = localStorage.getItem(examVisibilityKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeExamIds(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(examVisibilityKey(userId), JSON.stringify(Array.from(ids)));
}

export function getHiddenExamIds(userId: string): Set<string> {
  return readExamIds(userId);
}

export function hideExamForStudent(userId: string, examId: string) {
  const ids = readExamIds(userId);
  ids.add(examId);
  writeExamIds(userId, ids);
}
