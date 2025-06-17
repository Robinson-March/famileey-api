import express, {
	type Application,
	type Request,
	type Response,
	type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import morgan from "morgan";

import admin from "firebase-admin";
import errorHandler from "./src/middlewares/errorHandler";
import accountRouter from "./src/routes/accountRouter";
import logger from "./src/utils/logger";
import { verifyFirebaseToken } from "./src/middlewares/verifyFirebaseToken";
import postsRouter from "./src/routes/postsRouter";
import { familyRouter } from "./src/routes/familyRouter";
import messagingRouter from "./src/routes/messagingRouter";
import notificationRouter from "./src/routes/notificationRouter";
import { getUserData } from "./src/actions/accounts";

const app = express();
const PORT = process.env.PORT || 4011;
const serviceAccount = "./xx.json";
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: process.env.DATABASE_URL,
});
const router = express.Router();
// Middleware
app.use(helmet()); // Security headers
// app.use(cors({ origin: "*" })); // Enable CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // Form URL-encoded body parser
app.use(express.static('public')); // Serve static files from the 'public' directory
const allowedOrigins = ["http://localhost:4011", process.env.ALLOWED];
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
	}),
);

app.use(
	morgan("combined", { stream: { write: (message) => logger.info(message) } }),
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
app.get("/api", (req: Request, res: Response) => {
	res.send({ message: "API is running securely!" });
});
// Example Express route
router.get("/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const user = await getUserData(userId);
    if (!user) return res.status(404).send("User not found");

    // Always serve HTML with Open Graph tags for social preloading
    res.setHeader("Content-Type", "text/html");
    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Famileey | ${user.familyName}'s Profile</title>
            <meta property="og:title" content="Famileey | ${user.familyName}'s Profile" />
            <meta property="og:description" content="${user.bio || "View my Famileey profile!"}" />
            <meta property="og:image" content="${user.photoUrl || "https://famileey.com/logo.jpg"}" />
            <meta property="og:type" content="profile" />
            <meta property="og:url" content="https://famileey.com/profile/${userId}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Famileey | ${user.familyName}'s Profile" />
            <meta name="twitter:description" content="${user.bio || "View my Famileey profile!"}" />
            <meta name="twitter:image" content="${user.photoUrl || "https://famileey.com/logo.jpg"}" />
        
        </head>
        <body>
            <h1>${user.familyName}'s Famileey Profile</h1>
            <img src="${user.photoUrl || "https://famileey.com/logo.jpg"}" alt="Profile Photo" style="max-width:200px;">
            <p>${user.bio || ""}</p>
         
        </body>
        </html>
    `);
});

// Mount the router to make /profile/:userId and other routes on it accessible
app.use(router);

// Mount other specific routers
app.use("/api/accounts", accountRouter);
app.use("/api/posts", verifyFirebaseToken, postsRouter);
app.use("/api/families", verifyFirebaseToken, familyRouter);
app.use("/api/messaging", verifyFirebaseToken, messagingRouter);
app.use("/api/notifications", verifyFirebaseToken, notificationRouter);

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
