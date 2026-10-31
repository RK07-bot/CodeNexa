import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  updateUserRoleSchema,
  updateProblemStatusSchema,
  problemBodySchema,
} from "../validators/admin.validator.js";
import { listUsers, updateUserRole } from "../controllers/admin.controller.js";
import { getOverview } from "../controllers/admin.stats.controller.js";
import { listActivity } from "../controllers/admin.activity.controller.js";
import {
  listAdminProblems,
  listAdminTopics,
  getAdminProblem,
  createProblem,
  updateProblem,
  validateProblem,
  updateProblemStatus,
  deleteProblem,
} from "../controllers/admin.problem.controller.js";

const adminRouter = express.Router();

// every admin route requires a logged-in admin, so it is checked once here
adminRouter.use(isAuthenticated, requireAdmin);

adminRouter.get("/overview", getOverview);
adminRouter.get("/activity", listActivity);

adminRouter.get("/users", listUsers);
adminRouter.patch(
  "/users/:userId/role",
  validate(updateUserRoleSchema),
  updateUserRole,
);

adminRouter.get("/problems", listAdminProblems);
// "/problems/topics" must stay above "/problems/:id"
adminRouter.get("/problems/topics", listAdminTopics);
adminRouter.post("/problems", validate(problemBodySchema), createProblem);
adminRouter.get("/problems/:id", getAdminProblem);
adminRouter.put("/problems/:id", validate(problemBodySchema), updateProblem);
adminRouter.post("/problems/:id/validate", validateProblem);
adminRouter.patch(
  "/problems/:id/status",
  validate(updateProblemStatusSchema),
  updateProblemStatus,
);
adminRouter.delete("/problems/:id", deleteProblem);

export default adminRouter;