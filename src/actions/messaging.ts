import {
	getDatabase,
	ServerValue,
	type Database,
} from "firebase-admin/database";
import { v4 as uuidv4 } from "uuid";
import { getUserData } from "./accounts"; // Adjust path as needed

// Get or create chatId for 1-on-1 chat
const getOrCreateChatId = async (
	userA: string,
	userB: string,
): Promise<string> => {
	const db: Database = getDatabase();
	const ref = db.ref(`userChats/${userA}/${userB}`);
	const snap = await ref.once("value");

	if (snap.exists()) {
		return snap.val(); // existing chatId
	}

	const chatId = uuidv4();

	const chatData = {
		participants: {
			[userA]: true,
			[userB]: true,
		},
		createdAt: Date.now(),
		readStatus: {
			[userA]: Date.now(), // consider user's own message read
			[userB]: null, // recipient hasn't read yet
		},
	};

	const updates: any = {};
	updates[`chats/${chatId}`] = chatData;
	updates[`userChats/${userA}/${userB}`] = chatId;
	updates[`userChats/${userB}/${userA}`] = chatId;

	await db.ref().update(updates);
	return chatId;
};

// Send a message in a chat
const sendMessage = async (
	senderId: string,
	recipientId: string,
	text: string,
	type: "text" | "image" = "text",
) => {
	const db: Database = getDatabase();
	const chatId = await getOrCreateChatId(senderId, recipientId);
	const messageId = uuidv4();
	const timestamp = ServerValue.TIMESTAMP;

	const message = {
		senderId,
		text,
		timestamp,
		type,
		status: "sent",
	};

	const chatRef = db.ref(`chats/${chatId}`);
	const chatSnap = await chatRef.once("value");
	let participantsUpdate = {};
	if (!chatSnap.exists() || !chatSnap.val().participants) {
		participantsUpdate = {
			[`chats/${chatId}/participants`]: {
				[senderId]: true,
				[recipientId]: true,
			},
		};
	}

	const updates: any = {
		[`chats/${chatId}/messages/${messageId}`]: message,
		[`chats/${chatId}/lastMessage`]: { text, timestamp },
		[`chats/${chatId}/readStatus/${senderId}`]: timestamp,
		[`chats/${chatId}/readStatus/${recipientId}`]: null,
		...participantsUpdate,
	};

	try {
		await db.ref().update(updates);
		return { success: true, message: "Message sent", messageId, chatId };
	} catch (e) {
		console.error(e);
		return { success: false, message: "Failed to send message" };
	}
};

// Get all messages in a chat
const getChatMessages = async (chatId: string) => {
	const db: Database = getDatabase();
	const ref = db.ref(`chats/${chatId}/messages`);
	const snap = await ref.once("value");
	if (!snap.exists()) {
		return [];
	}
	return Object.entries(snap.val())
		.map(([id, msg]: [string, any]) => ({ id, ...msg }))
		.sort((a, b) => a.timestamp - b.timestamp);
};

// List all chats for a user
const getUserChats = async (userId: string) => {
	const db: Database = getDatabase();
	const ref = db.ref(`userChats/${userId}`);
	const snap = await ref.once("value");
	if (!snap.exists()) return [];

	const userChatMap = snap.val(); // { otherUserId: chatId }

	const chatDataPromises = Object.entries(userChatMap).map(
		async ([otherUserId, chatId]: [string, any]) => {
			const chatSnap = await db.ref(`chats/${chatId}`).once("value");
			if (!chatSnap.exists()) return null;

			const chat = chatSnap.val();
			const participantIds = Object.keys(chat.participants || {});

			const participants = await Promise.all(
				participantIds.map(async (uid) => {
					try {
						const user = await getUserData(uid);
						if (!user) {
							console.warn(`User not found for uid: ${uid}`);
							return { uid, error: "User not found" };
						}
						return { uid, ...user };
					} catch (err) {
						console.warn(`Error fetching user data for uid: ${uid}`, err);
						return { uid, error: "User not found" };
					}
				}),
			);

			return {
				chatId,
				withUser: otherUserId,
				participants, // This will always be an array, even if some are errors
				lastMessage: chat.lastMessage || null,
				readStatus: chat.readStatus?.[userId] || null,
			};
		},
	);

	const results = await Promise.all(chatDataPromises);
	return results.filter((chat) => chat !== null);
};

// Mark chat as read by a user
const markChatAsRead = async (chatId: string, userId: string) => {
	const db: Database = getDatabase();
	const timestamp = Date.now();
	await db.ref(`chats/${chatId}/readStatus/${userId}`).set(timestamp);
	return { success: true, message: "Chat marked as read" };
};

export {
	sendMessage,
	getChatMessages,
	getUserChats,
	markChatAsRead,
	getOrCreateChatId,
};
