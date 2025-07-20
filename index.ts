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
import adminRouter from "./src/routes/adminRouter";

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
// /post/:postid Open Graph route for posts
import { getPostById } from "./src/actions/posts";
router.get("/post/:postid", async (req, res) => {
    const { postid } = req.params;
    const result = await getPostById(postid);
    if (!result.success || !result.post) return res.status(404).send("Post not found");
    const post = result.post;
    const user = post.user;

    res.setHeader("Content-Type", "text/html");
    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Famileey | ${user.familyName}'s Post</title>
            <meta property="og:title" content="Famileey | ${user.familyName}'s Post" />
            <meta property="og:description" content="${post.text || post.caption || "View this Famileey post!"}" />
            <meta property="og:image" content="${post.photoUrl || user.photoUrl || "https://famileey.com/logo.jpg"}" />
            <meta property="og:type" content="article" />
            <meta property="og:url" content="https://famileey.com/post/${postid}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Famileey | ${user.familyName}'s Post" />
            <meta name="twitter:description" content="${post.text || post.caption || "View this Famileey post!"}" />
            <meta name="twitter:image" content="${post.photoUrl || user.photoUrl || "https://famileey.com/logo.jpg"}" />
        </head>
        <body>
            <h1>${user.familyName}'s Famileey Post</h1>
            <img src="${post.photoUrl || user.photoUrl || "https://famileey.com/logo.jpg"}" alt="Post Photo" style="max-width:200px;">
            <p>${post.text || post.caption || ""}</p>
            <p>By: ${user.familyName}</p>
        </body>
        </html>
    `);
});
// /invite/:name Open Graph route with ref as userId
router.get("/invite/:name", async (req, res) => {
    const { name } = req.params;
    const { family, ref } = req.query;

    if (!ref) return res.status(400).send("Missing ref query parameter");

    const user = await getUserData(ref as string);
    if (!user) return res.status(404).send("User not found");

    res.setHeader("Content-Type", "text/html");
    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Famileey | ${name}'s Invite</title>
            <meta property="og:title" content="Famileey | ${name}'s Invite" />
            <meta property="og:description" content="${user.bio || "Join my Famileey!"}" />
            <meta property="og:image" content="${user.photoUrl || "https://famileey.com/logo.jpg"}" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://famileey.com/invite/${encodeURIComponent(name)}?family=${family}&ref=${ref}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Famileey | ${name}'s Invite" />
            <meta name="twitter:description" content="${user.bio || "Join my Famileey!"}" />
            <meta name="twitter:image" content="${user.photoUrl || "https://famileey.com/logo.jpg"}" />
        </head>
        <body>
            <h1>${name} invites you to Famileey!</h1>
            <img src="${user.photoUrl || "https://famileey.com/logo.jpg"}" alt="Profile Photo" style="max-width:200px;">
            <p>${user.bio || ""}</p>
            <p><a href="https://famileey.com/download">Download the app</a> and join ${family ? "the family" : "me"}!</p>
        </body>
        </html>
    `);
});

// /invite Open Graph route
router.get("/invite", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Join Famileey - The Family Connection App</title>
            <meta property="og:title" content="Join Famileey - The Family Connection App" />
            <meta property="og:description" content="Connect, share, and grow with your family on Famileey. Download now!" />
            <meta property="og:image" content="https://famileey.com/logo.jpg" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://famileey.com/invite" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Join Famileey - The Family Connection App" />
            <meta name="twitter:description" content="Connect, share, and grow with your family on Famileey. Download now!" />
            <meta name="twitter:image" content="https://famileey.com/logo.jpg" />
        </head>
        <body>
            <h1>Welcome to Famileey!</h1>
            <img src="https://famileey.com/logo.jpg" alt="Famileey Logo" style="max-width:200px;">
            <p>Connect, share, and grow with your family. <a href="https://famileey.com/download">Download the app</a> now!</p>
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
app.use("/api/admin",verifyFirebaseToken, adminRouter); // Mounting adminRouter

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
