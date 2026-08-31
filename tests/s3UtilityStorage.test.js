import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  storeMediaFile,
  getObjectFromS3,
} from "../utils/s3Utility";

describe("S3 Utility Storage & Fallback Hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Production Write Protection", () => {
    it("should throw error and NOT call writeLocalMediaFile when S3 is unconfigured in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.S3_ACCESS_KEY;
      delete process.env.S3_SECRET_KEY;
      delete process.env.S3_BUCKET;

      const writeFileSpy = vi.spyOn(fs.promises, "writeFile").mockImplementation(async () => {});

      await expect(
        storeMediaFile("AHP", "test/file.jpg", {
          originalname: "file.jpg",
          buffer: Buffer.from("test"),
          mimetype: "image/jpeg",
        })
      ).rejects.toThrow(/S3 is not configured/);

      expect(writeFileSpy).not.toHaveBeenCalled();
    });
  });

  describe("2. FORCE_S3 Protection", () => {
    it("should throw error and NOT call writeLocalMediaFile when FORCE_S3=true in development without S3", async () => {
      process.env.NODE_ENV = "development";
      process.env.FORCE_S3 = "true";
      process.env.ALLOW_LOCAL_MEDIA_STORAGE = "true";
      delete process.env.S3_ACCESS_KEY;
      delete process.env.S3_SECRET_KEY;
      delete process.env.S3_BUCKET;

      const writeFileSpy = vi.spyOn(fs.promises, "writeFile").mockImplementation(async () => {});

      await expect(
        storeMediaFile("AHP", "test/file.jpg", {
          originalname: "file.jpg",
          buffer: Buffer.from("test"),
          mimetype: "image/jpeg",
        })
      ).rejects.toThrow(/S3 is not configured/);

      expect(writeFileSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. S3 Failure Protection", () => {
    it("should propagate S3 upload error and NOT fall back to writeLocalMediaFile when S3 is configured but upload fails", async () => {
      process.env.NODE_ENV = "production";
      process.env.S3_ACCESS_KEY = "mockKey";
      process.env.S3_SECRET_KEY = "mockSecret";
      process.env.S3_BUCKET = "mockBucket";

      const writeFileSpy = vi.spyOn(fs.promises, "writeFile").mockImplementation(async () => {});

      await expect(
        storeMediaFile("AHP", "test/file.jpg", {
          originalname: "file.jpg",
          buffer: Buffer.from("test"),
          mimetype: "image/jpeg",
        })
      ).rejects.toThrow(/S3 Media Storage Error/);

      expect(writeFileSpy).not.toHaveBeenCalled();
    });
  });

  describe("4. Development Local Upload", () => {
    it("should allow writeLocalMediaFile when in development mode and ALLOW_LOCAL_MEDIA_STORAGE=true", async () => {
      process.env.NODE_ENV = "development";
      process.env.FORCE_S3 = "false";
      process.env.ALLOW_LOCAL_MEDIA_STORAGE = "true";
      delete process.env.S3_ACCESS_KEY;
      delete process.env.S3_SECRET_KEY;
      delete process.env.S3_BUCKET;

      vi.spyOn(fs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(fs.promises, "writeFile").mockResolvedValue(undefined);

      const result = await storeMediaFile("AHP", "test/file.jpg", {
        originalname: "file.jpg",
        buffer: Buffer.from("test"),
        mimetype: "image/jpeg",
      });

      expect(result).toBe("/uploads/site-AHP/file.jpg");
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe("5. Production Media Read Protection", () => {
    it("should propagate S3 GetObject failure and NOT check/return local files in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_LOCAL_MEDIA_STORAGE = "false";
      process.env.S3_ACCESS_KEY = "mockKey";
      process.env.S3_SECRET_KEY = "mockSecret";
      process.env.S3_BUCKET = "mockBucket";

      const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);

      await expect(getObjectFromS3("site-AHP/test.jpg")).rejects.toThrow();
      expect(existsSpy).not.toHaveBeenCalled();
    });
  });

  describe("6. Development Media Read Fallback", () => {
    it("should attempt local disk read when S3 GetObject fails in development with ALLOW_LOCAL_MEDIA_STORAGE=true", async () => {
      process.env.NODE_ENV = "development";
      process.env.ALLOW_LOCAL_MEDIA_STORAGE = "true";
      process.env.S3_ACCESS_KEY = "mockKey";
      process.env.S3_SECRET_KEY = "mockSecret";
      process.env.S3_BUCKET = "mockBucket";

      const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(true);
      const readFileSpy = vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("dummy-image-content"));

      const result = await getObjectFromS3("site-AHP/test.jpg");
      expect(existsSpy).toHaveBeenCalled();
      expect(readFileSpy).toHaveBeenCalled();
      expect(result.contentType).toBe("image/jpeg");
      expect(result.body.toString()).toBe("dummy-image-content");
    });
  });
});
