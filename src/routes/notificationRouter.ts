import express, { type Request, type Response } from "express";
import { getNotifications, markNotificationRead, saveExpoToken } from "../actions/notifications";
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

notificationRouter.post(
    "/expo-token/:token",
    verifyFirebaseToken,
    async (req: Request, res: Response) => {
        const userId = req.user.uid;
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ success: false, message: "Expo token is required" });
        }
        const result = await saveExpoToken(userId, token);
        res.json(result);
    }
);

export default notificationRouter;