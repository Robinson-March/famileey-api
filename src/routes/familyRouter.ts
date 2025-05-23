import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import logger from "../utils/logger";

import bodyInspector from "../middlewares/bodyInspector";

import { ServerValue } from "firebase-admin/database";
import {
	followFamily,
	getFamilies,
	getFamilyPosts,
	recordPostView,
	searchFamilies,
	unfollowFamily,
} from "../actions/family";

const familyRouter = express.Router();
familyRouter.get(
	"/",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await getFamilies();
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Families fetched",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			logger.error("Error in GET /families:", e);
			next(e); // Pass error to global handler
		}
	},
);
familyRouter.get(
	"/posts/:id",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const id = req.params.id;
			const result = await getFamilyPosts(id);
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Family posts fetched",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			logger.error("Error in GET /families/posts:", e);
			next(e); // Pass error to global handler
		}
	},
);
familyRouter.search(
	"/",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { search } = req.query;
			console.log({ search });
			const result = await searchFamilies(search);
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Family searched",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			logger.error("Error in GET /families?search:", e);
			next(e); // Pass error to global handler
		}
	},
);
familyRouter.post(
	"/follow/:familyId",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { familyId } = req.params;

			const result = await followFamily(req.user.uid, familyId);
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Family followed",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			logger.error(`Error in GET /follow`, e);
			next(e); // Pass error to global handler
		}
	},
);
familyRouter.post(
	"/unfollow/:familyId",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { familyId } = req.params;

			const result = await unfollowFamily(req.user.uid, familyId);
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Family followed",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			const { familyId } = req.params;
			logger.error(`Error in GET /unfollow`, e);
			next(e); // Pass error to global handler
		}
	},
);
familyRouter.post(
	"/postviewed/:postId",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { postId } = req.params;

			const result = await recordPostView(postId);
			if (!result?.success) {
				res.status(400).json({
					success: false,
					message: result?.message || "Post view recorded",
				});
				return;
			}

			res.status(200).json(result);
			return;
		} catch (e: any) {
			const { familyId } = req.params;
			logger.error(`Error in GET /unfollow`, e);
			next(e); // Pass error to global handler
		}
	},
);

export { familyRouter };
