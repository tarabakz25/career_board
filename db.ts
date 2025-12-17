import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "./lib/auth.js";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Lazy initialization to avoid connection errors during build
let _prisma: PrismaClient | null = null;

export const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop) {
		if (!_prisma) {
			if (!process.env.DATABASE_URL) {
				throw new Error(
					"DATABASE_URL is not set. Please configure your database connection.",
				);
			}
			_prisma = new PrismaClient({
				log:
					process.env.NODE_ENV === "development"
						? ["query", "error", "warn"]
						: ["error"],
			});
		}
		return _prisma[prop as keyof PrismaClient];
	},
});

export async function seedAdmin() {
	try {
		const existing = await prisma.user.findUnique({
			where: { email: ADMIN_EMAIL },
		});
		const desiredPassword = ADMIN_PASSWORD;

		if (!existing) {
			const { hash, salt } = hashPassword(desiredPassword);
			await prisma.user.create({
				data: {
					email: ADMIN_EMAIL,
					passwordHash: hash,
					salt,
					role: "admin",
				},
			});
			console.log(`Seeded admin account: ${ADMIN_EMAIL}`);
			return;
		}

		// If the stored hash doesn't match ADMIN_PASSWORD, update it so admins
		// aren't locked out after changing the env variable.
		if (
			!verifyPassword(desiredPassword, existing.salt, existing.passwordHash)
		) {
			const { hash, salt } = hashPassword(desiredPassword);
			await prisma.user.update({
				where: { id: existing.id },
				data: { passwordHash: hash, salt },
			});
			console.log(
				`Reset admin password for ${ADMIN_EMAIL} to match ADMIN_PASSWORD`,
			);
		}
	} catch (error) {
		console.error("Failed to seed admin account:", error);
		throw error;
	}
}

export async function seedJobs() {
	try {
		const count = await prisma.job.count();
		if (count > 0) return;
		await prisma.job.createMany({
			data: [
				{
					title: "Frontend Engineer",
					company: "Bright Labs",
					location: "Remote (US)",
					salaryMin: 9000000,
					salaryMax: 12000000,
					deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					description: "React/TypeScript, design systems, Web Vitals ownership",
				},
				{
					title: "Backend Engineer",
					company: "Northwind Logistics",
					location: "Tokyo",
					salaryMin: 8000000,
					salaryMax: 11000000,
					deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
					description: "Node.js/Express, PostgreSQL, async processing",
				},
				{
					title: "Product Designer",
					company: "Atlas Studio",
					location: "San Francisco",
					salaryMin: 10000000,
					salaryMax: 14000000,
					deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
					description: "End-to-end product design, user research, prototyping",
				},
			],
		});
		console.log("Seeded initial jobs");
	} catch (error) {
		console.error("Failed to seed jobs:", error);
		throw error;
	}
}

// Graceful shutdown
process.on("beforeExit", async () => {
	await prisma.$disconnect();
});
