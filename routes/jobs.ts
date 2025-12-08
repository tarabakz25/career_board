import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
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
});

router.get("/me/application", authMiddleware(true), async (req, res) => {
	const user = (req as any).user;
	const application = await prisma.application.findUnique({
		where: { userId: user.userId },
		include: { job: true },
	});
	if (!application) return res.json({ job: null });
	res.json({ job: application.job });
});

router.get("/:id", async (req, res) => {
	const { id } = req.params;
	const job = await prisma.job.findUnique({
		where: { id: Number(id) },
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
	if (!job) return res.status(404).json({ message: "Job not found" });
	res.json(job);
});

router.post("/:id/apply", authMiddleware(true), async (req, res) => {
	const user = (req as any).user;
	if (user.role !== "user")
		return res.status(403).json({ message: "Admins cannot apply" });
	const jobId = Number(req.params.id);
	const job = await prisma.job.findUnique({ where: { id: jobId } });
	if (!job) return res.status(404).json({ message: "Job not found" });

	const existing = await prisma.application.findUnique({
		where: { userId: user.userId },
	});
	if (existing) {
		if (existing.jobId === jobId)
			return res.json({ message: "Already applied" });
		return res.status(400).json({
			message: "You can only apply to one job at a time. Cancel first.",
		});
	}

	await prisma.application.create({
		data: { userId: user.userId, jobId },
	});
	res.json({ message: "Applied" });
});

router.post("/:id/cancel", authMiddleware(true), async (req, res) => {
	const user = (req as any).user;
	const jobId = Number(req.params.id);
	const existing = await prisma.application.findFirst({
		where: { userId: user.userId, jobId },
	});
	if (!existing)
		return res.status(400).json({ message: "No application to cancel" });
	await prisma.application.delete({ where: { id: existing.id } });
	res.json({ message: "Canceled" });
});

export default router;
