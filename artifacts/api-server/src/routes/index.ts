import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import functionsRouter from "./functions";
import accountsRouter from "./accounts";
import contactsRouter from "./contacts";
import leadsRouter from "./leads";
import tasksRouter from "./tasks";
import notesRouter from "./notes";
import appointmentsRouter from "./appointments";
import guestRoomBlocksRouter from "./guestRoomBlocks";
import locationsRouter from "./locations";
import reportsRouter from "./reports";
import calendarRouter from "./calendar";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/events", eventsRouter);
router.use("/functions", functionsRouter);
router.use("/accounts", accountsRouter);
router.use("/contacts", contactsRouter);
router.use("/leads", leadsRouter);
router.use("/tasks", tasksRouter);
router.use("/notes", notesRouter);
router.use("/appointments", appointmentsRouter);
router.use("/guest-room-blocks", guestRoomBlocksRouter);
router.use("/locations", locationsRouter);
router.use("/reports", reportsRouter);
router.use("/calendar", calendarRouter);
router.use("/dashboard", dashboardRouter);

export default router;
