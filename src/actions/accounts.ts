import {
	getDatabase,
	type Database,
	type DataSnapshot,
	type FirebaseDatabaseError,
	type Reference,
} from "firebase-admin/database";
import type {
	DummyAccount,
	FamilleyData,
	FamilleyRegistrationData,
	GetUserMiddleware,
} from "../utils/interfaces";
import logger from "../utils/logger";
import type { FirebaseError } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

const checkIfUserExist = async (data: FamilleyData): Promise<boolean> => {
	try {
		const auth = getAuth();

		// 1. Check by email
		if (data.email) {
			try {
				await auth.getUserByEmail(data.email);
				logger.info(`User with email ${data.email} already exists`);
				return true;
			} catch (error: any) {
				if (error.code !== "auth/user-not-found") {
					throw error;
				}
			}
		}

		// 2. Check by phone
		if (data.phone) {
			try {
				await auth.getUserByPhoneNumber(data.phone);
				logger.info(`User with phone ${data.phone} already exists`);
				return true;
			} catch (error: any) {
				if (error.code !== "auth/user-not-found") {
					throw error;
				}
			}
		}

		// ✅ If no matches found
		return false;
	} catch (e) {
		logger.error(`checkIfUserExist Error`, e);
		return false;
	}
};

const getUserData = async (id: string) => {
	try {
		const db: Database = getDatabase();
		const userRef = db.ref(`users/${id}`);
		const followingRef = db.ref(`following/${id}`);
		const followersRef = db.ref(`followers/${id}`);

		// Fetch user, following, and followers in parallel
		const [userSnap, followingSnap, followersSnap] = await Promise.all([
			userRef.once("value"),
			followingRef.once("value"),
			followersRef.once("value"),
		]);

		if (!userSnap.exists()) {
			throw new Error("User does not exist");
		}

		const { password, confirmPassword, ...userWithoutPassword } =
			userSnap.val();

		// Count following and followers
		const followingCount = followingSnap.exists()
			? Object.keys(followingSnap.val()).length
			: 0;
		const followersCount = followersSnap.exists()
			? Object.keys(followersSnap.val()).length
			: 0;

		return {
			...userWithoutPassword,
			followingCount,
			followersCount,
		};
	} catch (e: any) {
		logger.error(`getUserData Action`, e);
		throw new Error(e); // Or handle the error as appropriate
	}
};

const registerUser = async (
	user: FamilleyRegistrationData,
): Promise<string | null> => {
	try {
		if (await checkIfUserExist(user)) {
			logger.info("User already exists, skipping registration.");
			return null;
		}
		const auth = getAuth();
		const createdUser = await auth.createUser({
			email: user.email,
			phoneNumber: user.phone,
			displayName: `${user.familyName}`,
			password: user.password,
			emailVerified: false,
			disabled: false,
		});
		const { password, confirmPassword, ...userWithoutPassword } = user;
		const updateResult = await updateUser(createdUser.uid, userWithoutPassword);

		if (!updateResult?.success) {
			// Rollback: delete the Auth user if DB update fails
			await auth.deleteUser(createdUser.uid);
			logger.error("registerUser Error: DB update failed, user rolled back");
			return null;
		}

		const token = await auth.createCustomToken(createdUser.uid);
		logger.info(`User ${createdUser.uid} created successfully.`);
		return token;
	} catch (e) {
		logger.error("registerUser Error", e);
		return null;
	}
};
const updateUser = async (userId: string, updateData: FamilleyData) => {
	try {
		const result = await getUserData(userId);
		if (!result) {
			return { success: false, message: "User does not exist" };
		}
		const db: Database = getDatabase();
		const ref = db.ref(`users/${userId}`);
		await ref.update(updateData);
		return { success: true, message: "User updated" };
	} catch (e) {
		logger.error(`updateUser Action`, e);
		return { success: false, message: "Failed to update user" };
	}
};

export { checkIfUserExist, registerUser, updateUser, getUserData };
