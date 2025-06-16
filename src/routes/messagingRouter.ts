import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import logger from "../utils/logger";
import bodyInspector from "../middlewares/bodyInspector";
import {
	sendMessage,
	getChatMessages,
	getUserChats,
	markChatAsRead,
	getOrCreateChatId,
	setInChatStatus,
	broadcastMessage,
	broadcastGroupMessage,
	getOrCreateBroadcastGroup,
	sendGroupMessage,
	readGroupMessage,
} from "../actions/messaging";

const messagingRouter = express.Router();

// Send a message
messagingRouter.post(
	"/send",
	bodyInspector(["recipientId", "text"]),
	async (req: Request, res: Response) => {
		try {
			const userid = req.user.uid;
			const { recipientId, text, type } = req.body;
			logger.info(`Send message from ${userid} to ${recipientId}`);
			const result = await sendMessage(userid, recipientId, text, type);
			res.json(result);
		} catch (e: any) {
			logger.error(`Send message error: ${e.message}`);
			res.status(500).json({ success: false, message: "Internal error" });
		}
	},
);

// Get all messages in a chat
messagingRouter.get(
	"/messages/:chatId",
	async (req: Request, res: Response) => {
		try {
			const { chatId } = req.params;
			logger.info(`Fetch messages for chat ${chatId}`);
			const messages = await getChatMessages(chatId);
			res.json({ success: true, messages });
		} catch (e: any) {
			logger.error(`Get messages error: ${e.message}`);
			res.status(500).json({ success: false, message: "Internal error" });
		}
	},
);

// List all chats for a user
messagingRouter.get("/chats", async (req: Request, res: Response) => {
	try {
		const userId = req.user.uid;
		logger.info(`Fetch chats for user ${userId}`);
		const chats = await getUserChats(userId);
		res.json({ success: true, chats });
	} catch (e: any) {
		logger.error(`Get user chats error: ${e.message}`);
		res.status(500).json({ success: false, message: "Internal error" });
	}
});

// Mark chat as read
messagingRouter.patch(
	"/read/:chatId/:messageId",
	bodyInspector(["chatId", "messageId"]),
	async (req: Request, res: Response) => {
		try {
			const userId = req.user.uid;
			const { chatId, messageId } = req.params;
			logger.info(`Mark chat ${chatId} as read by user ${userId}`);
			const result = await markChatAsRead(chatId, messageId, userId);
			res.json(result);
		} catch (e: any) {
			logger.error(`Mark chat as read error: ${e.message}`);
			res.status(500).json({ success: false, message: "Internal error" });
		}
	},
);

// Get or create chatId for 1-on-1 chat
messagingRouter.post(
	"/getOrCreateChatId",
	bodyInspector(["userA", "userB"]),
	async (req: Request, res: Response) => {
		try {
			const { userA, userB } = req.body;
			logger.info(`Get or create chatId for users ${userA} and ${userB}`);
			const chatId = await getOrCreateChatId(userA, userB);
			res.json({ success: true, chatId });
		} catch (e: any) {
			logger.error(`GetOrCreateChatId error: ${e.message}`);
			res.status(500).json({ success: false, message: "Internal error" });
		}
	},
);
messagingRouter.post(
    "/inchat/:chatId/:status",
    async (req: Request, res: Response) => {
        try {
            const userId = req.user?.uid;
            const { chatId, status } = req.params;
            if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

            const result = await setInChatStatus(userId, chatId, status === "true");
            res.json(result);
			return
        } catch (e) {
            res.status(500).json({ success: false, message: "Failed to update inChat status" });
			return
        }
    }
);
messagingRouter.post(
    "/broadcast",
    async (req: Request, res: Response) => {
        const adminId = req.user?.uid;
        const { text, type } = req.body;
        if (!adminId || !text) {
            return res.status(400).json({ success: false, message: "Missing adminId or text" });
        }
        const result = await broadcastGroupMessage(adminId, text, type || "text");
        res.json(result);
    }
);

// Send a message in a group chat
messagingRouter.post(
    "/group/send",
    async (req: Request, res: Response) => {
        const senderId = req.user?.uid;
        const { groupId, text, type } = req.body;
        if (!senderId || !groupId || !text) {
            return res.status(400).json({ success: false, message: "Missing senderId, groupId, or text" });
        }
        const result = await sendGroupMessage(senderId, groupId, text, type || "text");
        res.json(result);
    }
);
messagingRouter.patch(
    "/group/read/:groupId/:messageId",
    async (req: Request, res: Response) => {
        try {
            const userId = req.user?.uid;
            const { groupId, messageId } = req.params;
            if (!userId || !groupId || !messageId) {
                return res.status(400).json({ success: false, message: "Missing userId, groupId, or messageId" });
            }
            const result = await readGroupMessage(groupId, messageId, userId);
            res.json(result);
        } catch (e: any) {
            logger.error(`Read group message error: ${e.message}`);
            res.status(500).json({ success: false, message: "Internal error" });
        }
    }
);

export default messagingRouter;
