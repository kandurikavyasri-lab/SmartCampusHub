import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bulkUploadRouter from "./bulkUpload";
import authRouter from "./auth";
import dataRouter from "./data";
import feedRouter from "./feed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/data", dataRouter);
router.use("/feed", feedRouter);
router.use("/bulk-upload", bulkUploadRouter);

export default router;
