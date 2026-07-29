import { Router } from "express";
import healthRouter from "./health.js";
import teslaRouter from "./tesla.js";

const router = Router();

router.use(healthRouter);
router.use(teslaRouter);

export default router;
