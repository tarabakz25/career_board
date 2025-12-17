import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";

// S3クライアントの初期化
const s3Client = new S3Client({
	region: process.env.AWS_REGION || "ap-northeast-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
	},
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
	key: string;
	url: string;
}

/**
 * ファイルをS3にアップロード
 */
export async function uploadFileToS3(
	file: Express.Multer.File,
	userId: number,
): Promise<UploadResult> {
	if (!BUCKET_NAME) {
		throw new Error("AWS_S3_BUCKET environment variable is not set");
	}

	if (file.size > MAX_FILE_SIZE) {
		throw new Error(
			`ファイルサイズが大きすぎます（最大${MAX_FILE_SIZE / 1024 / 1024}MB）`,
		);
	}

	// 許可されたファイルタイプをチェック
	const allowedTypes = [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	];
	if (!allowedTypes.includes(file.mimetype)) {
		throw new Error("PDF または Word 形式のファイルのみアップロード可能です");
	}

	// ランダムなファイル名を生成（ユーザーIDと日付を含む）
	const timestamp = Date.now();
	const randomString = randomBytes(8).toString("hex");
	const fileExtension = file.originalname.split(".").pop() || "bin";
	const key = `resumes/${userId}/${timestamp}-${randomString}.${fileExtension}`;

	try {
		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			Body: file.buffer,
			ContentType: file.mimetype,
			Metadata: {
				userId: String(userId),
				originalName: file.originalname,
				uploadedAt: new Date().toISOString(),
			},
		});

		await s3Client.send(command);

		// 署名付きURLを生成（7日間有効）
		const url = await getSignedUrl(
			s3Client,
			new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			}),
			{ expiresIn: 604800 }, // 7 days
		);

		return { key, url };
	} catch (error) {
		console.error("S3 upload error:", error);
		throw new Error("ファイルのアップロードに失敗しました");
	}
}

/**
 * S3から署名付きURLを取得（ダウンロード用）
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
	if (!BUCKET_NAME) {
		throw new Error("AWS_S3_BUCKET environment variable is not set");
	}

	try {
		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		const url = await getSignedUrl(s3Client, command, {
			expiresIn: 3600, // 1 hour
		});

		return url;
	} catch (error) {
		console.error("S3 presigned URL error:", error);
		throw new Error("ダウンロードURLの生成に失敗しました");
	}
}

/**
 * S3からファイルを削除
 */
export async function deleteFileFromS3(key: string): Promise<void> {
	if (!BUCKET_NAME) {
		throw new Error("AWS_S3_BUCKET environment variable is not set");
	}

	try {
		const command = new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});

		await s3Client.send(command);
	} catch (error) {
		console.error("S3 delete error:", error);
		throw new Error("ファイルの削除に失敗しました");
	}
}

