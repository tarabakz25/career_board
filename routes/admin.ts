import { Router } from "express";
import { prisma } from "../db";
import { authMiddleware, requireRole } from "../lib/auth";

const router = Router();

router.use(authMiddleware(true), requireRole("admin"));

router.post("/jobs", async (req, res) => {
	const {
		title,
		company,
		location,
		salaryMin,
		salaryMax,
		deadline,
		description,
	} = req.body;
	if (!title || !company)
		return res.status(400).json({ message: "Title and company are required" });
	const job = await prisma.job.create({
		data: {
			title,
			company,
			location: location || "",
			salaryMin: salaryMin ? Number(salaryMin) : null,
			salaryMax: salaryMax ? Number(salaryMax) : null,
			deadline: deadline ? new Date(deadline) : null,
			description: description || "",
			createdBy: (req as any).user.userId,
		},
	});
	res.status(201).json(job);
});

router.put("/jobs/:id", async (req, res) => {
	const jobId = Number(req.params.id);
	const {
		title,
		company,
		location,
		salaryMin,
		salaryMax,
		deadline,
		description,
	} = req.body;
	const existing = await prisma.job.findUnique({ where: { id: jobId } });
	if (!existing) return res.status(404).json({ message: "Job not found" });
	const job = await prisma.job.update({
		where: { id: jobId },
		data: {
			title,
			company,
			location: location || "",
			salaryMin: salaryMin ? Number(salaryMin) : null,
			salaryMax: salaryMax ? Number(salaryMax) : null,
			deadline: deadline ? new Date(deadline) : null,
			description: description || "",
		},
	});
	res.json(job);
});

router.delete("/jobs/:id", async (req, res) => {
	const jobId = Number(req.params.id);
	await prisma.application.deleteMany({ where: { jobId } });
	await prisma.job.delete({ where: { id: jobId } });
	res.json({ message: "Deleted" });
});

export default router;
