import { z } from "zod";

/** Validation Zod pour la réponse Google Books API */
export const GoogleBooksVolumeSchema = z.object({
  totalItems: z.number(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        volumeInfo: z.object({
          title: z.string(),
          authors: z.array(z.string()).optional().default([]),
          publisher: z.string().optional().default("Inconnu"),
          publishedDate: z.string().optional().default(""),
          imageLinks: z
            .object({
              thumbnail: z.string().optional(),
              smallThumbnail: z.string().optional(),
            })
            .optional(),
          industryIdentifiers: z
            .array(
              z.object({
                type: z.string(),
                identifier: z.string(),
              }),
            )
            .optional()
            .default([]),
          description: z.string().optional(),
          categories: z.array(z.string()).optional().default([]),
          pageCount: z.number().optional(),
          averageRating: z.number().optional(),
          ratingsCount: z.number().optional(),
        }),
        saleInfo: z
          .object({
            listPrice: z
              .object({
                amount: z.number(),
                currencyCode: z.string(),
              })
              .optional(),
            retailPrice: z
              .object({
                amount: z.number(),
                currencyCode: z.string(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .default([]),
});

/** Validation Zod pour la réponse Open Library API */
export const OpenLibraryBookSchema = z.record(
  z.string(),
  z.object({
    title: z.string(),
    authors: z
      .array(z.object({ name: z.string() }))
      .optional()
      .default([]),
    publishers: z
      .array(z.object({ name: z.string() }))
      .optional()
      .default([]),
    publish_date: z.string().optional().default(""),
    cover: z
      .object({
        medium: z.string().optional(),
        large: z.string().optional(),
      })
      .optional(),
  }),
);
