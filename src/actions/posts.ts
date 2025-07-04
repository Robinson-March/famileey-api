import {
	getDatabase,
	type Database,
	type DataSnapshot,
} from "firebase-admin/database";
import type { FamilleyPostData } from "../utils/interfaces";
import logger from "../utils/logger";
import { getUserData } from "./accounts";
import { addNotification } from "./notifications";

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
				})
				.reverse(), // Reverse the order of posts,
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

        // Fetch post to get owner
        const postSnap = await db.ref(`posts/${postData.postid}`).once("value");
        if (postSnap.exists()) {
            const post = postSnap.val();
            if (post.uid !== postData.uid) { // Don't notify self-like
                const fromUser = await getUserData(postData.uid); // Get liker info
                await addNotification(
                    post.uid,
                    "like",
                    postData.uid,
                    "Someone liked your post",
                    { postId: postData.postid },
                    { photoUrl: fromUser.photoUrl } // Include liker photoUrl
                );
            }
        }

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

        // Fetch post to get owner
        const postSnap = await db.ref(`posts/${commentData.postid}`).once("value");
        if (postSnap.exists()) {
            const post = postSnap.val();
            if (post.uid !== commentData.uid) { // Don't notify self-comment
                const fromUser = await getUserData(commentData.uid);
                await addNotification(
                    post.uid, // Notify the post owner
                    "comment",
                    commentData.uid, // Commenter's UID
                    "Someone commented on your post",
                    { postId: commentData.postid },
                    { photoUrl: fromUser.photoUrl } // richContent: commenter's photo
                );
            }
        }

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
const getPostById = async (postId: string) => {
    try {
        const db: Database = getDatabase();
        const postSnap = await db.ref(`posts/${postId}`).once("value");
        if (!postSnap.exists()) {
            return {
                success: false,
                message: "Post not found",
                post: null,
            };
        }
        const post = postSnap.val();
        const user = await getUserData(post.uid);
        const { hasUserLiked, likes } = await getLikes(postId, post.uid);
        const { comments } = await getComments(postId);

        return {
            success: true,
            message: "Post fetched",
            post: {
                postId,
                ...post,
                user,
                hasUserLiked,
                likes,
                commentsCount: comments.length,
              
            },
        };
    } catch (e) {
        logger.error(`getPostById action`, e);
        return {
            success: false,
            message: "Internal error",
            post: null,
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
	getPostById
};
