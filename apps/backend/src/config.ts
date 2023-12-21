import OpenAI from "openai";

export interface HonoConfig {
  Bindings: {
    OPENAI_API_KEY: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
  };
  Variables: {
    openai: OpenAI;
  };
}
