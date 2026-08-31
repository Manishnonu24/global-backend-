import { err } from "./response";

export async function apiHandler(fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(error);

    return err(error.message || "Server Error", "SERVER_ERROR", 500);
  }
}
