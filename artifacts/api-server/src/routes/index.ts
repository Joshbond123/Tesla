import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teslaRouter from "./tesla";

const router: IRouter = Router();

router.use(healthRouter);
router.use(teslaRouter);

export default router;
