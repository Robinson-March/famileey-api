import {
	getDatabase,
	ServerValue,
	type Database,
} from "firebase-admin/database";
import { v4 as uuidv4 } from "uuid";
import { getUserData } from "./accounts"; // Adjust path as needed
import { addNotification } from "./notifications";

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

        // Check if recipient is currently in the chat
        const inChatSnap = await db.ref(`inChat/${recipientId}/${chatId}`).once("value");
        const inChat = inChatSnap.exists() ? !!inChatSnap.val() : false;

        if (recipientId !== senderId && inChat == false) {
            const fromUser = await getUserData(senderId);
await addNotification(
    recipientId,
    "message",
    senderId,
    "You have a new message",
    { chatId },
    { photoUrl: fromUser.photoUrl }
);
        }
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
    const chats: any[] = [];

    // 1-on-1 chats
    const userChatsSnap = await db.ref(`userChats/${userId}`).once("value");
    if (userChatsSnap.exists()) {
        const userChatMap = userChatsSnap.val(); // { otherUserId: chatId }
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
                                return { uid, error: "User not found" };
                            }
                            return { uid, ...user };
                        } catch (err) {
                            return { uid, error: "User not found" };
                        }
                    }),
                );

                // Determine read status for DM
                const lastTimestamp = chat.lastMessage?.timestamp || 0;
                const userReadTimestamp = chat.readStatus?.[userId] || 0;
                const readStatus = userReadTimestamp >= lastTimestamp;

                return {
                    chatId,
                    withUser: otherUserId,
                    participants,
                    lastMessage: chat.lastMessage || null,
                    readStatus, // true if user has read latest message
                    isGroup: false,
                    lastTimestamp,
                };
            },
        );
        chats.push(...(await Promise.all(chatDataPromises)).filter(Boolean));
    }

    // Group chats
    const groupRef = db.ref(`userGroups/${userId}`);
    const groupSnap = await groupRef.once("value");
    if (groupSnap.exists()) {
        const groupMap = groupSnap.val(); // { groupId: { isBroadcastGroup: true/false } }
        const groupDataPromises = Object.keys(groupMap).map(
            async (groupId: string) => {
                const groupChatSnap = await db.ref(`groupChats/${groupId}`).once("value");
                if (!groupChatSnap.exists()) return null;
                const group = groupChatSnap.val();
                const participantIds = Object.keys(group.participants || {});
                const participants = await Promise.all(
                    participantIds.map(async (uid) => {
                        try {
                            const user = await getUserData(uid);
                            if (!user) {
                                return { uid, error: "User not found" };
                            }
                            return { uid, ...user };
                        } catch (err) {
                            return { uid, error: "User not found" };
                        }
                    }),
                );
                // Determine read status for group
                const lastTimestamp = group.lastMessage?.timestamp || 0;
                const userReadTimestamp = group.lastMessage?.readStatus?.[userId] || 0;
                const readStatus = userReadTimestamp >= lastTimestamp;

                return {
                    groupId,
                    groupName: group.groupName,
                    participants,
                    lastMessage: group.lastMessage || null,
                    readStatus, // true if user has read latest message
                    isGroup: true,
                    isBroadcastGroup: !!group.isBroadcastGroup,
                    admin: group.admin,
                    lastTimestamp,
                };
            }
        );
        chats.push(...(await Promise.all(groupDataPromises)).filter(Boolean));
    }

    // Sort all chats by last message timestamp (descending)
    chats.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

    return chats;
};

// Mark chat as read by a user
const markChatAsRead = async (
	chatId: string,
	messageId: string,
	userId: string,
) => {
	const db: Database = getDatabase();

	// Fetch the message to check the sender
	const messageSnap = await db
		.ref(`chats/${chatId}/messages/${messageId}`)
		.once("value");
	if (!messageSnap.exists()) {
		return { success: false, message: "Message not found" };
	}
	const message = messageSnap.val();

	// Do not mark as read if user is the sender
	if (message.senderId === userId) {
		return {
			success: false,
			message: "Sender should not mark their own message as read",
		};
	}

	const timestamp = Date.now();

	// Update the readStatus for the specific message
	await db
		.ref(`chats/${chatId}/messages/${messageId}/readStatus/${userId}`)
		.set(timestamp);

	// Update the readStatus for the chat's lastMessage
	await db
		.ref(`chats/${chatId}/lastMessage/readStatus/${userId}`)
		.set(timestamp);

	// Update the general readStatus for the chat
	await db.ref(`chats/${chatId}/readStatus/${userId}`).set(timestamp);

	return { success: true, message: "Chat marked as read" };
};
const setInChatStatus = async (userId: string, chatId: string, status: boolean) => {
    const db: Database = getDatabase();
    try {
        await db.ref(`inChat/${userId}/${chatId}`).set(status);
        return { success: true, inChat: status };
    } catch (e) {
        console.error("Failed to update inChat status", e);
        return { success: false, message: "Failed to update inChat status" };
    }
};

const getOrCreateBroadcastGroup = async (adminId: string) => {
    const db: Database = getDatabase();
    // Try to get existing groupId
    let groupIdSnap = await db.ref(`userGroups/${adminId}`).orderByChild('isBroadcastGroup').equalTo(true).once("value");
    let groupId: string | undefined;
    if (groupIdSnap.exists()) {
        // Find the broadcast group for this admin
        const groups = groupIdSnap.val();
        for (const [gid, val] of Object.entries(groups)) {
            const groupSnap = await db.ref(`groupChats/${gid}`).once("value");
            if (groupSnap.exists() && groupSnap.val().admin === adminId && groupSnap.val().isBroadcastGroup) {
                groupId = gid;
                break;
            }
        }
    }

    // If found, ensure all current followers are participants
    if (groupId) {
        const followersSnap = await db.ref(`followers/${adminId}`).once("value");
        const followers = followersSnap.exists() ? Object.keys(followersSnap.val()) : [];
        const groupParticipantsSnap = await db.ref(`groupChats/${groupId}/participants`).once("value");
        const groupParticipants = groupParticipantsSnap.exists() ? groupParticipantsSnap.val() : {};
        const updates: any = {};
        followers.forEach(fid => {
            if (!groupParticipants[fid]) {
                updates[`groupChats/${groupId}/participants/${fid}`] = true;
                updates[`userGroups/${fid}/${groupId}`] = { isBroadcastGroup: true };
            }
        });
        if (Object.keys(updates).length > 0) {
            await db.ref().update(updates);
        }
        return groupId;
    } else {
        // Create new group
        const followersSnap = await db.ref(`followers/${adminId}`).once("value");
        const followers = followersSnap.exists() ? Object.keys(followersSnap.val()) : [];
        const adminUser = await getUserData(adminId);
        const newGroupId = uuidv4();
        const participants = {
            [adminId]: true,
            ...Object.fromEntries(followers.map(fid => [fid, true])),
        };
        const groupData = {
            groupName: `${adminUser.familyName}'s Family`,
            admin: adminId,
            participants,
            createdAt: Date.now(),
            isBroadcastGroup: true,
        };
        const updates: any = {};
        updates[`groupChats/${newGroupId}`] = groupData;
        updates[`userGroups/${adminId}/${newGroupId}`] = { isBroadcastGroup: true };
        followers.forEach(fid => {
            updates[`userGroups/${fid}/${newGroupId}`] = { isBroadcastGroup: true };
        });
        await db.ref().update(updates);
        return newGroupId;
    }
};

const sendGroupMessage = async (
    senderId: string,
    groupId: string,
    text: string,
    type: "text" | "image" = "text"
) => {
    const db: Database = getDatabase();
    // Check if sender is a participant
    const groupSnap = await db.ref(`groupChats/${groupId}/participants/${senderId}`).once("value");
    if (!groupSnap.exists()) {
        return { success: false, message: "You are not a participant in this group." };
    }
    const messageId = uuidv4();
    const timestamp = ServerValue.TIMESTAMP;
    const message = {
        senderId,
        text,
        timestamp,
        type,
        status: "sent",
        isGroup: true,
    };
    await db.ref(`groupChats/${groupId}/messages/${messageId}`).set(message);
    await db.ref(`groupChats/${groupId}/lastMessage`).set({ text, timestamp, senderId });
    return { success: true, groupId, messageId };
};
const broadcastGroupMessage = async (
    adminId: string,
    text: string,
    type: "text" | "image" = "text"
) => {
    const groupId = await getOrCreateBroadcastGroup(adminId);
    // Only admin can broadcast
    const groupSnap = await getDatabase().ref(`groupChats/${groupId}`).once("value");
    if (!groupSnap.exists() || groupSnap.val().admin !== adminId) {
        return { success: false, message: "Only the admin can broadcast to this group." };
    }
    const sendResult = await sendGroupMessage(adminId, groupId, text, type);

    // Notify all followers (except admin)
    const db: Database = getDatabase();
    const group = groupSnap.val();
    const adminUser = await getUserData(adminId);
    for (const uid of Object.keys(group.participants || {})) {
        if (uid !== adminId) {
            await addNotification(
                uid,
                "broadcast-message",
                adminId,
                `New message from ${group.groupName}`,
                { groupId, messageId: sendResult.messageId, text, type },
                { photoUrl: adminUser.photoUrl }
            );
        }
    }
    return sendResult;
};
const readGroupMessage = async (
    groupId: string,
    messageId: string,
    userId: string
) => {
    const db: Database = getDatabase();

    // Fetch the message to check the sender
    const messageSnap = await db
        .ref(`groupChats/${groupId}/messages/${messageId}`)
        .once("value");
    if (!messageSnap.exists()) {
        return { success: false, message: "Message not found" };
    }
    const message = messageSnap.val();

    // Do not mark as read if user is the sender
    if (message.senderId === userId) {
        return {
            success: false,
            message: "Sender should not mark their own message as read",
        };
    }

    const timestamp = Date.now();

    // Update the readStatus for the specific message
    await db
        .ref(`groupChats/${groupId}/messages/${messageId}/readStatus/${userId}`)
        .set(timestamp);

    // Optionally, update the readStatus for the group's lastMessage
    await db
        .ref(`groupChats/${groupId}/lastMessage/readStatus/${userId}`)
        .set(timestamp);

    return { success: true, message: "Group message marked as read" };
};
export {
	sendMessage,
	getChatMessages,
	getUserChats,
	markChatAsRead,
	getOrCreateChatId,
	setInChatStatus,
	broadcastGroupMessage,
    sendGroupMessage,
    getOrCreateBroadcastGroup,
    readGroupMessage
};
