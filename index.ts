// #region agent log
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import { seedAdmin, seedJobs } from "./db.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import jobsRouter from "./routes/jobs.js";
import pagesRouter from "./routes/pages.js";

const logDir = path.join(process.cwd(), ".cursor");
const logPath = path.join(logDir, "debug.log");
const log = (
	location: string,
	message: string,
	data: any,
	hypothesisId: string,
) => {
	const logEntry = {
		location,
		message,
		data,
		hypothesisId,
		timestamp: Date.now(),
		sessionId: "debug-session",
	};
	console.log("[DEBUG]", JSON.stringify(logEntry));
	try {
		if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
		appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
	} catch (e) {
		console.error("[DEBUG LOG ERROR]", e);
	}
};
// #endregion

// Bun automatically loads .env files

// #region agent log
log(
	"index.ts:19",
	"App startup - environment check",
	{
		NODE_ENV: process.env.NODE_ENV,
		PORT: process.env.PORT,
		DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT_SET",
	},
	"A,B,C",
);
// #endregion

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// #region agent log
log(
	"index.ts:26",
	"ESM path resolution success",
	{ __filename, __dirname },
	"D",
);
// #endregion

const PORT = process.env.PORT || 3000;

const app = express();

// JSON parse error handling
app.use(
	express.json({
		verify: (_req: Request, _res: Response, buf: Buffer) => {
			try {
				JSON.parse(buf.toString());
			} catch {
				throw new Error("Invalid JSON");
			}
		},
	}),
);
app.use(express.urlencoded({ extended: true }));

// Track if database has been initialized
let dbInitialized = false;

async function initializeDatabase() {
	// #region agent log
	log("index.ts:48", "initializeDatabase called", { dbInitialized }, "C");
	// #endregion

	if (dbInitialized) return;

	// Skip if AWS credentials are not set
	if (!process.env.AWS_REGION) {
		console.warn("AWS_REGION not set, skipping database initialization");
		// #region agent log
		log("index.ts:55", "AWS_REGION not set, skipping DB init", {}, "C");
		// #endregion
		dbInitialized = true; // Mark as initialized to avoid repeated attempts
		return;
	}

	try {
		// #region agent log
		log("index.ts:62", "Before seedAdmin", {}, "C");
		// #endregion
		await seedAdmin();
		// #region agent log
		log("index.ts:66", "After seedAdmin, before seedJobs", {}, "C");
		// #endregion
		await seedJobs();
		dbInitialized = true;
		console.log("Database initialized successfully");
		// #region agent log
		log("index.ts:72", "Database initialized successfully", {}, "C");
		// #endregion
	} catch (err) {
		console.error("Failed to initialize database:", err);
		// #region agent log
		log(
			"index.ts:77",
			"Database initialization failed",
			{ error: String(err) },
			"C",
		);
		// #endregion
		dbInitialized = true; // Mark as initialized to avoid repeated attempts
		// Don't throw - allow app to continue
	}
}

// Initialize on first request (middleware)
app.use(async (_req, _res, next) => {
	if (!dbInitialized) {
		await initializeDatabase();
	}
	next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/admin", adminRouter);

// Last: page routes (SSR entry)
app.use(pagesRouter);

// Global error handler for API routes
app.use(
	"/api",
	(err: Error, _req: Request, res: Response, _next: NextFunction) => {
		console.error("API Error:", err);
		if (err.message === "Invalid JSON") {
			return res
				.status(400)
				.json({ message: "リクエストのJSON形式が不正です" });
		}
		res.status(500).json({ message: "サーバーエラーが発生しました" });
	},
);

// Global error handler for pages
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error("Page Error:", err);
	res.status(500).render("index");
});

// #region agent log
log(
	"index.ts:126",
	"Before app.listen check",
	{
		NODE_ENV: process.env.NODE_ENV,
		PORT,
		isProduction: process.env.NODE_ENV === "production",
		isRender: !!process.env.RENDER,
	},
	"A",
);
// #endregion

// Start server for local development OR Render (traditional Node.js host)
// Skip for Vercel (serverless) in production
const shouldStartServer =
	process.env.NODE_ENV !== "production" || process.env.RENDER;

if (shouldStartServer) {
	// #region agent log
	log(
		"index.ts:132",
		"app.listen will be called",
		{ PORT, reason: process.env.RENDER ? "Render" : "development" },
		"A",
	);
	// #endregion
	app.listen(PORT, () =>
		console.log(`career-board running on http://localhost:${PORT}`),
	);
} else {
	// #region agent log
	log(
		"index.ts:138",
		"app.listen SKIPPED (Vercel serverless mode)",
		{ NODE_ENV: process.env.NODE_ENV },
		"A",
	);
	// #endregion
}

// Export handler for Vercel serverless
export default app;
