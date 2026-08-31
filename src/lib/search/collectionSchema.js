export const CONTENT_COLLECTION_SCHEMA = {
  name: "content_v1",
  fields: [
    {
      name: "type",
      type: "string",
      facet: true,
    },
    {
      name: "sourceId",
      type: "string",
    },
    {
      name: "title",
      type: "string",
    },
    {
      name: "summary",
      type: "string",
      optional: true,
    },
    {
      name: "content",
      type: "string",
      optional: true,
    },
    {
      name: "slug",
      type: "string",
      optional: true,
    },
    {
      name: "url",
      type: "string",
    },
    {
      name: "category",
      type: "string",
      facet: true,
      optional: true,
    },
    {
      name: "tags",
      type: "string[]",
      facet: true,
      optional: true,
    },
    {
      name: "imageUrl",
      type: "string",
      optional: true,
    },
    {
      name: "publishedAt",
      type: "int64",
      optional: true,
    },
    {
      name: "updatedAt",
      type: "int64",
    },
    {
      name: "sortOrder",
      type: "int32",
      optional: true,
    },
  ],
  default_sorting_field: "updatedAt",
};
