import express from "express";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken";
import { getUserData } from "../actions/accounts";
import { addNotification } from "../actions/notifications";

const adminRouter = express.Router();

// Admin route to send notifications to all users
adminRouter.post("/notify-all", async (req, res) => {
    const user = req.user;
    if (!user || !user.uid) {
        return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    try {
        const userData = await getUserData(user.uid);
        if (!userData || userData.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message required" });
        }
        // Fetch all users
        const db = require("firebase-admin/database").getDatabase();
        const usersSnap = await db.ref("users").once("value");
        if (!usersSnap.exists()) {
            return res.status(404).json({ message: "No users found" });
        }
        const users = usersSnap.val();
        const userIds = Object.keys(users);
        // Send notification to all users (except the admin themself)
        await Promise.all(userIds.filter(uid => uid !== user.uid).map(uid =>
            addNotification(uid, "admin-broadcast", user.uid, message, { title })
        ));
        return res.json({ success: true, message: "Notification sent to all users" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Route to make another user an admin
adminRouter.post("/make-admin",  async (req, res) => {
    const requester = req.user;
    if (!requester || !requester.uid) {
        return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    try {
        const requesterData = await getUserData(requester.uid);
        if (!requesterData || requesterData.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID required" });
        }
        // Update the user's role to admin
        const db = require("firebase-admin/database").getDatabase();
        const userRef = db.ref(`users/${userId}`);
        await userRef.update({ role: "admin" });
        return res.json({ success: true, message: "User promoted to admin" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default adminRouter;
