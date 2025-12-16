// #region agent log
fetch('http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:1',message:'index.ts entry - before imports',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:6',message:'Before importing db module',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
// #endregion
import { seedAdmin, seedJobs } from "./db";
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:7',message:'After importing db, before importing routes',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
// #endregion
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import jobsRouter from "./routes/jobs";
import pagesRouter from "./routes/pages";
// #region agent log
fetch('http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:11',message:'All imports successful',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
// #endregion

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function bootstrap() {
	try {
		await seedAdmin();
		await seedJobs();
		app.listen(PORT, () =>
			console.log(`career-board running on http://localhost:${PORT}`),
		);
	} catch (err) {
		console.error("Failed to initialize database:", err);
		throw err;
	}
}

bootstrap().catch((err) => {
	console.error("Failed to start server", err);
	process.exit(1);
});
