import { Router } from "express";
import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../../common/middleware/auth.js";
import { validateBody } from "../../../common/middleware/validate.js";
import { createUserDto, updateUserDto } from "../dtos/user.dto.js";
import * as usersService from "../services/users.service.js";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await usersService.getById(req.authUser!.userId);
    res.json(user);
  }),
);

usersRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const users = await usersService.getUsers();
    res.json(users);
  }),
);

usersRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createUserDto),
  asyncHandler(async (req, res) => {
    const user = await usersService.createUserByAdmin(req.body);
    res.status(201).json(user);
  }),
);

usersRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(updateUserDto),
  asyncHandler(async (req, res) => {
    const user = await usersService.updateUserByAdmin(
      String(req.params.id),
      req.body,
    );
    res.json(user);
  }),
);

usersRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await usersService.deleteUserByAdmin(
      String(req.params.id),
      req.authUser!.userId,
    );
    res.status(204).send();
  }),
);
