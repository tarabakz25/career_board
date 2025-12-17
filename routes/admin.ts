// #region agent log
fetch("http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		location: "routes/admin.ts:1",
		message: "admin.ts entry",
		data: {},
		timestamp: Date.now(),
		sessionId: "debug-session",
		runId: "initial",
		hypothesisId: "B",
	}),
}).catch(() => {});

// #endregion
import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, requireRole } from "../lib/auth";

// #region agent log
fetch("http://127.0.0.1:7242/ingest/0211b3fa-5b85-4f46-9efc-e02b8a837db4", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		location: "routes/admin.ts:4",
		message: "admin.ts imports successful",
		data: {},
		timestamp: Date.now(),
		sessionId: "debug-session",
		runId: "initial",
		hypothesisId: "B",
	}),
}).catch(() => {});
// #endregion

const router = Router();

router.use(authMiddleware(true), requireRole("admin"));

router.post("/jobs", async (req, res) => {
	try {
		const {
			title,
			company,
			location,
			salaryMin,
			salaryMax,
			deadline,
			description,
		} = req.body;

		if (!title || typeof title !== "string" || title.trim() === "")
			return res.status(400).json({ message: "タイトルは必須です" });
		if (!company || typeof company !== "string" || company.trim() === "")
			return res.status(400).json({ message: "会社名は必須です" });

		const salaryMinNum = salaryMin ? Number(salaryMin) : null;
		const salaryMaxNum = salaryMax ? Number(salaryMax) : null;

		if (salaryMin && (Number.isNaN(salaryMinNum!) || salaryMinNum! < 0))
			return res
				.status(400)
				.json({ message: "給与下限は有効な数値で指定してください" });
		if (salaryMax && (Number.isNaN(salaryMaxNum!) || salaryMaxNum! < 0))
			return res
				.status(400)
				.json({ message: "給与上限は有効な数値で指定してください" });
		if (salaryMinNum && salaryMaxNum && salaryMinNum > salaryMaxNum)
			return res
				.status(400)
				.json({ message: "給与下限は上限以下に設定してください" });

		let deadlineDate: Date | null = null;
		if (deadline) {
			deadlineDate = new Date(deadline);
			if (Number.isNaN(deadlineDate.getTime()))
				return res
					.status(400)
					.json({ message: "有効な日付形式で締切を指定してください" });
		}

		const job = await prisma.job.create({
			data: {
				title: title.trim(),
				company: company.trim(),
				location: location?.trim() || "",
				salaryMin: salaryMinNum,
				salaryMax: salaryMaxNum,
				deadline: deadlineDate,
				description: description?.trim() || "",
				createdBy: (req as any).user.userId,
			},
		});
		res.status(201).json(job);
	} catch (error) {
		console.error("Create job error:", error);
		res.status(500).json({ message: "求人の作成中にエラーが発生しました" });
	}
});

router.put("/jobs/:id", async (req, res) => {
	try {
		const jobId = Number(req.params.id);
		if (Number.isNaN(jobId) || jobId <= 0) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const {
			title,
			company,
			location,
			salaryMin,
			salaryMax,
			deadline,
			description,
		} = req.body;

		if (!title || typeof title !== "string" || title.trim() === "")
			return res.status(400).json({ message: "タイトルは必須です" });
		if (!company || typeof company !== "string" || company.trim() === "")
			return res.status(400).json({ message: "会社名は必須です" });

		const salaryMinNum = salaryMin ? Number(salaryMin) : null;
		const salaryMaxNum = salaryMax ? Number(salaryMax) : null;

		if (salaryMin && (Number.isNaN(salaryMinNum!) || salaryMinNum! < 0))
			return res
				.status(400)
				.json({ message: "給与下限は有効な数値で指定してください" });
		if (salaryMax && (Number.isNaN(salaryMaxNum!) || salaryMaxNum! < 0))
			return res
				.status(400)
				.json({ message: "給与上限は有効な数値で指定してください" });
		if (salaryMinNum && salaryMaxNum && salaryMinNum > salaryMaxNum)
			return res
				.status(400)
				.json({ message: "給与下限は上限以下に設定してください" });

		let deadlineDate: Date | null = null;
		if (deadline) {
			deadlineDate = new Date(deadline);
			if (Number.isNaN(deadlineDate.getTime()))
				return res
					.status(400)
					.json({ message: "有効な日付形式で締切を指定してください" });
		}

		const existing = await prisma.job.findUnique({ where: { id: jobId } });
		if (!existing)
			return res.status(404).json({ message: "求人が見つかりません" });

		const job = await prisma.job.update({
			where: { id: jobId },
			data: {
				title: title.trim(),
				company: company.trim(),
				location: location?.trim() || "",
				salaryMin: salaryMinNum,
				salaryMax: salaryMaxNum,
				deadline: deadlineDate,
				description: description?.trim() || "",
			},
		});
		res.json(job);
	} catch (error) {
		console.error("Update job error:", error);
		res.status(500).json({ message: "求人の更新中にエラーが発生しました" });
	}
});

router.delete("/jobs/:id", async (req, res) => {
	try {
		const jobId = Number(req.params.id);
		if (Number.isNaN(jobId) || jobId <= 0) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const existing = await prisma.job.findUnique({ where: { id: jobId } });
		if (!existing)
			return res.status(404).json({ message: "求人が見つかりません" });

		await prisma.application.deleteMany({ where: { jobId } });
		await prisma.job.delete({ where: { id: jobId } });
		res.json({ message: "求人を削除しました" });
	} catch (error) {
		console.error("Delete job error:", error);
		res.status(500).json({ message: "求人の削除中にエラーが発生しました" });
	}
});

export default router;
