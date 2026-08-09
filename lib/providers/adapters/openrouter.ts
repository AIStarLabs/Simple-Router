// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { OpenAICompatibleProvider } from "./base";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(opts: { baseUrl: string }) {
    super({ type: "openrouter", baseUrl: opts.baseUrl });
  }
}
