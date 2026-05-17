import { AuditLogModel } from "../schemas/audit.schema.js";
import { UserModel } from "../../users/schemas/user.schema.js";
import { ExamModel } from "../../exams/schemas/exam.schema.js";

export async function logAudit(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await AuditLogModel.create({
    userId,
    action,
    metadata,
    timestamp: new Date(),
  });
}

export async function listAuditLogs(
  limit = 100,
): Promise<
  Array<{
    id: string;
    userId: string;
    userName: string;
    action: string;
    metadata: Record<string, unknown>;
    timestamp: Date;
  }>
> {
  const logs = await AuditLogModel.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  const userIds = Array.from(new Set(logs.map((log) => String(log.userId))));
  const examIds = Array.from(
    new Set(
      logs
        .map((log) => (log.metadata as Record<string, unknown>)?.examId)
        .filter((examId): examId is string => typeof examId === "string"),
    ),
  );

  const [users, exams] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } })
      .select({ _id: 1, firstName: 1, lastName: 1, email: 1 })
      .lean(),
    ExamModel.find({ _id: { $in: examIds } })
      .select({ _id: 1, title: 1 })
      .lean(),
  ]);

  const userNameById = new Map(
    users.map((user) => {
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
      return [String(user._id), fullName.length > 0 ? fullName : user.email];
    }),
  );
  const examTitleById = new Map(
    exams.map((exam) => [String(exam._id), exam.title]),
  );

  return logs.map((log) => {
    const metadata = (log.metadata ?? {}) as Record<string, unknown>;
    const examId = typeof metadata.examId === "string" ? metadata.examId : undefined;
    const examTitle = examId ? examTitleById.get(examId) : undefined;

    return {
      id: log._id.toString(),
      userId: log.userId.toString(),
      userName: userNameById.get(log.userId.toString()) ?? log.userId.toString(),
      action: log.action,
      metadata: examTitle ? { ...metadata, examTitle } : metadata,
      timestamp: log.timestamp,
    };
  });
}
