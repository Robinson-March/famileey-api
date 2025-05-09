import {
  getDatabase,
  type Database,
  type DataSnapshot,
} from "firebase-admin/database";
import type { FamilleyPostData } from "../utils/interfaces";
import logger from "../utils/logger";
import { getUserData } from "./accounts";

const getFamilies = async () => {
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

    const families = Object.entries(users).map(([id, user]: [string, any]) => ({
      id,
      ...user,
    }));

    return {
      success: true,
      message: "Families fetched",
      families,
    };
  } catch (e) {
    logger.error(`getFamilies action`, e);
    return {
      success: false,
      message: "Internal error",
      families: [],
    };
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
        user.familyName?.toLowerCase().includes(search.toLowerCase())
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
    const ref = db.ref(`posts`);
    const snapshot: DataSnapshot = await ref.once("value");

    if (!snapshot.exists()) {
      return {
        success: true,
        message: "No posts found",
        posts: [],
      };
    }

    const postEntries = Object.entries(snapshot.val());

    const posts = await Promise.all(
      postEntries.map(async ([_, value]: [string, any]) => {
        if (value.uid == uid) {
          const user = await getUserData(value.uid);
          return {
            ...value,
            user,
          };
        }
      })
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

export { getFamilies, getFamilyPosts, searchFamilies };
