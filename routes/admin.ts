import { Router } from "express";
import {
	createJob,
	deleteApplication,
	deleteJob,
	getApplicationsByJobId,
	getJobById,
	updateJob,
} from "../lib/dynamodb.js";
import { authMiddleware, requireRole } from "../lib/auth.js";

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

		let deadlineTimestamp: number | undefined = undefined;
		if (deadline) {
			const deadlineDate = new Date(deadline);
			if (Number.isNaN(deadlineDate.getTime()))
				return res
					.status(400)
					.json({ message: "有効な日付形式で締切を指定してください" });
			deadlineTimestamp = deadlineDate.getTime();
		}

		const job = await createJob({
			title: title.trim(),
			company: company.trim(),
			location: location?.trim() || undefined,
			salaryMin: salaryMinNum || undefined,
			salaryMax: salaryMaxNum || undefined,
			deadline: deadlineTimestamp,
			description: description?.trim() || undefined,
			createdBy: (req as any).user.userId,
		});

		res.status(201).json({
			id: job.jobId,
			title: job.title,
			company: job.company,
			location: job.location,
			salaryMin: job.salaryMin,
			salaryMax: job.salaryMax,
			deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
			description: job.description,
		});
	} catch (error) {
		console.error("Create job error:", error);
		res.status(500).json({ message: "求人の作成中にエラーが発生しました" });
	}
});

router.put("/jobs/:id", async (req, res) => {
	try {
		const jobId = req.params.id;
		if (!jobId) {
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

		let deadlineTimestamp: number | undefined = undefined;
		if (deadline) {
			const deadlineDate = new Date(deadline);
			if (Number.isNaN(deadlineDate.getTime()))
				return res
					.status(400)
					.json({ message: "有効な日付形式で締切を指定してください" });
			deadlineTimestamp = deadlineDate.getTime();
		}

		const existing = await getJobById(jobId);
		if (!existing)
			return res.status(404).json({ message: "求人が見つかりません" });

		await updateJob(jobId, {
			title: title.trim(),
			company: company.trim(),
			location: location?.trim() || undefined,
			salaryMin: salaryMinNum || undefined,
			salaryMax: salaryMaxNum || undefined,
			deadline: deadlineTimestamp,
			description: description?.trim() || undefined,
		});

		const updatedJob = await getJobById(jobId);
		res.json({
			id: updatedJob!.jobId,
			title: updatedJob!.title,
			company: updatedJob!.company,
			location: updatedJob!.location,
			salaryMin: updatedJob!.salaryMin,
			salaryMax: updatedJob!.salaryMax,
			deadline: updatedJob!.deadline
				? new Date(updatedJob!.deadline).toISOString()
				: null,
			description: updatedJob!.description,
		});
	} catch (error) {
		console.error("Update job error:", error);
		res.status(500).json({ message: "求人の更新中にエラーが発生しました" });
	}
});

router.delete("/jobs/:id", async (req, res) => {
	try {
		const jobId = req.params.id;
		if (!jobId) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const existing = await getJobById(jobId);
		if (!existing)
			return res.status(404).json({ message: "求人が見つかりません" });

		// 関連する応募も削除
		const applications = await getApplicationsByJobId(jobId);
		for (const app of applications) {
			await deleteApplication(app.applicationId);
		}

		await deleteJob(jobId);
		res.json({ message: "求人を削除しました" });
	} catch (error) {
		console.error("Delete job error:", error);
		res.status(500).json({ message: "求人の削除中にエラーが発生しました" });
	}
});

export default router;
