import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
const {
  setupKinde,
  protectRoute,
  getUser,
  GrantType,
} = require("@kinde-oss/kinde-node-express");
import morgan from "morgan";

import admin from "firebase-admin";
import errorHandler from "./src/middlewares/errorHandler";
import accountRouter from "./src/routes/accountRouter";
import logger from "./src/utils/logger";

const app = express();
const PORT = process.env.PORT || 4010;
const serviceAccount = "./xx.json";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});
const config = {
  clientId: process.env.KINDE_CLIENT_ID,
  issuerBaseUrl: process.env.KINDE_ISSUER_URL,
  siteUrl: process.env.KINDE_SITE_URL || "http://localhost:4010",
  secret: process.env.KINDE_CLIENT_SECRET,
  redirectUrl: `${process.env.KINDE_SITE_URL}/callback`,
  scope: "openid profile email",
  grantType: GrantType.AUTHORIZATION_CODE,
  unAuthorisedUrl: `${process.env.KINDE_SITE_URL}/unauthorised`,
  postLogoutRedirectUrl: `${process.env.KINDE_SITE_URL}/logout`,
};

setupKinde(config, app);
// Middleware
app.use(helmet()); // Security headers
// app.use(cors({ origin: "*" })); // Enable CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // Form URL-encoded body parser
const allowedOrigins = ["http://localhost:4010", process.env.ALLOWED];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  morgan("combined", { stream: { write: (message) => logger.info(message) } })
); // Request logging

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use(limiter);
// Kinde Config

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send({ message: "API is running securely!" });
});

app.use("/accounts", protectRoute, getUser, accountRouter);

// ❌ 404 Not Found Middleware (Handles Unmatched Routes)
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`🔍 Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// 🛑 Global Error Handling Middleware (Must Be Last!)
app.use(errorHandler);
// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});
