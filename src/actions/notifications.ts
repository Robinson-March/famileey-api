import { getDatabase } from "firebase-admin/database";
import { getUserData } from "./accounts";
import logger from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { Expo } from "expo-server-sdk";
const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
   // useFcmV1: true,
});

const sendExpoNotification = async (
    to: string,
    title: string,
    body: string,
    data: any = {},
    richContent: any = undefined
) => {
    try {
        if (!Expo.isExpoPushToken(to)) {
            logger.error(`Push token ${to} is not a valid Expo push token`);
            return { success: false, error: "Invalid Expo push token" };
        }

        const message: any = {
            to,
            sound: "default",
            title,
            body,
            data,
        };
        if (richContent) {
            message.richContent = richContent;
        }

        const chunks = expo.chunkPushNotifications([message]);
        let tickets = [];
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                logger.error("Expo push send error", error);
            }
        }
        return { success: true, tickets };
    } catch (e) {
        logger.error("Expo push error", e);
        return { success: false, error: e.message };
    }
};

const addNotification = async (
    userId: string,
    type: string,
    fromUid: string,
    message: string,
    data: any = {},
    richContent?: any = undefined
) => {
    const db = getDatabase();
    const notificationId = uuidv4();
    const timestamp = Date.now();
    const fromUser = await getUserData(fromUid);

    const notification = {
        type,
        from: {
            uid: fromUid,
            familyName: fromUser.familyName,
        },
        data,
        message,
        timestamp,
        read: false,
        richContent: richContent || null,
    };

    await db.ref(`notifications/${userId}/${notificationId}`).set(notification);

    // Send push notification if user has expo token
    const expoTokenSnap = await db.ref(`expo-tokens/${userId}`).once("value");
    if (expoTokenSnap.exists()) {
        await sendExpoNotification(
            expoTokenSnap.val(),
            "Famileey",
            message,
            { type, ...data },
            richContent
        );
    }

    return { success: true, notificationId };
};

const getNotifications = async (userId: string) => {
    const db = getDatabase();
    const snap = await db.ref(`notifications/${userId}`).orderByChild("timestamp").once("value");
    if (!snap.exists()) return [];
    const notifications = Object.entries(snap.val()).map(([id, value]: [string, any]) => ({
        id,
        ...value,
    }));
    // Most recent first
    return notifications.reverse();
};

const markNotificationRead = async (userId: string, notificationId: string) => {
    const db = getDatabase();
    await db.ref(`notifications/${userId}/${notificationId}/read`).set(true);
    return { success: true };
};

export { addNotification, getNotifications, markNotificationRead };