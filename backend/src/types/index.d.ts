import type { JwtPayload } from "../common/types.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtPayload;
    }
  }
}

export {};
