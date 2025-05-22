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
messagingRouter.post(
	"/read/:chatId",
	bodyInspector(["chatId"]),
	async (req: Request, res: Response) => {
		try {
			const userId = req.user.uid;
			const { chatId } = req.params;
			logger.info(`Mark chat ${chatId} as read by user ${userId}`);
			const result = await markChatAsRead(chatId, userId);
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

export default messagingRouter;
