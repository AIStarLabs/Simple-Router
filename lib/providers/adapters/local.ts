// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { OpenAICompatibleProvider } from "./base";

/**
 * Ollama, vLLM, LM Studio, Open WebUI, and other OpenAI-compatible self-hosted
 * servers. The user only configures a base URL and (optionally) an API key.
 */
export class LocalProvider extends OpenAICompatibleProvider {
  constructor(opts: { baseUrl: string }) {
    super({ type: "local", baseUrl: opts.baseUrl });
  }
}
