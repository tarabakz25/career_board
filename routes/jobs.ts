import { Router } from "express";
import multer from "multer";
import {
	createApplication,
	deleteApplication,
	getAllJobs,
	getApplicationByUserId,
	getApplicationsByJobId,
	getJobById,
} from "../lib/dynamodb.js";
import { authMiddleware } from "../lib/auth.js";
import { deleteFileFromS3, uploadFileToS3 } from "../lib/s3.js";

const router = Router();

// Multer設定（メモリストレージ使用）
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	},
});

router.get("/", async (req, res) => {
	try {
		const { search, location, minSalary } = req.query;

		// DynamoDBから全件取得してフィルタリング（本番ではGSIを使用推奨）
		let jobs = await getAllJobs();

		// クライアント側フィルタリング
		if (search) {
			const searchLower = (search as string).toLowerCase();
			jobs = jobs.filter(
				(job) =>
					job.title.toLowerCase().includes(searchLower) ||
					job.company.toLowerCase().includes(searchLower) ||
					job.description?.toLowerCase().includes(searchLower),
			);
		}

		if (location) {
			const locationLower = (location as string).toLowerCase();
			jobs = jobs.filter((job) =>
				job.location?.toLowerCase().includes(locationLower),
			);
		}

		if (minSalary) {
			const min = Number(minSalary);
			if (Number.isNaN(min) || min < 0) {
				return res
					.status(400)
					.json({ message: "最低給与は有効な数値で指定してください" });
			}
			jobs = jobs.filter(
				(job) =>
					(job.salaryMin && job.salaryMin >= min) ||
					(job.salaryMax && job.salaryMax >= min),
			);
		}

		// ソート（締切昇順、作成日降順）
		jobs.sort((a, b) => {
			if (a.deadline && b.deadline) {
				return a.deadline - b.deadline;
			}
			return b.createdAt - a.createdAt;
		});

		// レスポンス形式を統一
		const formattedJobs = jobs.map((job) => ({
			id: job.jobId,
			title: job.title,
			company: job.company,
			location: job.location,
			salaryMin: job.salaryMin,
			salaryMax: job.salaryMax,
			deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
			description: job.description,
		}));

		res.json(formattedJobs);
	} catch (error) {
		console.error("Get jobs error:", error);
		res.status(500).json({ message: "求人一覧の取得中にエラーが発生しました" });
	}
});

router.get("/me/application", authMiddleware(true), async (req, res) => {
	try {
		const user = (req as any).user;
		const application = await getApplicationByUserId(user.userId);
		if (!application) return res.json({ job: null });

		const job = await getJobById(application.jobId);
		if (!job) return res.json({ job: null });

		res.json({
			job: {
				id: job.jobId,
				title: job.title,
				company: job.company,
				location: job.location,
				salaryMin: job.salaryMin,
				salaryMax: job.salaryMax,
				deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
				description: job.description,
			},
		});
	} catch (error) {
		console.error("Get application error:", error);
		res.status(500).json({ message: "応募情報の取得中にエラーが発生しました" });
	}
});

router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const job = await getJobById(id);
		if (!job) return res.status(404).json({ message: "求人が見つかりません" });

		res.json({
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
		console.error("Get job error:", error);
		res.status(500).json({ message: "求人情報の取得中にエラーが発生しました" });
	}
});

router.post(
	"/:id/apply",
	authMiddleware(true),
	upload.single("resume"),
	async (req, res) => {
		try {
			const user = (req as any).user;
			if (user.role !== "user")
				return res
					.status(403)
					.json({ message: "管理者アカウントでは応募できません" });

			const jobId = req.params.id;
			if (!jobId) {
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

			const job = await getJobById(jobId);
			if (!job)
				return res.status(404).json({ message: "求人が見つかりません" });

			if (job.deadline && job.deadline < Date.now()) {
				return res
					.status(400)
					.json({ message: "この求人は応募期限を過ぎています" });
			}

			const existing = await getApplicationByUserId(user.userId);
			if (existing) {
				if (existing.jobId === jobId)
					return res.json({ message: "既に応募済みです" });
				return res.status(400).json({
					message:
						"他の求人に応募中です。応募を取り消してから再度お試しください。",
				});
			}

			// ファイルアップロード処理（オプション）
			let resumeUrl: string | null = null;
			let resumeKey: string | null = null;

			if (req.file) {
				try {
					const uploadResult = await uploadFileToS3(req.file, user.userId);
					resumeUrl = uploadResult.url;
					resumeKey = uploadResult.key;
				} catch (uploadError) {
					console.error("File upload error:", uploadError);
					return res.status(400).json({
						message:
							uploadError instanceof Error
								? uploadError.message
								: "ファイルのアップロードに失敗しました",
					});
				}
			}

			await createApplication({
				userId: user.userId,
				jobId,
				fullName: fullName.trim(),
				phone: phone.trim(),
				coverLetter: coverLetter?.trim() || undefined,
				resumeUrl: resumeUrl || undefined,
				resumeKey: resumeKey || undefined,
			});
			res.json({ message: "応募が完了しました" });
		} catch (error) {
			console.error("Apply error:", error);
			res.status(500).json({ message: "応募処理中にエラーが発生しました" });
		}
	},
);

router.post("/:id/cancel", authMiddleware(true), async (req, res) => {
	try {
		const user = (req as any).user;
		const jobId = req.params.id;
		if (!jobId) {
			return res.status(400).json({ message: "無効な求人IDです" });
		}

		const existing = await getApplicationByUserId(user.userId);
		if (!existing || existing.jobId !== jobId)
			return res
				.status(400)
				.json({ message: "この求人への応募履歴がありません" });

		// S3からファイルを削除
		if (existing.resumeKey) {
			try {
				await deleteFileFromS3(existing.resumeKey);
			} catch (deleteError) {
				console.error("Failed to delete resume from S3:", deleteError);
				// S3削除失敗してもアプリケーションは削除する
			}
		}

		await deleteApplication(existing.applicationId);
		res.json({ message: "応募を取り消しました" });
	} catch (error) {
		console.error("Cancel error:", error);
		res
			.status(500)
			.json({ message: "応募取り消し処理中にエラーが発生しました" });
	}
});

export default router;
