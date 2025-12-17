import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	ScanCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// DynamoDBクライアント初期化
const client = new DynamoDBClient({
	region: process.env.AWS_REGION || "ap-northeast-1",
	...(process.env.AWS_ACCESS_KEY_ID && {
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
		},
	}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
	marshallOptions: {
		removeUndefinedValues: true,
		convertClassInstanceToMap: true,
	},
});

// テーブル名
export const TABLES = {
	USERS: process.env.DYNAMODB_USERS_TABLE || "career-board-users",
	JOBS: process.env.DYNAMODB_JOBS_TABLE || "career-board-jobs",
	APPLICATIONS:
		process.env.DYNAMODB_APPLICATIONS_TABLE || "career-board-applications",
};

// 型定義
export interface User {
	userId: string; // PK: USER#{ulid}
	email: string; // GSI1-PK: EMAIL#{email}
	passwordHash: string;
	salt: string;
	role: "user" | "admin";
	createdAt: number;
}

export interface Job {
	jobId: string; // PK: JOB#{ulid}
	title: string;
	company: string;
	location?: string;
	salaryMin?: number;
	salaryMax?: number;
	deadline?: number;
	description?: string;
	createdBy?: string;
	createdAt: number;
}

export interface Application {
	applicationId: string; // PK: APP#{ulid}
	userId: string; // GSI1-PK: USER#{userId}
	jobId: string;
	fullName: string;
	phone: string;
	coverLetter?: string;
	resumeUrl?: string;
	resumeKey?: string;
	createdAt: number;
}

// ヘルパー関数
export async function createTable(
	tableName: string,
	attributes: { name: string; type: string }[],
	keySchema: { name: string; type: "HASH" | "RANGE" }[],
	gsi?: {
		indexName: string;
		keys: { name: string; type: "HASH" | "RANGE" }[];
	},
) {
	// テーブル作成はAWS CLIまたはTerraform/CDKで行うことを推奨
	console.log(`Table ${tableName} should be created via AWS Console or IaC`);
}

// Users操作
export async function getUserByEmail(email: string): Promise<User | null> {
	const result = await docClient.send(
		new QueryCommand({
			TableName: TABLES.USERS,
			IndexName: "EmailIndex",
			KeyConditionExpression: "email = :email",
			ExpressionAttributeValues: {
				":email": email.toLowerCase(),
			},
		}),
	);
	return (result.Items?.[0] as User) || null;
}

export async function getUserById(userId: string): Promise<User | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLES.USERS,
			Key: { userId },
		}),
	);
	return (result.Item as User) || null;
}

export async function createUser(
	user: Omit<User, "userId" | "createdAt">,
): Promise<User> {
	const userId = `USER#${generateId()}`;
	const newUser: User = {
		...user,
		userId,
		email: user.email.toLowerCase(),
		createdAt: Date.now(),
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLES.USERS,
			Item: newUser,
		}),
	);

	return newUser;
}

export async function updateUserPassword(
	userId: string,
	passwordHash: string,
	salt: string,
): Promise<void> {
	await docClient.send(
		new UpdateCommand({
			TableName: TABLES.USERS,
			Key: { userId },
			UpdateExpression: "SET passwordHash = :hash, salt = :salt",
			ExpressionAttributeValues: {
				":hash": passwordHash,
				":salt": salt,
			},
		}),
	);
}

// Jobs操作
export async function getAllJobs(): Promise<Job[]> {
	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLES.JOBS,
		}),
	);
	return (result.Items as Job[]) || [];
}

export async function getJobById(jobId: string): Promise<Job | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLES.JOBS,
			Key: { jobId },
		}),
	);
	return (result.Item as Job) || null;
}

export async function createJob(
	job: Omit<Job, "jobId" | "createdAt">,
): Promise<Job> {
	const jobId = `JOB#${generateId()}`;
	const newJob: Job = {
		...job,
		jobId,
		createdAt: Date.now(),
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLES.JOBS,
			Item: newJob,
		}),
	);

	return newJob;
}

export async function updateJob(
	jobId: string,
	updates: Partial<Omit<Job, "jobId" | "createdAt">>,
): Promise<void> {
	const updateExpressions: string[] = [];
	const expressionAttributeValues: Record<string, any> = {};

	for (const [key, value] of Object.entries(updates)) {
		if (value !== undefined) {
			updateExpressions.push(`${key} = :${key}`);
			expressionAttributeValues[`:${key}`] = value;
		}
	}

	if (updateExpressions.length === 0) return;

	await docClient.send(
		new UpdateCommand({
			TableName: TABLES.JOBS,
			Key: { jobId },
			UpdateExpression: `SET ${updateExpressions.join(", ")}`,
			ExpressionAttributeValues: expressionAttributeValues,
		}),
	);
}

export async function deleteJob(jobId: string): Promise<void> {
	await docClient.send(
		new DeleteCommand({
			TableName: TABLES.JOBS,
			Key: { jobId },
		}),
	);
}

// Applications操作
export async function getApplicationByUserId(
	userId: string,
): Promise<Application | null> {
	const result = await docClient.send(
		new QueryCommand({
			TableName: TABLES.APPLICATIONS,
			IndexName: "UserIdIndex",
			KeyConditionExpression: "userId = :userId",
			ExpressionAttributeValues: {
				":userId": userId,
			},
		}),
	);
	return (result.Items?.[0] as Application) || null;
}

export async function createApplication(
	application: Omit<Application, "applicationId" | "createdAt">,
): Promise<Application> {
	const applicationId = `APP#${generateId()}`;
	const newApplication: Application = {
		...application,
		applicationId,
		createdAt: Date.now(),
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLES.APPLICATIONS,
			Item: newApplication,
		}),
	);

	return newApplication;
}

export async function deleteApplication(applicationId: string): Promise<void> {
	await docClient.send(
		new DeleteCommand({
			TableName: TABLES.APPLICATIONS,
			Key: { applicationId },
		}),
	);
}

export async function getApplicationsByJobId(
	jobId: string,
): Promise<Application[]> {
	const result = await docClient.send(
		new QueryCommand({
			TableName: TABLES.APPLICATIONS,
			IndexName: "JobIdIndex",
			KeyConditionExpression: "jobId = :jobId",
			ExpressionAttributeValues: {
				":jobId": jobId,
			},
		}),
	);
	return (result.Items as Application[]) || [];
}

// ULID風のID生成（簡易版）
function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	return `${timestamp}${random}`.toUpperCase();
}

