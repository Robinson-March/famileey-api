import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import logger from "../utils/logger";
import {
  generateDVA,
  generateOtp,
  initiateConsentRequest,
  retrieveBvn,
} from "../services/accounts";
import bodyInspector from "../middlewares/bodyInspector";
import { getUser, protectRoute } from "@kinde-oss/kinde-node-express";
import type {
  GetUserMiddleware,
  FamilleyData,
  FamilleyRegistrationData,
} from "../utils/interfaces";
import { getUserData, registerUser, updateUser } from "../actions/accounts";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken";
import { getAuth } from "firebase-admin/auth";

const accountRouter = express.Router();

// ✅ Register route
accountRouter.post(
  "/register",
  bodyInspector([
    "familyName",
    "nativeOf",
    "district",
    "province",
    "country",
    "residence",
    "email",
    "phone",
    "occupation",
    "worksAt",
    "password",
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: FamilleyRegistrationData = req.body;

      const token = await registerUser(data);
      if (!token) {
        res.status(409).json({
          success: false,
          message: "User already exists or registration failed",
        });
        return;
      }

      res.status(201).json({
        success: true,
        token,
        message: "User registered successfully",
      });
      return;
    } catch (e) {
      logger.error("Error in /register:", e);
      next(e);
    }
  }
);
accountRouter.post("/custom-token", async (req: Request, res: Response) => {
  const { uid } = req.body;

  if (!uid) {
    res.status(400).json({ error: "Missing UID in request body" });
    return
  }

  try {
    const token = await getAuth().createCustomToken(uid);
    res.json({ success: true, token });
    return
  } catch (error) {
    logger.error("Error creating custom token", error);
    res.status(500).json({ error: "Failed to create custom token" });
    return
  }
});
accountRouter.get(
  "/user",
  verifyFirebaseToken,
  async (req: Request, res: Response) => {
    const { uid } = req.user;

    try {
      const result = await getUserData(uid);
      res.json({ success: true, result });
      return;
    } catch (error) {
      logger.error("Error creating custom token", error);
      res.status(500).json({ error: "Failed to create custom token" });
      return;
    }
  }
);

// 🛠 Update account route
accountRouter.put(
  "/updateaccount",
  verifyFirebaseToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req?.user.uid;
      const body = req.body;

      if (!body || typeof body !== "object") {
        res.status(400).json({
          success: false,
          message: "Invalid update data format",
        });
        return;
      }
      const guidedInput = [
        "familyName",
        "nativeOf",
        "district",
        "province",
        "country",
        "residence",
        "occupation",
        "worksAt",
        "photoUrl",
      ];

      const bodyKeys = Object.keys(body);

      // If any key in the body is not in the allowed list, throw error
      const invalidKeys = bodyKeys.filter((key) => !guidedInput.includes(key));

      if (invalidKeys.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid field(s): ${invalidKeys.join(
            ", "
          )}. Only these fields are allowed: ${guidedInput.join(", ")}.`,
        });
        return;
      }

      const result = await updateUser(user, body);

      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Failed to update user",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in /updateaccount:", e);
      next(e); // Pass error to global handler
    }
  }
);

// 📩 Webhook route
accountRouter.post("/webhook", (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log("Received webhook:", event);
    res.status(200).json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default accountRouter;
