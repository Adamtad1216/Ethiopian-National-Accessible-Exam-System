import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtPayload } from "../common/types.js";

export function signAccessToken(payload: Omit<JwtPayload, "tokenType">) {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, "tokenType">) {
  return jwt.sign(
    { ...payload, tokenType: "refresh" },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
    },
  );
}
