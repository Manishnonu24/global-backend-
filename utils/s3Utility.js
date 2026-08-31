import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

/**
 * Uploads a file to an S3-compatible bucket.
 * @param {string} folder - The destination folder in the bucket
 * @param {Object} file - File object containing originalname, buffer, and mimetype
 * @param {string} [customKey] - Optional custom key/path for the file in the bucket
 * @returns {Promise<string>} The uploaded file URL
 */
let s3ClientInstance = null;

export function getS3Config() {
  let endpoint = process.env.S3_ENDPOINT || process.env.ENDPOINT || process.env.AWS_ENDPOINT;
  if (endpoint && !/^https?:\/\//i.test(endpoint)) {
    endpoint = `https://${endpoint}`;
  }
  return {
    accessKeyId: (process.env.S3_ACCESS_KEY || process.env.ACCESSKEY || process.env.AWS_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (process.env.S3_SECRET_KEY || process.env.SECRETKEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
    region: (process.env.S3_REGION || process.env.REGION || process.env.AWS_REGION || "us-east-1").trim(),
    endpoint: endpoint ? endpoint.trim() : "",
    bucket: (process.env.S3_BUCKET || process.env.BUCKET || process.env.AWS_BUCKET_NAME || "").trim(),
  };
}

export function isS3Configured() {
  const config = getS3Config();
  return Boolean(config.accessKeyId && config.secretAccessKey && config.bucket);
}

/**
 * Constructs the direct S3 URL for a given object key.
 * @param {string} key - S3 object key (e.g. "site-AHP/123.webp")
 * @returns {string} The full HTTP/HTTPS S3 URL or proxy URL fallback
 */
export function getS3DirectUrl(key) {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_S3_BASE_URL;
  if (publicBaseUrl) {
    const cleanBase = publicBaseUrl.replace(/\/+$/, "");
    return `${cleanBase}/${key}`;
  }

  const { bucket, region, endpoint } = getS3Config();
  if (bucket) {
    if (endpoint) {
      const protocol = endpoint.startsWith("https") ? "https" : "http";
      const cleanedEndpoint = endpoint.replace(/^https?:\/\//, "");
      return `${protocol}://${cleanedEndpoint}/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.${region || "us-east-1"}.amazonaws.com/${key}`;
  }

  return `/api/media/view?key=${key}`;
}

/**
 * Throws a descriptive error if S3 is unconfigured in production environment or if FORCE_S3 is enabled.
 * Prevents silent fallback to local disk and ephemeral file loss on production hosts.
 */
export function assertS3ConfiguredInProduction() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.FORCE_S3 === "true";
  if (isProduction && !isS3Configured()) {
    throw new Error(
      "S3 is not configured — uploads cannot be stored persistently in production. Set S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET."
    );
  }
}

/**
 * Writes media file to local disk for development fallback.
 */
export async function writeLocalMediaFile(folder, fileName, buffer) {
  const fs = await import("fs");
  const path = await import("path");
  const subFolder = folder.startsWith("site-") ? folder : `site-${folder}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subFolder);
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const cleanFileName = fileName.split("/").pop();
  await fs.promises.writeFile(path.join(uploadsDir, cleanFileName), buffer);
  return `/uploads/${subFolder}/${cleanFileName}`;
}

/**
 * Shared media file uploader used across all upload routes.
 * Enforces S3 storage in production and prevents silent data loss.
 *
 * @param {string} siteId - Target site identifier (e.g. "AHP")
 * @param {string} key - Unique destination key/path
 * @param {Object} file - File object containing originalname, buffer, and mimetype
 * @returns {Promise<string>} The uploaded public media URL
 */
export async function storeMediaFile(siteId, key, file) {
  assertS3ConfiguredInProduction();

  if (isS3Configured()) {
    try {
      const folder = siteId.startsWith("site-") ? siteId : `site-${siteId}`;
      return await uploadToS3(folder, file, key);
    } catch (s3Err) {
      console.error(`[S3 Storage Error] Failed to upload ${key} to S3:`, s3Err);
      throw new Error(`S3 Media Storage Error: ${s3Err.message}`);
    }
  }

  const allowLocalStorage =
    process.env.NODE_ENV !== "production" &&
    process.env.FORCE_S3 !== "true" &&
    process.env.ALLOW_LOCAL_MEDIA_STORAGE === "true";

  if (!allowLocalStorage) {
    throw new Error("S3 is not configured and local media storage is disabled.");
  }

  return writeLocalMediaFile(siteId, key.split("/").pop(), file.buffer);
}

/**
 * Shared helper for magazine image uploads (cover, back, spine images).
 * Routes directly to storeMediaFile with production S3 enforcement.
 */
export async function uploadMagazineImageFile(siteId, file, folder = "magazines") {
  if (typeof file === "string") {
    if (!file || file.trim() === "") return "";
    return getS3DirectUrl(file);
  }
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return "";
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileExt = (file.name || "image.png").split(".").pop() || "png";
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  return await storeMediaFile(siteId, key, {
    originalname: file.name,
    buffer,
    mimetype: file.type,
  });
}

/**
 * Diagnostic health check for S3 connectivity & configuration.
 * Verifies credentials, configuration state, and tests bucket access.
 *
 * @returns {Promise<{ configured: boolean, healthy: boolean, bucket?: string, error?: string, warning?: string }>}
 */
export async function checkS3Health() {
  const configured = isS3Configured();
  if (!configured) {
    return {
      configured: false,
      healthy: false,
      error: "S3 environment variables not configured (S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)",
    };
  }

  const { bucket } = getS3Config();
  try {
    const s3Client = getS3Client();
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { configured: true, healthy: true, bucket };
  } catch (err) {
    if (err.name === "AccessDenied" || err.$metadata?.httpStatusCode === 403) {
      return {
        configured: true,
        healthy: true,
        bucket,
        warning: "S3 credentials configured; HeadBucket denied by bucket policy but upload permissions are active.",
      };
    }
    return { configured: true, healthy: false, bucket, error: err.message };
  }
}

/**
 * Lazily initializes and returns the S3Client instance.
 * @returns {S3Client}
 */
export function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const { accessKeyId, secretAccessKey, region, endpoint } = getS3Config();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials not fully configured in environment variables");
  }

  const s3Config = {
    region: region || "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  if (endpoint) {
    s3Config.endpoint = endpoint;
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1") || endpoint.includes("minio")) {
      s3Config.forcePathStyle = true;
    }
  }

  s3ClientInstance = new S3Client(s3Config);
  return s3ClientInstance;
}

/**
 * Uploads a file to an S3-compatible bucket.
 * @param {string} folder - The destination folder in the bucket
 * @param {Object} file - File object containing originalname, buffer, and mimetype
 * @param {string} [customKey] - Optional custom key/path for the file in the bucket
 * @returns {Promise<string>} The uploaded file URL
 */
export async function uploadToS3(folder, file, customKey = null) {
  const { bucket, region, endpoint } = getS3Config();

  if (!bucket) {
    throw new Error("S3 bucket not configured in environment variables");
  }

  const s3Client = getS3Client();
  const fileExtension = (file.originalname || "image.png").split(".").pop();
  const uniqueFileName = customKey || `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    })
  );

  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_S3_BASE_URL;
  if (publicBaseUrl) {
    const cleanBase = publicBaseUrl.replace(/\/+$/, "");
    return `${cleanBase}/${uniqueFileName}`;
  }

  if (endpoint) {
    const protocol = endpoint.startsWith("https") ? "https" : "http";
    const cleanedEndpoint = endpoint.replace(/^https?:\/\//, "");
    return `${protocol}://${cleanedEndpoint}/${bucket}/${uniqueFileName}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${uniqueFileName}`;
}

/**
 * Deletes an object from an S3-compatible bucket.
 * @param {string} key - The key/path of the object to delete
 * @returns {Promise<void>}
 */
export async function deleteFromS3(key) {
  const { bucket } = getS3Config();

  if (!bucket) {
    throw new Error("S3 bucket not configured in environment variables");
  }

  const s3Client = getS3Client();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Gets an object from an S3-compatible bucket as a Buffer along with metadata.
 * @param {string} key - The key/path of the object to retrieve
 * @returns {Promise<{body: Buffer, contentType: string, contentLength: number}>} The object data and metadata
 */
export async function getObjectFromS3(key) {
  const { bucket } = getS3Config();

  if (!bucket) {
    throw new Error("S3 bucket not configured in environment variables");
  }

  const s3Client = getS3Client();

  let response;
  try {
    response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (err) {
    const allowLocalStorage =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_LOCAL_MEDIA_STORAGE === "true";

    if (allowLocalStorage) {
      // Local disk fallback check (allowed ONLY for intentional local development)
      try {
        const fsMod = await import("fs");
        const fs = fsMod.default || fsMod;
        const pathMod = await import("path");
        const path = pathMod.default || pathMod;
        const localPath = path.join(process.cwd(), "public", "uploads", key);
        if (fs.existsSync(localPath)) {
          const promises = fs.promises || fsMod.promises;
          const fileBuffer = await promises.readFile(localPath);
          const ext = key.split(".").pop()?.toLowerCase();
          let mimeType = "application/octet-stream";
          if (ext === "webp") mimeType = "image/webp";
          else if (ext === "png") mimeType = "image/png";
          else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
          else if (ext === "pdf") mimeType = "application/pdf";
          else if (ext === "svg") mimeType = "image/svg+xml";

          return {
            body: fileBuffer,
            contentType: mimeType,
            contentLength: fileBuffer.length,
          };
        }
      } catch (fsErr) {
        // ignore fs error and propagate original S3 error
      }
    }

    // In production or when allowLocalStorage is false: do NOT check local disk, propagate S3 error directly.
    throw err;
  }

  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

  const buffer = await streamToBuffer(response.Body);

  return {
    body: buffer,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/**
 * Normalizes any S3 key, relative path, or full S3 URL into a clean object key.
 * @param {string} rawKey - S3 key or URL
 * @returns {string} The normalized S3 key (e.g. "site-AHP/magazines/123.pdf")
 */
export function normalizeS3Key(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return "";
  let cleanKey = rawKey.trim();

  if (cleanKey.startsWith("http://") || cleanKey.startsWith("https://")) {
    try {
      const parsed = new URL(cleanKey);
      cleanKey = parsed.pathname;
    } catch (_) { /* ignore */ }
  }

  cleanKey = cleanKey.split("?")[0];

  const bucket = (process.env.S3_BUCKET || process.env.BUCKET || process.env.AWS_BUCKET_NAME || "").trim();
  if (bucket && cleanKey.includes(`/${bucket}/`)) {
    cleanKey = cleanKey.split(`/${bucket}/`)[1] || cleanKey;
  }

  const siteIdx = cleanKey.indexOf("site-");
  if (siteIdx !== -1) {
    cleanKey = cleanKey.substring(siteIdx);
  }

  return cleanKey.replace(/^\/+/, "");
}

/**
 * Streams an object from S3 WITHOUT buffering it into memory.
 * Supports HTTP Range requests so PDF.js can fetch partial content.
 *
 * @param {string} key - S3 object key
 * @param {string|null} rangeHeader - Optional HTTP Range header value (e.g. "bytes=0-262143")
 * @returns {Promise<{
 *   body: ReadableStream,
 *   contentType: string,
 *   contentLength: number|null,
 *   contentRange: string|null,
 *   etag: string|null,
 *   lastModified: Date|null,
 *   acceptRanges: string|null,
 *   statusCode: number
 * }>}
 */
export async function getObjectStreamFromS3(key, rangeHeader = null) {
  const { bucket } = getS3Config();
  if (!bucket) throw new Error("S3 bucket not configured");

  const cleanKey = normalizeS3Key(key);
  if (!cleanKey) throw new Error("Invalid S3 object key");

  const s3Client = getS3Client();
  const params = { Bucket: bucket, Key: cleanKey };
  if (rangeHeader) params.Range = rangeHeader;

  const response = await s3Client.send(new GetObjectCommand(params));

  const webStream = response.Body.transformToWebStream
    ? response.Body.transformToWebStream()
    : response.Body;

  const rawStatus = response.$metadata?.httpStatusCode;
  const statusCode = rawStatus && rawStatus !== 200 ? rawStatus : (response.ContentRange ? 206 : 200);

  return {
    body: webStream,
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength ?? null,
    contentRange: response.ContentRange ?? null,
    etag: response.ETag ?? null,
    lastModified: response.LastModified ?? null,
    acceptRanges: response.AcceptRanges ?? "bytes",
    statusCode,
  };
}

/**
 * Fetches only the metadata of an S3 object (no body download).
 * Used for HEAD requests on media endpoints.
 *
 * @param {string} key - S3 object key
 * @returns {Promise<{
 *   contentType: string,
 *   contentLength: number|null,
 *   etag: string|null,
 *   lastModified: Date|null,
 *   acceptRanges: string
 * }>}
 */
export async function headObjectFromS3(key) {
  const { bucket } = getS3Config();
  if (!bucket) throw new Error("S3 bucket not configured");

  const cleanKey = normalizeS3Key(key);
  if (!cleanKey) throw new Error("Invalid S3 object key");

  const s3Client = getS3Client();
  const response = await s3Client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: cleanKey })
  );

  return {
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength ?? null,
    etag: response.ETag ?? null,
    lastModified: response.LastModified ?? null,
    acceptRanges: response.AcceptRanges ?? "bytes",
  };
}




