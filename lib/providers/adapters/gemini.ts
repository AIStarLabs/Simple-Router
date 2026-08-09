// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { OpenAICompatibleProvider } from "./base";

/**
 * Google Gemini exposes an OpenAI-compatible surface under /v1beta/openai.
 */
export class GeminiProvider extends OpenAICompatibleProvider {
  constructor(opts: { baseUrl: string }) {
    super({ type: "gemini", baseUrl: opts.baseUrl });
  }
}
