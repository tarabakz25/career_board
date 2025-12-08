import { Router } from "express";
import { prisma } from "../db";
import {
	authMiddleware,
	hashPassword,
	setSessionCookie,
	verifyPassword,
} from "../lib/auth";

const router = Router();

router.post("/register", async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password)
		return res.status(400).json({ message: "Email and password are required" });
	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing)
		return res.status(409).json({ message: "Email already in use" });
	const { hash, salt } = hashPassword(password);
	const user = await prisma.user.create({
		data: { email, passwordHash: hash, salt },
	});
	setSessionCookie(res, {
		userId: user.id,
		role: user.role as "user" | "admin",
		exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
	});
	res.json({ id: user.id, email, role: user.role, appliedJobId: null });
});

router.post("/login", async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password)
		return res.status(400).json({ message: "Email and password are required" });
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(401).json({ message: "Invalid credentials" });
	const valid = verifyPassword(password, user.salt, user.passwordHash);
	if (!valid) return res.status(401).json({ message: "Invalid credentials" });
	setSessionCookie(res, {
		userId: user.id,
		role: user.role as "user" | "admin",
		exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
	});
	const application = await prisma.application.findUnique({
		where: { userId: user.id },
	});
	res.json({
		id: user.id,
		email: user.email,
		role: user.role,
		appliedJobId: application?.jobId || null,
	});
});

router.post("/logout", (_req, res) => {
	res.clearCookie("session", { path: "/" });
	res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware(false), async (req, res) => {
	const tokenUser = (req as any).user;
	if (!tokenUser) return res.json({ user: null });
	const user = await prisma.user.findUnique({
		where: { id: tokenUser.userId },
		include: { applications: true },
	});
	if (!user) return res.json({ user: null });
	res.json({
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			appliedJobId: user.applications[0]?.jobId || null,
		},
	});
});

export default router;
