import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
  listProblems,
  getProblemBySlug,
  getTopics,
} from "../controllers/problem.controller.js";

const problemRouter = express.Router();

// every route here needs a logged-in user
problemRouter.use(isAuthenticated);

problemRouter.get("/", listProblems);
// must stay above /:slug, otherwise "topics" would be treated as a slug
problemRouter.get("/topics", getTopics);
problemRouter.get("/:slug", getProblemBySlug);

export default problemRouter;