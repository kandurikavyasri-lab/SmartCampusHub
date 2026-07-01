import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bulkUploadRouter from "./bulkUpload";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/bulk-upload", bulkUploadRouter);

export default router;
