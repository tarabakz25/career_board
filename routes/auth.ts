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
	try {
		const { email, password } = req.body;
		if (!email || !password)
			return res
				.status(400)
				.json({ message: "メールアドレスとパスワードは必須です" });
		if (typeof email !== "string" || !email.includes("@"))
			return res
				.status(400)
				.json({ message: "有効なメールアドレスを入力してください" });
		if (typeof password !== "string" || password.length < 6)
			return res
				.status(400)
				.json({ message: "パスワードは6文字以上で入力してください" });

		// normalize email to avoid case/whitespace mismatches
		const normalizedEmail = email.trim().toLowerCase();

		const existing = await prisma.user.findFirst({
			where: { email: { equals: normalizedEmail, mode: "insensitive" } },
		});
		if (existing)
			return res
				.status(409)
				.json({ message: "このメールアドレスは既に使用されています" });

		const { hash, salt } = hashPassword(password);
		const user = await prisma.user.create({
			data: { email: normalizedEmail, passwordHash: hash, salt },
		});
		setSessionCookie(res, {
			userId: user.id,
			role: user.role as "user" | "admin",
			exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
		});
		res.json({ id: user.id, email, role: user.role, appliedJobId: null });
	} catch (error) {
		console.error("Register error:", error);
		res.status(500).json({ message: "登録処理中にエラーが発生しました" });
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password)
			return res
				.status(400)
				.json({ message: "メールアドレスとパスワードは必須です" });

		const normalizedEmail =
			typeof email === "string" ? email.trim().toLowerCase() : "";

		const user = await prisma.user.findFirst({
			where: { email: { equals: normalizedEmail, mode: "insensitive" } },
		});
		if (!user)
			return res
				.status(401)
				.json({ message: "メールアドレスまたはパスワードが正しくありません" });

		const valid = verifyPassword(password, user.salt, user.passwordHash);
		if (!valid)
			return res
				.status(401)
				.json({ message: "メールアドレスまたはパスワードが正しくありません" });

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
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ message: "ログイン処理中にエラーが発生しました" });
	}
});

router.post("/logout", (_req, res) => {
	res.clearCookie("session", { path: "/" });
	res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware(false), async (req, res) => {
	try {
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
	} catch (error) {
		console.error("Get me error:", error);
		res
			.status(500)
			.json({ message: "ユーザー情報の取得中にエラーが発生しました" });
	}
});

export default router;
