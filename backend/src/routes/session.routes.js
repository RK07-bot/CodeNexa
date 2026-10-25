import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  createSession,
  listPublicSessions,
  getMyOpenSession,
  getSession,
  joinSession,
  cancelSession,
  endSession,
  startNextSession,
} from "../controllers/session.controller.js";

const sessionRouter = express.Router();

sessionRouter.use(isAuthenticated);

sessionRouter.post("/", createSession);
// fixed paths go first, otherwise they would be read as a room code
sessionRouter.get("/public", listPublicSessions);
sessionRouter.get("/me/current", getMyOpenSession);
sessionRouter.get("/:code", getSession);
sessionRouter.post("/:code/join", joinSession);
sessionRouter.post("/:code/cancel", cancelSession);
sessionRouter.post("/:code/end", endSession);
sessionRouter.post("/:code/next", startNextSession);

export default sessionRouter;