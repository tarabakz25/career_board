import { Router } from "express";
import { parseCookies, verifyToken } from "../lib/auth";

const router = Router();

router.get("/", (_req, res) => {
	res.render("index");
});

router.get("/login", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (payload) return res.redirect("/career_dashboard");
	res.render("login");
});

router.get("/register", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (payload) return res.redirect("/career_dashboard");
	res.render("register");
});

router.get("/career_dashboard", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (!payload) return res.redirect("/login");
	res.render("career_dashboard");
});

router.get("/apply", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (!payload) return res.redirect("/login");
	res.render("apply");
});

router.get("/apply_form", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (!payload) return res.redirect("/login");
	if (payload.role === "admin") return res.redirect("/career_dashboard");
	res.render("apply_form");
});

router.get("/mypage", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (!payload) return res.redirect("/login");
	res.render("mypage");
});

router.get("/adminpage", (req, res) => {
	const cookies = parseCookies(req.headers.cookie);
	const token = cookies.session;
	const payload = verifyToken(token);
	if (!payload) return res.redirect("/login");
	if (payload.role !== "admin") return res.redirect("/career_dashboard");
	res.render("adminpage");
});

// fallback
router.get(/.*/, (_req, res) => {
	res.status(404).render("index");
});

export default router;
