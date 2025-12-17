import {
	createJob,
	createUser,
	getUserByEmail,
	updateUserPassword,
} from "./lib/dynamodb.js";
import { hashPassword, verifyPassword } from "./lib/auth.js";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function seedAdmin() {
	try {
		const existing = await getUserByEmail(ADMIN_EMAIL);
		const desiredPassword = ADMIN_PASSWORD;

		if (!existing) {
			const { hash, salt } = hashPassword(desiredPassword);
			await createUser({
				email: ADMIN_EMAIL,
				passwordHash: hash,
				salt,
				role: "admin",
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
			await updateUserPassword(existing.userId, hash, salt);
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
		// DynamoDBではcountが高コストなので、seed flagで管理
		const shouldSeed = !process.env.DYNAMO_SEEDED;
		if (!shouldSeed) return;

		const sampleJobs = [
			{
				title: "Frontend Engineer",
				company: "Bright Labs",
				location: "Remote (US)",
				salaryMin: 9000000,
				salaryMax: 12000000,
				deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
				description: "React/TypeScript, design systems, Web Vitals ownership",
			},
			{
				title: "Backend Engineer",
				company: "Northwind Logistics",
				location: "Tokyo",
				salaryMin: 8000000,
				salaryMax: 11000000,
				deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
				description: "Node.js/Express, DynamoDB, async processing",
			},
			{
				title: "Product Designer",
				company: "Atlas Studio",
				location: "San Francisco",
				salaryMin: 10000000,
				salaryMax: 14000000,
				deadline: Date.now() + 28 * 24 * 60 * 60 * 1000,
				description: "End-to-end product design, user research, prototyping",
			},
		];

		for (const job of sampleJobs) {
			await createJob(job);
		}

		console.log("Seeded initial jobs");
	} catch (error) {
		console.error("Failed to seed jobs:", error);
		throw error;
	}
}
