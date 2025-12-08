import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./lib/auth";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export const prisma = new PrismaClient();

export async function seedAdmin() {
	const existing = await prisma.user.findUnique({
		where: { email: ADMIN_EMAIL },
	});
	if (!existing) {
		const { hash, salt } = hashPassword(ADMIN_PASSWORD);
		await prisma.user.create({
			data: {
				email: ADMIN_EMAIL,
				passwordHash: hash,
				salt,
				role: "admin",
			},
		});
		console.log(`Seeded admin account: ${ADMIN_EMAIL}`);
	}
}

export async function seedJobs() {
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
				description:
					"React/TypeScript, design systems, Web Vitals ownership",
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
}
