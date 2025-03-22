import {
  getDatabase,
  type Database,
  type DataSnapshot,
  type FirebaseDatabaseError,
  type Reference,
} from "firebase-admin/database";
import type { DummyAccount, GetUserMiddleware } from "../utils/interfaces";
import logger from "../utils/logger";
import type { FirebaseError } from "firebase-admin";

const checkIfUserExist = async (id: string) => {
  try {
    const db: Database = getDatabase();
    const ref = db.ref(`users/${id}`);
    const snapshot = await ref.once("value"); // Use await here
    return snapshot.exists(); // Return true or false based on existence
  } catch (e) {
    logger.error(`checkIfUserExist Action`, e);
    return false; // Or handle the error as appropriate
  }
};
const checkIfAccountExist = async (
  id: string,
  account_number: string
): Promise<boolean> => {
  try {
    const db: Database = getDatabase();
    const ref: Reference = db.ref(`dummy_account/${id}`);
    const snapshot: DataSnapshot = await ref.once("value");

    if (!snapshot.exists()) return false;

    return Object.values(snapshot.val()).some(
      (data: any) => data.account_number === account_number
    );
  } catch (e) {
    logger.error(`checkIfAccountExist Action`, e);
    return false;
  }
};

const getUserData = async (id: string) => {
  try {
    const db: Database = getDatabase();
    const ref = db.ref(`users/${id}`);
    const snapshot: DataSnapshot = await ref.once("value"); // Use await here
    if (!snapshot.exists()) {
      throw new Error("User does not exist");
    }
    return snapshot.val();
  } catch (e: any) {
    logger.error(`getUserData Action`, e);
    throw new Error(e); // Or handle the error as appropriate
  }
};
const saveUserAccount = async (id: string, data: DummyAccount) => {
  try {
    const accountExists = await checkIfAccountExist(id, data.account_number);
    if (accountExists) {
      return {
        success: false,
        status: 422,
        message: "Account already exists",
        error: "duplicates",
      };
    }

    const db: Database = getDatabase();
    const ref = db.ref(`dummy_account/${id}/${data.account_number}`);
    await ref.set(data);

    return {
      success: true,
      status: 201,
      message: "Account created",
      data,
    };
  } catch (e: any) {
    logger.error(`saveUserAccount Action`, e);
    throw new Error(e);
  }
};

const registerUser = async (user: GetUserMiddleware) => {
  try {
    if (await checkIfUserExist(user.id)) {
      return;
    }
    const db: Database = getDatabase();
    const ref = db.ref(`users/${user.id}`);
    await ref.set(user);
    return;
  } catch (e) {
    logger.error(`registerUser Action`, e);
  }
};
const updateUser = async (userId: string, updateData: any) => {
  try {
    const result = await checkIfUserExist(userId);
    if (!result) {
      return { success: true, message: "User does not exist" };
    }
    const db: Database = getDatabase();
    const ref = db.ref(`users/${userId}`);
    await ref.update(updateData);
    return { success: true, message: "User updated" };
  } catch (e) {
    logger.error(`updateUser Action`, e);
  }
};

export {
  checkIfUserExist,
  registerUser,
  updateUser,
  getUserData,
  saveUserAccount,
};
