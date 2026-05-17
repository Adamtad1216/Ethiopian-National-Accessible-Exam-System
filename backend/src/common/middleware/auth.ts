import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { JwtPayload, UserRole } from "../types.js";
import { ApiError } from "./errorHandler.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new ApiError(401, "Missing bearer token"));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    if (payload.tokenType !== "access") {
      next(new ApiError(401, "Invalid token type"));
      return;
    }

    req.authUser = payload;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new ApiError(401, "Authentication required"));
      return;
    }

    if (!roles.includes(req.authUser.role)) {
      next(new ApiError(403, "Forbidden"));
      return;
    }

    next();
  };
}
