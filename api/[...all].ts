import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../index";

export default (req: VercelRequest, res: VercelResponse) => {
	// Express app is already a request handler
	return app(req as any, res as any);
};

