import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const podcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(4000).optional(),
  author: z.string().max(200).optional(),
  artwork: z.string().url().optional().or(z.literal("")),
  language: z.string().default("en"),
  category: z.string().optional(),
  explicit: z.boolean().default(false),
});

export const addContentSchema = z.object({
  url: z
    .string()
    .url("Invalid URL")
    .refine(
      (url) =>
        url.includes("youtube.com") || url.includes("youtu.be"),
      "Must be a YouTube URL"
    ),
});

export const reorderSchema = z.object({
  episodeIds: z.array(z.string()),
});
