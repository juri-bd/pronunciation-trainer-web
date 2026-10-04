export interface PhonemeInference {
  logits: Float32Array;
  frameCount: number;
  vocabularySize: number;
  vocabulary: string[];
  frameDurationMs: number;
}

export type InferenceBackend = "webgpu" | "wasm";

export type ModelStatus =
  | "unloaded"
  | "loading"
  | "ready"
  | "error";