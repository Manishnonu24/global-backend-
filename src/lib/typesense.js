import Typesense from "typesense";

let client = null;

export function getTypesenseClient() {
  if (client) {
    return client;
  }

  if (!isTypesenseConfigured()) {
    throw new Error("Typesense is not fully configured");
  }

  client = new Typesense.Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST,
        port: Number(process.env.TYPESENSE_PORT || 8108),
        protocol: process.env.TYPESENSE_PROTOCOL || "http",
      },
    ],
    apiKey: process.env.TYPESENSE_ADMIN_API_KEY,
    connectionTimeoutSeconds: 5,
  });

  return client;
}

export function isTypesenseConfigured() {
  return Boolean(process.env.TYPESENSE_ADMIN_API_KEY && process.env.TYPESENSE_HOST);
}
