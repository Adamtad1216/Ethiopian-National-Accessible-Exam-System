/**
 * Format audit log details for display
 * Parses JSON details and converts them to human-readable format
 */
export function formatAuditDetails(
  details: string | Record<string, unknown>,
): string {
  const parsed = parseMaybeJson(details);

  if (typeof parsed === "object" && parsed !== null) {
    const parts: string[] = [];

    if (parsed.examTitle) parts.push(`Exam: ${String(parsed.examTitle)}`);
    if (parsed.examId && !parsed.examTitle) {
      parts.push(`Exam ID: ${shortenId(String(parsed.examId))}`);
    }
    if (parsed.studentName)
      parts.push(`Student: ${String(parsed.studentName)}`);
    if (parsed.userName) parts.push(`User: ${String(parsed.userName)}`);
    if (parsed.score !== undefined)
      parts.push(`Score: ${String(parsed.score)}%`);
    if (parsed.message) parts.push(String(parsed.message));

    return parts.length > 0 ? parts.join(" • ") : JSON.stringify(parsed);
  }

  return String(parsed);
}

export function formatAuditActorName(actor: string): string {
  const trimmed = actor.trim();
  return isMongoObjectId(trimmed) ? `User ${shortenId(trimmed)}` : trimmed;
}

function parseMaybeJson(
  input: string | Record<string, unknown>,
): string | Record<string, unknown> {
  let value: unknown = input;

  for (let i = 0; i < 2; i += 1) {
    if (typeof value !== "string") {
      break;
    }

    const trimmed = value.trim();
    const looksLikeJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith('"{') && trimmed.endsWith('}"'));

    if (!looksLikeJson) {
      break;
    }

    try {
      value = JSON.parse(trimmed);
    } catch {
      break;
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return String(value ?? "");
}

function isMongoObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

function shortenId(id: string): string {
  if (id.length > 12) {
    return `${id.substring(0, 8)}...`;
  }
  return id;
}
