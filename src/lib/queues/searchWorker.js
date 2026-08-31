import { Worker } from "bullmq";
import { getRedisClient } from "../redis";
import prisma from "../prisma";
import { getTypesenseClient, isTypesenseConfigured } from "../typesense";
import {
  buildSearchDocumentId,
  mapPostToSearchDocument,
  mapPageToSearchDocument,
  mapRecipeToSearchDocument,
  mapServiceToSearchDocument,
  mapMagazineToSearchDocument,
  mapQuizToSearchDocument,
} from "../search/documentMappers";
import { reportUnexpectedError } from "../observability/reportError";
import { logger } from "../logger";

let worker = null;
let loggedRedisDisabled = false;
let loggedTypesenseDisabled = false;

export function startSearchWorker() {
  if (worker) return worker;
  const connection = getRedisClient({ queue: true, name: "search-index-worker" });
  if (!connection) {
    if (!loggedRedisDisabled) {
      loggedRedisDisabled = true;
      logger.info("[SearchWorker] Redis is not configured. Worker disabled.");
    }
    return null;
  }

  if (!isTypesenseConfigured()) {
    if (!loggedTypesenseDisabled) {
      loggedTypesenseDisabled = true;
      logger.warn("[SearchWorker] Typesense is not configured. Worker will not start.");
    }
    return null;
  }

  worker = new Worker(
    "search-index",
    async (job) => {
      const { type, sourceId } = job.data;
      const client = getTypesenseClient();

      if (job.name === "delete-content") {
        const id = buildSearchDocumentId(type, sourceId);
        try {
          await client.collections("content").documents(id).delete();
        } catch (error) {
          // 404 means it's already deleted or was never indexed, which is a success condition for deletion.
          if (error.httpStatus !== 404) {
            throw error;
          }
        }
        return;
      }

      if (job.name === "upsert-content") {
        let document = null;

        if (type === "post") {
          const post = await prisma.post.findUnique({
            where: { id: sourceId },
            include: { categories: true, tags: true, featuredImage: true },
          });
          if (post) document = mapPostToSearchDocument(post);
        } else if (type === "page") {
          const page = await prisma.page.findUnique({
            where: { id: sourceId },
            include: { sections: true },
          });
          if (page) document = mapPageToSearchDocument(page);
        } else if (type === "recipe") {
          const recipe = await prisma.recipe.findUnique({
            where: { id: sourceId },
            include: { tags: true },
          });
          if (recipe) document = mapRecipeToSearchDocument(recipe);
        } else if (type === "service") {
          const service = await prisma.service.findUnique({
            where: { id: sourceId },
            include: { featuredImage: true },
          });
          if (service) document = mapServiceToSearchDocument(service);
        } else if (type === "magazine") {
          const magazine = await prisma.magazine.findUnique({
            where: { id: parseInt(sourceId, 10) },
          });
          if (magazine) document = mapMagazineToSearchDocument(magazine);
        } else if (type === "quiz") {
          const quizType = await prisma.quizType.findUnique({
            where: { id: parseInt(sourceId, 10) },
          });
          if (quizType) document = mapQuizToSearchDocument(quizType);
        }

        if (document) {
          await client.collections("content").documents().upsert(document);
        } else {
          // If the document is null, it means it's no longer public/searchable. We should ensure it's deleted.
          const id = buildSearchDocumentId(type, sourceId);
          try {
            await client.collections("content").documents(id).delete();
          } catch (error) {
            if (error.httpStatus !== 404) {
              throw error;
            }
          }
        }
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    reportUnexpectedError(err, { jobName: "search-index", jobId: job?.id });
  });

  return worker;
}
