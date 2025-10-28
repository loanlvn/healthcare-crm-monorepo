import { Router } from "express";
import { AppointmentsController } from "./controllerAppointment";
import { asyncHandler } from "../../middlewares/asyncHandler";

  const r = Router();

  r.get("/", asyncHandler(AppointmentsController.list));
  r.post("/", asyncHandler(AppointmentsController.create));
  r.get("/:id", asyncHandler(AppointmentsController.detail));
  r.patch("/:id", asyncHandler(AppointmentsController.update));
  r.delete("/:id", asyncHandler(AppointmentsController.cancel));
  r.post("/:id/reminders", asyncHandler(AppointmentsController.forceReminder));

  export default r;