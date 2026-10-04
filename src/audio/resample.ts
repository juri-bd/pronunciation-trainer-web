export function toMono(audioBuffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length } = audioBuffer;

  if (numberOfChannels === 1) {
    return audioBuffer.getChannelData(0).slice();
  }

  const mono = new Float32Array(length);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = audioBuffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / numberOfChannels;
    }
  }

  return mono;
}

export function resampleLinear(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000,
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return input.slice();
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const fraction = position - left;

    output[i] =
      input[left] * (1 - fraction) +
      input[right] * fraction;
  }

  return output;
}