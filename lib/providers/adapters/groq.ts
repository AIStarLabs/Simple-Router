// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { OpenAICompatibleProvider } from "./base";

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(opts: { baseUrl: string }) {
    super({ type: "groq", baseUrl: opts.baseUrl });
  }
}
