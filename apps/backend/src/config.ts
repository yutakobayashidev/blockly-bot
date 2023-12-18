import OpenAI from "openai";

export interface HonoConfig {
  Bindings: {
    OPENAI_API_KEY: string;
  };
  Variables: {
    openai: OpenAI;
  };
}
