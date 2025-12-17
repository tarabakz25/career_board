import { Router } from "express";
import { prisma } from "../db.js";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

router.get("/", async (req, res) => {
	try {
		const { search, location, minSalary } = req.query;
		const where: any = {};

		if (search) {
			where.OR = [
				{ title: { contains: search as string, mode: "insensitive" } },
				{ company: { contains: search as string, mode: "insensitive" } },
				{ description: { contains: search as string, mode: "insensitive" } },
			];
		}
		if (location) {
			where.location = { contains: location as string, mode: "insensitive" };
		}
		if (minSalary) {
			const min = Number(minSalary);
			if (Number.isNaN(min) || min < 0) {
				return res
					.status(400)
					.json({ message: "最低給与は有効な数値で指定してください" });
			}
			where.OR = [
				...(where.OR || []),
				{ salaryMin: { gte: min } },
				{ salaryMax: { gte: min } },
			];
		}

		const jobs = await prisma.job.findMany({
			where,
			orderBy: [{ deadline: "asc" }, { id: "desc" }],
			select: {
				id: true,
				title: true,
				company: true,
				location: true,
				salaryMin: true,
				salaryMax: true,
				deadline: true,
				description: true,
			},
		});
		res.json(jobs);
	} catch (error) {
		console.error("Get jobs error:", error);
		res.status(500).json({ message: "求人一覧の取得中にエラーが発生しました" });
	}
});

router.get("/me/application", authMiddleware(true), async (req, res) => {
	try {
		const user = (req as any).user;
		const application = await prisma.application.findUnique({
			where: { userId: user.userId },
			include: { job: true },
		});
		if (!application) return res.json({ job: null });
		res.json({ job: application.job });
	} catch (error) {
		console.error("Get application error:", error);
		res.status(500).json({ message: "応募情報の取得中にエラーが発生しました" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const jobId = Number(id);
		if (Number.isNaN(jobId) || jobId <= 0) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}
		const job = await prisma.job.findUnique({
			where: { id: jobId },
			select: {
				id: true,
				title: true,
				company: true,
				location: true,
				salaryMin: true,
				salaryMax: true,
				deadline: true,
				description: true,
			},
		});
		if (!job) return res.status(404).json({ message: "求人が見つかりません" });
		res.json(job);
	} catch (error) {
		console.error("Get job error:", error);
		res.status(500).json({ message: "求人情報の取得中にエラーが発生しました" });
	}
});

router.post("/:id/apply", authMiddleware(true), async (req, res) => {
	try {
		const user = (req as any).user;
		if (user.role !== "user")
			return res
				.status(403)
				.json({ message: "管理者アカウントでは応募できません" });

		const jobId = Number(req.params.id);
		if (Number.isNaN(jobId) || jobId <= 0) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const { fullName, phone, coverLetter } = req.body;

		if (!fullName || typeof fullName !== "string" || fullName.trim() === "")
			return res.status(400).json({ message: "氏名は必須です" });
		if (!phone || typeof phone !== "string" || phone.trim() === "")
			return res.status(400).json({ message: "電話番号は必須です" });
		const phoneRegex = /^[0-9\-+() ]+$/;
		if (!phoneRegex.test(phone))
			return res
				.status(400)
				.json({ message: "有効な電話番号を入力してください" });

		const job = await prisma.job.findUnique({ where: { id: jobId } });
		if (!job) return res.status(404).json({ message: "求人が見つかりません" });

		if (job.deadline && new Date(job.deadline) < new Date()) {
			return res
				.status(400)
				.json({ message: "この求人は応募期限を過ぎています" });
		}

		const existing = await prisma.application.findUnique({
			where: { userId: user.userId },
		});
		if (existing) {
			if (existing.jobId === jobId)
				return res.json({ message: "既に応募済みです" });
			return res.status(400).json({
				message:
					"他の求人に応募中です。応募を取り消してから再度お試しください。",
			});
		}

		await prisma.application.create({
			data: {
				userId: user.userId,
				jobId,
				fullName: fullName.trim(),
				phone: phone.trim(),
				coverLetter: coverLetter?.trim() || null,
			},
		});
		res.json({ message: "応募が完了しました" });
	} catch (error) {
		console.error("Apply error:", error);
		res.status(500).json({ message: "応募処理中にエラーが発生しました" });
	}
});

router.post("/:id/cancel", authMiddleware(true), async (req, res) => {
	try {
		const user = (req as any).user;
		const jobId = Number(req.params.id);
		if (Number.isNaN(jobId) || jobId <= 0) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const existing = await prisma.application.findFirst({
			where: { userId: user.userId, jobId },
		});
		if (!existing)
			return res
				.status(400)
				.json({ message: "この求人への応募履歴がありません" });

		await prisma.application.delete({ where: { id: existing.id } });
		res.json({ message: "応募を取り消しました" });
	} catch (error) {
		console.error("Cancel error:", error);
		res
			.status(500)
			.json({ message: "応募取り消し処理中にエラーが発生しました" });
	}
});

export default router;
