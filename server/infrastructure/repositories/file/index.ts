/**
 * Creates file repository functions
 * @param r2 - The R2 service
 * @param db - The database instance
 * @returns File repository functions
 */

import type { AwsClient } from "aws4fetch";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Database } from "@/lib/db";
import type { BlobFile } from "@/server/objects/file";
import { toUploadedFile, type UploadedFile } from "@/server/objects/file";
import type { DeleteFileByIdService } from "./interface";

export const createFileRepository = (
	r2: AwsClient,
	db: Database,
	url: string,
) => ({
	saveBlobFile: createSaveBlobFile(r2, db, url),
	deleteFileById: createDeleteFileById(r2, db, url),
});

/**
 * Creates a function to save a blob file to storage
 * @param r2 - The R2 service
 * @param db - The database instance
 * @returns A function to save a blob file
 */
const createSaveBlobFile =
	(r2: AwsClient, db: Database, url: string) =>
	async <T extends BlobFile>(file: T): Promise<UploadedFile<T>> => {
		const payload = await file.blob.arrayBuffer();

		const uploadResponse = await r2.fetch(
			createR2ObjectUrl(url, file.bucket, file.key),
			{
				method: "PUT",
				body: payload,
				headers: {
					"Content-Type": file.contentType,
					"Content-Length": String(payload.byteLength),
				},
			},
		);

		if (!uploadResponse.ok) {
			throw createR2RequestError("upload", uploadResponse);
		}

		const size = file.blob.size;

		await db.insert(schema.files).values({
			id: file.id,
			bucket: file.bucket,
			key: file.key,
			contentType: file.contentType,
			size,
			expiresAt:
				"expiresAt" in file && file.expiresAt instanceof Date
					? file.expiresAt
					: null,
			uploadedAt: new Date(),
		});

		return toUploadedFile({ file, size });
	};

const createDeleteFileById =
	(r2: AwsClient, db: Database, url: string): DeleteFileByIdService =>
	async (fileId: string) => {
		const [target] = await db
			.select()
			.from(schema.files)
			.where(eq(schema.files.id, fileId))
			.limit(1);

		if (!target) {
			return;
		}

		const deleteResponse = await r2.fetch(
			createR2ObjectUrl(url, target.bucket, target.key),
			{
				method: "DELETE",
				body: new Uint8Array(0),
				headers: {
					"Content-Length": "0",
				},
			},
		);

		if (!deleteResponse.ok && deleteResponse.status !== 404) {
			throw createR2RequestError("delete", deleteResponse);
		}

		await db.delete(schema.files).where(eq(schema.files.id, fileId));
	};

export function createR2ObjectUrl(
	baseUrl: string,
	bucket: string,
	key: string,
) {
	const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	const endpoint = new URL(normalizedBaseUrl);
	const pathParts = endpoint.pathname.split("/").filter(Boolean);
	const bucketName = bucket.toLowerCase();
	const isVirtualHostedStyle = endpoint.hostname
		.toLowerCase()
		.startsWith(`${bucketName}.`);
	const baseUrlIncludesBucket = pathParts.at(-1)?.toLowerCase() === bucketName;
	const objectPath =
		isVirtualHostedStyle || baseUrlIncludesBucket ? key : `${bucket}/${key}`;

	return new URL(objectPath, normalizedBaseUrl).toString();
}

const createR2RequestError = (
	action: "upload" | "delete",
	response: Response,
) => {
	return new Error(`Failed to ${action} file in R2`, {
		cause: {
			status: response.status,
			statusText: response.statusText,
		},
	});
};
