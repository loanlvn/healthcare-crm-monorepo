import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { postLogin, postRefresh, postLogout, postChangePassword,
    postForgotRequest, postForgotVerify, postForgotReset } from './controllerAuth';
import { authAccess } from '../../middlewares/auth';

const r = Router();

// routes publiques (selon spec)
r.post('/login',   asyncHandler(postLogin));
r.post('/refresh', asyncHandler(postRefresh));
r.post('/logout',  asyncHandler(postLogout));

r.post('/change-password', authAccess, asyncHandler(postChangePassword));

r.post('/forgot-password/request', asyncHandler(postForgotRequest));
r.post('/forgot-password/verify',  asyncHandler(postForgotVerify));
r.post('/forgot-password/reset',   asyncHandler(postForgotReset));

export default r;
