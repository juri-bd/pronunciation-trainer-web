export function normalizeAudio(input: Float32Array): Float32Array {
  let peak = 0;

  for (const sample of input) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak === 0) {
    return input.slice();
  }

  const output = new Float32Array(input.length);

  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] / peak;
  }

  return output;
}