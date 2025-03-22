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
import type { GetUserMiddleware } from "../utils/interfaces";

const accountRouter = express.Router();

accountRouter.post(
  "/consent",
  bodyInspector(["bvn", "firstname", "lastname"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await initiateConsentRequest(req.body);
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message,
          error: JSON.parse(result.error),
        });
      }
      res.status(200).json(result);
    } catch (e) {
      logger.error(e);
      next(e); // Pass error to global handler
    }
  }
);

accountRouter.get(
  "/retrievebvn/:reference",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reference = req.params.reference;
      const result = await retrieveBvn(reference);
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message,
          error: JSON.parse(result.error),
        });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (e: any) {
      logger.error("Error in /retrievebvn:", e);
      next(e); // Pass error to global handler
    }
  }
);
accountRouter.post(
  "/generateotp",
  bodyInspector(["phone", "email", "name"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const newBody = {
        length: 7,
        customer: { phone: body.phone, name: body.name, email: body.email },
        medium: ["email", "whatsapp", "sms"],
        expiry: 1,
        sender: "FINSYNC",
        send: true,
      };

      const result = await generateOtp(newBody);

      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message,
          error: JSON.parse(result.error),
        });
      }

      return res.status(200).json({ success: true, data: result.data });
    } catch (e: any) {
      logger.error("Error in /generateotp:", e);
      next(e); // Pass error to global handler
    }
  }
);
accountRouter.get(
  "/generatedva",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user: GetUserMiddleware = req?.user;
      const body = {
        email: user.email,
        first_name: user.given_name,
        middle_name: "",
        last_name: user.family_name,
        phone: "",
        preferred_bank: "test-bank",
        country: "NG",
      };
      const result = await generateDVA(body);

      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message,
          error: JSON.parse(result.error),
        });
      }

      return res.status(200).json({ success: true, data: req.user });
    } catch (e: any) {
      logger.error("Error in /generatedva:", e);
      next(e); // Pass error to global handler
    }
  }
);

accountRouter.post("/webhook", (req: Request, res: Response) => {
  try {
    const event = req.body; // Capture webhook payload

    console.log("Received webhook:", event);

    // Process the webhook event here...

    res.status(200).json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default accountRouter;
