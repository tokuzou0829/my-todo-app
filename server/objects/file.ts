import { uuidv7 } from "uuidv7";

export const createBlobFile = (params: {
	blob: Blob;
	bucket: string;
	keyPrefix: string;
	contentType: string;
}): BlobFile => {
	const { blob, bucket, keyPrefix, contentType } = params;
	const id = generateFileId();
	return {
		kind: "BlobFile",
		id,
		blob,
		bucket,
		key: `${keyPrefix}/${id}`,
		contentType,
	};
};

const generateFileId = (): FileId => {
	return uuidv7() as FileId;
};

export type FileId = string & { readonly __brand: "FileId" };

export interface BlobFile extends BaseFile {
	kind: "BlobFile";
	blob: Blob;
}
export interface BaseFile {
	kind: string;
	id: FileId;
	bucket: string;
	key: string;
	contentType: string;
}

export type UploadedFile<T extends BaseFile> = T & {
	size: number;
	uploadedAt: Date;
};

export const toUploadedFile = <T extends BaseFile>(params: {
	file: T;
	size: number;
}): UploadedFile<T> => {
	const { file, size } = params;
	return { ...file, size, uploadedAt: new Date() };
};
