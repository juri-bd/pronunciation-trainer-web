import {
  AutoFeatureExtractor,
  AutoModelForCTC,
} from "@huggingface/transformers";

import type { PronunciationModel } from "./PronunciationModel";
import type {
  InferenceBackend,
  ModelStatus,
  PhonemeInference,
} from "./types";
import { MODEL_CONFIG } from "./modelConfig";

type VocabularyFile = Record<string, number>;

export class Wav2Vec2PhonemeModel implements PronunciationModel {
  private model: any = null;
  private featureExtractor: any = null;
  private vocabulary: string[] = [];

  private _status: ModelStatus = "unloaded";
  private _backend: InferenceBackend | null = null;

  get status(): ModelStatus {
    return this._status;
  }

  get backend(): InferenceBackend | null {
    return this._backend;
  }

  async load(): Promise<void> {
    if (this._status === "ready") return;
    if (this._status === "loading") return;

    this._status = "loading";

    try {
      const [featureExtractor, vocabulary] = await Promise.all([
        AutoFeatureExtractor.from_pretrained(
          MODEL_CONFIG.modelId,
        ),
        this.loadVocabulary(),
      ]);

      this.featureExtractor = featureExtractor;
      this.vocabulary = vocabulary;

      this.model = await this.loadModelWithFallback();

      this._status = "ready";
    } catch (error) {
      this._status = "error";
      throw error;
    }
  }

  private async loadVocabulary(): Promise<string[]> {
    const baseUrl =
        `https://huggingface.co/${MODEL_CONFIG.modelId}/resolve/main`;

    const [vocabResponse, addedTokensResponse] = await Promise.all([
        fetch(`${baseUrl}/vocab.json`),
        fetch(`${baseUrl}/added_tokens.json`),
    ]);

    if (!vocabResponse.ok) {
        throw new Error(
        `Could not load vocab.json: ${vocabResponse.status} ${vocabResponse.statusText}`,
        );
    }

    if (!addedTokensResponse.ok) {
        throw new Error(
        `Could not load added_tokens.json: ${addedTokensResponse.status} ${addedTokensResponse.statusText}`,
        );
    }

    const vocab =
        (await vocabResponse.json()) as Record<string, number>;

    const addedTokens =
        (await addedTokensResponse.json()) as Record<string, number>;

    const combined = {
        ...vocab,
        ...addedTokens,
    };

    const vocabulary: string[] = [];

    for (const [token, id] of Object.entries(combined)) {
        vocabulary[id] = token;
    }

    return vocabulary;
    }

  private async loadModelWithFallback() {
    try {
      const model = await AutoModelForCTC.from_pretrained(
        MODEL_CONFIG.modelId,
        {
          dtype: MODEL_CONFIG.dtype,
          device: "webgpu",
        },
      );

      this._backend = "webgpu";
      return model;
    } catch (error) {
      console.warn(
        "WebGPU failed. Falling back to WASM.",
        error,
      );

      const model = await AutoModelForCTC.from_pretrained(
        MODEL_CONFIG.modelId,
        {
          dtype: MODEL_CONFIG.dtype,
          device: "wasm",
        },
      );

      this._backend = "wasm";
      return model;
    }
  }

  async infer(
    audio: Float32Array,
  ): Promise<PhonemeInference> {
    if (this._status !== "ready") {
      throw new Error("Pronunciation model is not loaded.");
    }

    const maxSamples =
      MODEL_CONFIG.sampleRate *
      MODEL_CONFIG.maxAudioSeconds;

    if (audio.length > maxSamples) {
      throw new Error(
        `Audio must be ${MODEL_CONFIG.maxAudioSeconds} seconds or shorter.`,
      );
    }

    const inputs =
      await this.featureExtractor(audio);

    const output =
      await this.model(inputs);

    const logits = output.logits;

    if (
      !logits.dims ||
      logits.dims.length !== 3 ||
      logits.dims[0] !== 1
    ) {
      throw new Error(
        `Unexpected logits shape: ${logits.dims}`,
      );
    }

    const frameCount = logits.dims[1];
    const vocabularySize = logits.dims[2];

    if (vocabularySize !== this.vocabulary.length) {
      throw new Error(
        `Vocabulary mismatch: model=${vocabularySize}, vocab=${this.vocabulary.length}`,
      );
    }

    const audioDurationMs =
      (audio.length / MODEL_CONFIG.sampleRate) * 1000;

    return {
      logits: new Float32Array(logits.data),
      frameCount,
      vocabularySize,
      vocabulary: this.vocabulary,
      frameDurationMs:
        audioDurationMs / frameCount,
    };
  }

  async dispose(): Promise<void> {
    if (this.model?.dispose) {
      await this.model.dispose();
    }

    this.model = null;
    this.featureExtractor = null;
    this.vocabulary = [];

    this._status = "unloaded";
    this._backend = null;
  }
}