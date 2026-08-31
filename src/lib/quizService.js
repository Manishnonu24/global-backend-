/**
 * Centralized quiz data-fetching service.
 * All quiz DB access for the public-facing pages goes through here —
 * neither raw Prisma calls in page components nor duplicated route logic.
 */
import prisma from "@/lib/prisma";

/**
 * Parse the options field (stored as JSON string or comma-separated string)
 * and resolve the correct-answer index.
 *
 * @param {import('@prisma/client').Quiz} q
 * @returns {{ id, text, options, correctAnswer, explanation }}
 */
export function formatQuizQuestion(q) {
  let parsedOptions = [];
  try {
    parsedOptions = JSON.parse(q.options);
    if (!Array.isArray(parsedOptions)) {
      parsedOptions = q.options.split(",").map((o) => o.trim());
    }
  } catch {
    parsedOptions = q.options.split(",").map((o) => o.trim());
  }

  let corrAnswerIndex = 0;
  if (!isNaN(Number(q.correctAnswer))) {
    corrAnswerIndex = Number(q.correctAnswer);
  } else {
    const foundIdx = parsedOptions.findIndex(
      (o) => o.toLowerCase() === q.correctAnswer.toLowerCase()
    );
    if (foundIdx !== -1) corrAnswerIndex = foundIdx;
  }

  return {
    id: q.id,
    text: q.question,
    options: parsedOptions.map((opt, idx) => ({
      label: opt,
      score: idx === corrAnswerIndex ? 3 : 0,
    })),
    correctAnswer: corrAnswerIndex,
    explanation: q.explanation || "",
  };
}

/**
 * Fetch all quiz questions for a given category from the database.
 * For "general-wellness", also includes rows where category is NULL.
 *
 * @param {string} category  e.g. "general-wellness" | "sleep" | …
 * @returns {Promise<Array>} formatted question objects, or [] on error
 */
export async function getQuizQuestionsByCategory(category) {
  try {
    const where =
      category === "general-wellness"
        ? { OR: [{ category: "general-wellness" }, { category: null }] }
        : { category };

    const rows = await prisma.quiz.findMany({
      where,
      orderBy: { id: "asc" },
    });

    return rows.map(formatQuizQuestion);
  } catch (err) {
    console.error(`[quizService] getQuizQuestionsByCategory(${category}) error:`, err);
    return [];
  }
}
