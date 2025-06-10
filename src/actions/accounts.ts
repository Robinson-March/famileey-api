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

const getUserData = async (id: string, requesterId?: string) => {
    try {
        const db: Database = getDatabase();
        const userRef = db.ref(`users/${id}`);
        const followingRef = db.ref(`following/${id}`);
        const followersRef = db.ref(`followers/${id}`);

        const [userSnap, followingSnap, followersSnap] = await Promise.all([
            userRef.once("value"),
            followingRef.once("value"),
            followersRef.once("value"),
        ]);

        if (!userSnap.exists()) {
            throw new Error("User does not exist");
        }

        const { password, confirmPassword, ...userWithoutPassword } = userSnap.val();

        const followingCount = followingSnap.exists()
            ? Object.keys(followingSnap.val()).length
            : 0;
        const followersCount = followersSnap.exists()
            ? Object.keys(followersSnap.val()).length
            : 0;

        let isFollowing = false;
        if (requesterId && requesterId !== id) {
            const requesterFollowingSnap = await db
                .ref(`following/${requesterId}/${id}`)
                .once("value");
            isFollowing = requesterFollowingSnap.exists();
        }

        return {
            ...userWithoutPassword,
            followingCount,
            followersCount,
            uid: id,
            isFollowing,
        };
    } catch (e: any) {
        logger.error(`getUserData Action`, e);
        throw new Error(e);
    }
};

const registerUser = async (
	user: FamilleyRegistrationData,
): Promise<string | null> => {
	try {
		// Step 1: Check if user already exists
		if (await checkIfUserExist(user)) {
			logger.info("User already exists, skipping registration.");
			return null;
		}

		// Step 2: Create user in Firebase Auth
		const auth = getAuth();
		const createdUser = await auth.createUser({
			email: user.email,
			phoneNumber: user.phone,
			displayName: user.familyName,
			password: user.password,
			emailVerified: false,
			disabled: false,
		});

		// Step 3: Remove sensitive fields before saving to DB
		const { password, confirmPassword, ...userWithoutPassword } = user;

		// Step 4: Save user data to Realtime Database
		const db: Database = getDatabase();
		const userRef = db.ref(`users/${createdUser.uid}`);
		await userRef.update(userWithoutPassword);

		// Step 5: Generate custom token
		const token = await auth.createCustomToken(createdUser.uid);
		logger.info(`User ${createdUser.uid} created and saved successfully.`);
		return token;
	} catch (e: any) {
		logger.error("registerUser Error", e);

		// Optional rollback if Firebase Auth creation succeeded but DB failed
		if (e?.uid) {
			try {
				await getAuth().deleteUser(e.uid);
				logger.warn(`Rolled back Auth user with uid: ${e.uid}`);
			} catch (rollbackError) {
				logger.error("Failed to rollback user from Auth", rollbackError);
			}
		}

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

const saveExpoToken = async (userId: string, expoToken: string) => {
    try {
        const db: Database = getDatabase();
        await db.ref(`expo-tokens/${userId}`).set(expoToken);
        return { success: true, message: "Expo token saved" };
    } catch (e) {
        logger.error("saveExpoToken error", e);
        return { success: false, message: "Failed to save expo token" };
    }
};

export { checkIfUserExist, registerUser, updateUser, getUserData,saveExpoToken };
