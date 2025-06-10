import express, { type Request, type Response } from "express";
import { getNotifications, markNotificationRead } from "../actions/notifications";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken";


const notificationRouter = express.Router();

notificationRouter.get(
    "/",
    verifyFirebaseToken,
    async (req: Request, res: Response) => {
        const userId = req.user.uid;
        const notifications = await getNotifications(userId);
        res.json({ success: true, notifications });
    }
);

notificationRouter.post(
    "/read/:notificationId",
    verifyFirebaseToken,
    async (req: Request, res: Response) => {
        const userId = req.user.uid;
        const { notificationId } = req.params;
        await markNotificationRead(userId, notificationId);
        res.json({ success: true });
    }
);

export default notificationRouter;