import { Router } from 'express';
import { authAccess } from '../../../middlewares/auth';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { uploadAvatar } from './upload';
import { postMyAvatar } from './controllerAvatar';

const r = Router();

r.post('/me/avatar', authAccess, uploadAvatar.single('file'), asyncHandler(postMyAvatar));

export default r;