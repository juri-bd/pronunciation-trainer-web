import type {
  InferenceBackend,
  ModelStatus,
  PhonemeInference,
} from "./types";

export interface PronunciationModel {
  readonly status: ModelStatus;
  readonly backend: InferenceBackend | null;

  load(): Promise<void>;

  infer(audio: Float32Array): Promise<PhonemeInference>;

  dispose(): Promise<void>;
}