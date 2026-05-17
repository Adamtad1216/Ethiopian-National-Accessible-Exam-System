import bcrypt from "bcryptjs";

export function hashPassword(password: string, rounds = 12) {
  return bcrypt.hash(password, rounds);
}

export function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}
