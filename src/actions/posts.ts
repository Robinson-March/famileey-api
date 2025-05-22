import {
	getDatabase,
	type Database,
	type DataSnapshot,
} from "firebase-admin/database";
import type { FamilleyPostData } from "../utils/interfaces";
import logger from "../utils/logger";
import { getUserData } from "./accounts";

const getPosts = async () => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`posts`);
		const snapshot: DataSnapshot = await ref
			.orderByChild("timestamp")
			.once("value");

		if (!snapshot.exists()) {
			return {
				success: true,
				message: "No posts found",
				posts: [],
			};
		}

		const postEntries = Object.entries(snapshot.val());

		const posts = await Promise.all(
			postEntries
				.map(async ([postId, value]: [string, any]) => {
					const user = await getUserData(value.uid);
					const { hasUserLiked, likes } = await getLikes(postId, value.uid);
					const { comments } = await getComments(postId);

					return {
						postId, // Include the postId
						...value,
						user,
						hasUserLiked,
						likes,
						commentsCount: comments.length, // Fixed: use `commentsCount` for the length
					};
				}), // Reverse the order of posts,
		);

		return {
			success: true,
			message: "Posts fetched",
			posts,
		};
	} catch (e) {
		logger.error(`getposts action`, e);
		return {
			success: false,
			message: "Internal error",
			posts: [],
		};
	}
};

const uploadPost = async (postData: FamilleyPostData) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`posts/`).push();
		await ref.set(postData);
		return { success: true, message: "Post Updated" };
	} catch (e) {
		logger.error(`Upload post action`, e);
	}
};
const likePost = async (postData: {
	postid: string;
	timestamp: {};
	uid: any;
}) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`likes/${postData.postid}/${postData.uid}`);
		await ref.set(postData);
		return { success: true, message: "Post Liked" };
	} catch (e) {
		logger.error(`Like post action`, e);
	}
};
const unlikePost = async (postid: string, uid: string) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`likes/${postid}`);
		const snapshot: DataSnapshot = await ref.once("value");

		if (!snapshot.exists()) {
			return {
				success: false,
				message: "Post does not exist",
			};
		}

		const likeExists = snapshot.hasChild(uid);

		if (!likeExists) {
			return {
				success: false,
				message: "User has not liked this post",
			};
		}

		// ✅ Delete the specific UID without affecting others
		await ref.child(uid).remove();

		return {
			success: true,
			message: "Like removed successfully",
		};
	} catch (e) {
		logger.error(`Unlike post action`, e);
		return {
			success: false,
			message: "Error while unliking post",
		};
	}
};

const getLikes = async (postid: string, uid: string) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`likes/${postid}`);

		const snapshot: DataSnapshot = await ref.once("value");
		if (!snapshot.exists()) {
			return {
				success: false,
				message: "Post does not exist",
				hasUserLiked: false,
				likes: 0,
			};
		}

		const likes = snapshot.numChildren();
		const hasUserLiked = snapshot.hasChild(uid);

		return { success: true, hasUserLiked, likes };
	} catch (e) {
		logger.error(`Like post action`, e);
		return {
			success: false,
			message: "Internal error",
			hasUserLiked: false,
			likes: 0,
		};
	}
};
const addComment = async (commentData: {
	uid: string;
	comment: string;
	postid: string;
	timestamp: {};
}) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`comments/${commentData.postid}`).push();
		await ref.set(commentData);
		return { success: true, message: "Comment posted" };
	} catch (e) {
		logger.error(`Comment add action`, e);
	}
};
const deleteComment = async (postid: string, commentid: string) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`comments/${postid}/${commentid}`);
		await ref.remove();
		return { success: true, message: "Comment deleted" };
	} catch (e) {
		logger.error(`Comment remove action`, e);
	}
};

const getComments = async (postid: string) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`comments/${postid}`).orderByChild("timestamp");
		const snapshot: DataSnapshot = await ref.once("value");

		if (!snapshot.exists()) {
			return {
				success: true,
				message: "No comments found",
				comments: [],
			};
		}

		const commentEntries = Object.entries(snapshot.val());

		const comments = await Promise.all(
			commentEntries
				.map(async ([_, value]: [string, any]) => {
					const user = await getUserData(value.uid);
					return {
						...value,
						user,
					};
				})
				.reverse(), // Reverse the order of comments,
		);

		return {
			success: true,
			message: "Comments fetched",
			comments,
		};
	} catch (e) {
		logger.error(`getComments action`, e);
		return {
			success: false,
			message: "Internal error",
			comments: [],
		};
	}
};

export {
	uploadPost,
	likePost,
	getLikes,
	unlikePost,
	addComment,
	deleteComment,
	getComments,
	getPosts,
};
