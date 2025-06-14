import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import logger from "../utils/logger";

import bodyInspector from "../middlewares/bodyInspector";

import { ServerValue } from "firebase-admin/database";
import {
  addComment,
  deleteComment,
  getComments,
  getLikes,
  getPostById,
  getPosts,
  likePost,
  unlikePost,
  uploadPost,
} from "../actions/posts";

const postsRouter = express.Router();

postsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getPosts();
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Posts fetched",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in GET /posts:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.get(
  "/:postid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postid } = req.params;
      const result = await getPostById(postid);
      if (!result?.success) {
        res.status(404).json({
          success: false,
          message: result?.message || "Post not found",
        });
        return;
      }
      res.status(200).json(result);
    } catch (e: any) {
      logger.error("Error in GET /posts/:postid:", e);
      next(e);
    }
  }
);
postsRouter.post(
  "/upload",
  bodyInspector(["story", "photoUrl"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const uploadData = {
        ...data,
        uid: req.user.uid,
        timestamp: ServerValue.TIMESTAMP,
      };
      const result = await uploadPost(uploadData);
      // if (!token) {
      //   res.status(409).json({
      //     success: false,
      //     message: "User already exists or registration failed",
      //   });
      //   return;
      // }

      res.status(201).json(result);
      return;
    } catch (e) {
      logger.error("Error in /posts/upload", e);
      next(e);
    }
  }
);

postsRouter.post(
  "/like/:postid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req?.user.uid;
      const likeData = {
        postid: req.params.postid,
        uid: user,
        timestamp: ServerValue.TIMESTAMP,
      };
      const result = await likePost(likeData);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Failed to like post",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in /posts/like:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.post(
  "/unlike/:postid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req?.user.uid;

      const result = await unlikePost(req.params.postid, user);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Failed to unlike post",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in /posts/unlike:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.get(
  "/likes/:postid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req?.user.uid;

      const result = await getLikes(req?.params.postid, req?.user.uid);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: "Failed to get likes",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in GET /posts/likes:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.get(
  "/comments/:postid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getComments(req.params.postid);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Comment fetched",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in GET /posts/comment:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.post(
  "/comments/:postid",
  bodyInspector(["comment"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req?.user.uid;
      const { comment } = req.body;
      const commentData = {
        uid: user,
        postid: req.params.postid,
        comment,
        timestamp: ServerValue.TIMESTAMP,
      };
      const result = await addComment(commentData);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Comment posted",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in POST /posts/comment:", e);
      next(e); // Pass error to global handler
    }
  }
);
postsRouter.delete(
  "/comments/:postid/:commentid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postid, commentid } = req?.params;

      const result = await deleteComment(postid, commentid);
      if (!result?.success) {
        res.status(400).json({
          success: false,
          message: result?.message || "Comment deleted",
        });
        return;
      }

      res.status(200).json(result);
      return;
    } catch (e: any) {
      logger.error("Error in DELETE /posts/likes:", e);
      next(e); // Pass error to global handler
    }
  }
);

// 📩 Webhook route
postsRouter.post("/webhook", (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log("Received webhook:", event);
    res.status(200).json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default postsRouter;
