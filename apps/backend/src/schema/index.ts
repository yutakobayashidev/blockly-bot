import { object, string, union, literal } from "valibot";

export const buildSchema = object({
  prompt: string(),
  level: union([
    literal("beginner"),
    literal("intermediate"),
    literal("advanced"),
  ]),
});

export const insightSchema = object({
  image: string(),
  xml: string(),
  level: union([
    literal("beginner"),
    literal("intermediate"),
    literal("advanced"),
  ]),
});
