import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

export type Role = "user" | "admin";

export type TokenPayload = {
	userId: number;
	role: Role;
	exp: number;
};

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export function hashPassword(password: string, salt?: string) {
	const saltToUse = salt || crypto.randomBytes(16).toString("hex");
	const derived = crypto.scryptSync(password, saltToUse, 64).toString("hex");
	return { hash: derived, salt: saltToUse };
}

export function verifyPassword(password: string, salt: string, hash: string) {
	const derived = crypto.scryptSync(password, salt, 64).toString("hex");
	return crypto.timingSafeEqual(
		Buffer.from(hash, "hex"),
		Buffer.from(derived, "hex"),
	);
}

export function signToken(payload: TokenPayload) {
	const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = crypto
		.createHmac("sha256", SESSION_SECRET)
		.update(base)
		.digest("base64url");
	return `${base}.${sig}`;
}

export function verifyToken(token?: string): TokenPayload | null {
	if (!token) return null;
	const [base, sig] = token.split(".");
	if (!base || !sig) return null;
	const expected = crypto
		.createHmac("sha256", SESSION_SECRET)
		.update(base)
		.digest("base64url");
	if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
		return null;
	const payload = JSON.parse(
		Buffer.from(base, "base64url").toString(),
	) as TokenPayload;
	if (Date.now() > payload.exp) return null;
	return payload;
}

export function parseCookies(header?: string) {
	const cookies: Record<string, string> = {};
	if (!header) return cookies;
	header.split(";").forEach((c) => {
		const [name, ...rest] = c.split("=");
		if (!name) return;
		cookies[name.trim()] = decodeURIComponent(rest.join("=").trim());
	});
	return cookies;
}

export function authMiddleware(required = false) {
	return (req: Request, res: Response, next: NextFunction) => {
		const cookies = parseCookies(req.headers.cookie);
		const token = cookies["session"];
		const payload = verifyToken(token);
		if (!payload) {
			if (required) return res.status(401).json({ message: "Unauthorized" });
			return next();
		}
		(req as any).user = payload;
		next();
	};
}

export function requireRole(role: Role) {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = (req as any).user as TokenPayload | undefined;
		if (!user || user.role !== role)
			return res.status(403).json({ message: "Forbidden" });
		next();
	};
}

export function setSessionCookie(res: Response, payload: TokenPayload) {
	const token = signToken(payload);
	res.cookie("session", token, {
		httpOnly: true,
		sameSite: "lax",
		secure: false,
		maxAge: 1000 * 60 * 60 * 24 * 7,
		path: "/",
	});
}
