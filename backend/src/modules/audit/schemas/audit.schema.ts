import { Schema, model, type InferSchemaType, Types } from "mongoose";

const auditSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true, trim: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, required: true, default: () => new Date() },
});

auditSchema.index({ timestamp: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditSchema>;
export const AuditLogModel = model("AuditLog", auditSchema);
