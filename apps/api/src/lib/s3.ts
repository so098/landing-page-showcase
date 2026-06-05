import { Readable } from "node:stream";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";

// 단일 클라이언트(리전은 env). ASSETS_BUCKET 미설정 시 호출부에서 가드.
const client = new S3Client({ region: env.AWS_REGION });

export function assetsBucket(): string {
  if (!env.ASSETS_BUCKET) throw new Error("ASSETS_BUCKET is not configured");
  return env.ASSETS_BUCKET;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: assetsBucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

// 객체 없으면 null. 그 외 에러는 throw.
export async function getObject(
  key: string,
): Promise<{ body: Readable; contentType?: string } | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: assetsBucket(), Key: key }));
    return { body: res.Body as Readable, contentType: res.ContentType };
  } catch (err) {
    const name = (err as { name?: string }).name;
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (name === "NoSuchKey" || code === 404) return null;
    throw err;
  }
}
