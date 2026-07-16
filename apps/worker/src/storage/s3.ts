import { Buffer } from "node:buffer";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { env } from "../env";

/**
 * Storage port used by jobs. Injectable so ingest is unit-testable with an
 * in-memory fake (no network, matching the 2A provider pattern).
 */
export interface StoragePort {
  readonly enabled: boolean;
  readonly bucket: string;
  /** Upload bytes; returns the stored key. */
  put(key: string, body: Uint8Array, contentType?: string): Promise<{ key: string; url?: string }>;
  /** Public/base URL for a key, if a public base is configured. */
  urlFor(key: string): string | undefined;
}

/** No-op storage: creds absent. Every put throws a clearly-marked BLOCKED error. */
export const disabledStorage: StoragePort = {
  enabled: false,
  bucket: env.S3_BUCKET_MEDIA,
  put() {
    // BLOCKED: S3/R2 creds absent — set S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY.
    return Promise.reject(new Error("storage disabled: S3/R2 credentials not configured"));
  },
  urlFor() {
    return undefined;
  },
};

/** S3-compatible storage (Cloudflare R2 or MinIO). Path-style for MinIO. */
export class S3Storage implements StoragePort {
  readonly enabled = true;
  readonly bucket: string;
  private readonly client: S3Client;
  private readonly publicBase?: string;
  private ensured = false;

  constructor(client: S3Client, bucket: string, publicBase?: string) {
    this.client = client;
    this.bucket = bucket;
    this.publicBase = publicBase;
  }

  /** Create the bucket if missing (MinIO dev convenience; R2 buckets pre-exist). */
  private async ensureBucket(): Promise<void> {
    if (this.ensured) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        // Already exists / concurrent create / no-permission on R2 — proceed.
      }
    }
    this.ensured = true;
  }

  async put(
    key: string,
    body: Uint8Array,
    contentType?: string,
  ): Promise<{ key: string; url?: string }> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(body),
        ContentType: contentType,
      }),
    );
    return { key, url: this.urlFor(key) };
  }

  urlFor(key: string): string | undefined {
    return this.publicBase ? `${this.publicBase.replace(/\/$/, "")}/${key}` : undefined;
  }
}

/** Build storage from env; falls back to {@link disabledStorage} if unconfigured. */
export function createStorageFromEnv(): StoragePort {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return disabledStorage;
  }
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return new S3Storage(client, env.S3_BUCKET_MEDIA, env.S3_PUBLIC_BASE_URL);
}

/** Storage key layout for a video's mirrored media. */
export const mediaKeys = {
  thumbnail: (youtubeId: string, name: string) => `videos/${youtubeId}/thumb-${name}.jpg`,
  audio: (youtubeId: string) => `videos/${youtubeId}/audio.m4a`,
};
