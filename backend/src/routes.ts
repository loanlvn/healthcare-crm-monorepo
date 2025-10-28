import { Router } from "express";
import authRouter from "./modules/auth/routerAuth";
import userRouter from "./modules/users/routerUser";
import avatarRouter from "./modules/users/avatar/routerAvatar";
import patientRouter from "./modules/patients/routerPatients";
import doctorRouter from "./modules/doctors/routerDoctors";
import { authAccess } from "./middlewares/auth";
import chatRoutes from "./modules/messages/chat/routerChat";
import { enforceMustChangePassword } from "./middlewares/mustChangePassword";
import appointmentRouter from "./modules/appointments/routerAppointment";


const router = Router()
router.use('/auth', authRouter);
router.use('/users', authAccess, enforceMustChangePassword, userRouter);
router.use('/users', authAccess, enforceMustChangePassword, avatarRouter);
router.use('/patients', authAccess, enforceMustChangePassword, patientRouter);
router.use('/doctors', authAccess, enforceMustChangePassword, doctorRouter);
router.use('/conversations',authAccess, chatRoutes);
router.use('/appointments', authAccess, enforceMustChangePassword, appointmentRouter);

export default router;