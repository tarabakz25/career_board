import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import jobsRouter from "./routes/jobs";
import adminRouter from "./routes/admin";
import pagesRouter from "./routes/pages";
import { seedAdmin, seedJobs } from "./db";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/admin", adminRouter);

// Last: page routes (SSR entry)
app.use(pagesRouter);

async function bootstrap() {
	await seedAdmin();
	await seedJobs();
	app.listen(PORT, () =>
		console.log(`career-board running on http://localhost:${PORT}`),
	);
}

bootstrap().catch((err) => {
	console.error("Failed to start server", err);
	process.exit(1);
});
