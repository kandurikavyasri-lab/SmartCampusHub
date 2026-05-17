import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bulkUploadRouter from "./bulkUpload";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bulk-upload", bulkUploadRouter);

export default router;
