import {
	getDatabase,
	type Database,
	type DataSnapshot,
} from "firebase-admin/database";
import type { FamilleyPostData } from "../utils/interfaces";
import logger from "../utils/logger";
import { getUserData } from "./accounts";
import { getComments, getLikes } from "./posts";

const getFamilies = async (userId: string) => {
	try {
		const db: Database = getDatabase();

		const [usersSnap, postsSnap, likesSnap, commentsSnap, followingSnap] =
			await Promise.all([
				db.ref("users").once("value"),
				db.ref("posts").once("value"),
				db.ref("likes").once("value"),
				db.ref("comments").once("value"),
				db.ref(`following/${userId}`).once("value"),
			]);

		if (!usersSnap.exists()) {
			return {
				success: true,
				message: "No families found",
				user: null,
				families: [],
			};
		}

		const users = usersSnap.val() as Record<string, any>;
		const posts = postsSnap.exists() ? postsSnap.val() : {};
		const likesData = likesSnap.exists() ? likesSnap.val() : {};
		const commentsData = commentsSnap.exists() ? commentsSnap.val() : {};
		const followingData = followingSnap.exists() ? followingSnap.val() : {};
		console.log(JSON.stringify(followingData, null, 2));
		interface Stats {
			id: string;
			user: any;
			totalPosts: number;
			totalLikes: number;
			totalComments: number;
			totalEngagement: number;
		}

		const statsMap: Record<string, Stats> = {};

		for (const [postId, post] of Object.entries(posts)) {
			const uid = post.uid;
			if (!uid) continue;

			const postLikes = likesData[postId] ?? {};
			const postComments = commentsData[postId] ?? {};
			const likeCount = Object.keys(postLikes).length;
			const commentCount = Object.keys(postComments).length;

			if (!statsMap[uid]) {
				statsMap[uid] = {
					id: uid,
					user: users[uid] ?? {},
					totalPosts: 0,
					totalLikes: 0,
					totalComments: 0,
					totalEngagement: 0,
				};
			}

			statsMap[uid].totalPosts += 1;
			statsMap[uid].totalLikes += likeCount;
			statsMap[uid].totalComments += commentCount;
			statsMap[uid].totalEngagement += likeCount + commentCount;
		}

		// Exclude the current user from the family list
		const families = Object.values(statsMap)
			.filter((s) => s.id !== userId)
			.map((s) => {
				console.log(
					`Checking if user ${userId} is following ${s.id}:`,
					!!followingData[s.id],
				);
				return {
					id: s.id,
					...s.user,
					totalPosts: s.totalPosts,
					totalLikes: s.totalLikes,
					totalComments: s.totalComments,
					totalEngagement: s.totalEngagement,
					isFollowing: !!followingData[s.id] || false,
				};
			})
			.sort((a, b) => b.totalEngagement - a.totalEngagement);

		// User's profile
		const user = users[userId] ?? null;

		return {
			success: true,
			message: "Families ranked and fetched",
			families,
		};
	} catch (e) {
		logger.error(`getFamilies error`, e);
		return {
			success: false,
			message: "Internal error",
			user: null,
			families: [],
		};
	}
};

const followFamily = async (followerUid: string, followingUid: string) => {
	const db = getDatabase();
	const updates: any = {};
	updates[`following/${followerUid}/${followingUid}`] = true;
	updates[`followers/${followingUid}/${followerUid}`] = true;

	try {
		await db.ref().update(updates);
		return { success: true, message: "Followed successfully" };
	} catch (e) {
		logger.error("followUser error", e);
		return { success: false, message: "Failed to follow user" };
	}
};

const unfollowFamily = async (followerUid: string, followingUid: string) => {
	const db = getDatabase();
	const updates: any = {};
	updates[`following/${followerUid}/${followingUid}`] = null;
	updates[`followers/${followingUid}/${followerUid}`] = null;

	try {
		await db.ref().update(updates);
		return { success: true, message: "Unfollowed successfully" };
	} catch (e) {
		logger.error("unfollowUser error", e);
		return { success: false, message: "Failed to unfollow user" };
	}
};

const searchFamilies = async (search: string) => {
	try {
		const db: Database = getDatabase();
		const ref = db.ref(`users`);
		const snapshot: DataSnapshot = await ref.once("value");

		if (!snapshot.exists()) {
			return {
				success: true,
				message: "No families found",
				families: [],
			};
		}

		const users = snapshot.val();
		const families = Object.entries(users)
			.map(([id, user]: [string, any]) => ({ id, ...user }))
			.filter((user) =>
				user.familyName?.toLowerCase().includes(search.toLowerCase()),
			);

		return {
			success: true,
			message: "Families fetched",
			families,
		};
	} catch (e) {
		logger.error(`searchFamilies action`, e);
		return {
			success: false,
			message: "Internal error",
			families: [],
		};
	}
};

const getFamilyPosts = async (uid: string) => {
	try {
		const db: Database = getDatabase();

		// 1. Fetch all posts
		const postsSnap = await db.ref("posts").once("value");
		if (!postsSnap.exists()) {
			return { success: true, message: "No posts found", posts: [] };
		}

		// 2. Filter posts by uid
		const allPosts = postsSnap.val();
		const filteredPosts = Object.entries(allPosts).filter(
			([_, post]: [string, any]) => post.uid === uid,
		);

		// 3. Fetch likes, comments, and views in batch
		const [likesSnap, commentsSnap, viewsSnap] = await Promise.all([
			db.ref("likes").once("value"),
			db.ref("comments").once("value"),
			db.ref("postViews").once("value"),
		]);

		const likesData = likesSnap.exists() ? likesSnap.val() : {};
		const commentsData = commentsSnap.exists() ? commentsSnap.val() : {};
		const viewsData = viewsSnap.exists() ? viewsSnap.val() : {};

		// 4. Assemble final posts with score
		const posts = await Promise.all(
			filteredPosts.map(async ([postId, post]: [string, any]) => {
				const likesList = likesData[postId]
					? Object.keys(likesData[postId])
					: [];

				const commentList = commentsData[postId]
					? Object.values(commentsData[postId])
					: [];

				const views = viewsData[postId]?.count || 0;

				const user = await getUserData(post.uid); // optional: cache this
				const hasUserLiked = likesList.includes(uid);

				const score =
					likesList.length * 2 + commentList.length * 1.5 + views * 1;

				return {
					postId,
					...post,
					user,
					hasUserLiked,
					likes: likesList.length,
					commentsCount: commentList.length,
					views,
					score,
				};
			}),
		);

		posts.sort((a, b) => b.score - a.score);

		return {
			success: true,
			message: "Posts fetched",
			posts,
		};
	} catch (e) {
		logger.error(`getFamilyPosts error`, e);
		return {
			success: false,
			message: "Internal error",
			posts: [],
		};
	}
};
const recordPostView = async (postId: string) => {
	try {
		const db = getDatabase();
		const ref = db.ref(`postViews/${postId}/count`);
		await ref.transaction((current) => (current || 0) + 1);
		return { success: true, message: "Post view recorded" };
	} catch (e) {
		logger.error("recordPostView error", e);
		return { success: false, message: "Failed to record post view" };
	}
};

export {
	getFamilies,
	getFamilyPosts,
	searchFamilies,
	followFamily,
	unfollowFamily,
	recordPostView,
};
