import { asyncHandler } from "../../middlewares/asyncHandler";
import { authAccess } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac";
import { Router } from "express";
import * as ctl from "../../modules/users/controllerUser";
import { requireSelfOrAdmin } from "../../middlewares/guards";

const r = Router();
r.use(authAccess);

r.post('/', rbac('USER_WRITE'), asyncHandler(ctl.postUser));
r.put('/:id', requireSelfOrAdmin, asyncHandler(ctl.putUser));
r.get('/me', asyncHandler(ctl.getMe));
r.get('/:id', requireSelfOrAdmin, asyncHandler(ctl.getUser));
r.get('/', rbac('USER_READ'), asyncHandler(ctl.getUsers));
r.put('/:id/disable', rbac('USER_WRITE'), asyncHandler(ctl.putDisableUser));

export default r;