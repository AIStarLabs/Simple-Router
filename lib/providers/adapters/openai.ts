// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { OpenAICompatibleProvider } from "./base";

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(opts: { baseUrl: string }) {
    super({ type: "openai", baseUrl: opts.baseUrl, orgHeader: true });
  }
}
