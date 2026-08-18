// Live runtime map of stopped/failing models on OpenRouter (with 2-minute cooldown)
const runtimeStoppedModels = new Map<string, { until: number; reason: string }>();

export function recordStoppedModel(modelId: string, reason: string = "Stopped / Rate Limited (429)") {
  runtimeStoppedModels.set(modelId, {
    until: Date.now() + 2 * 60 * 1000,
    reason: reason.slice(0, 80),
  });
}

export function recordActiveModel(modelId: string) {
  runtimeStoppedModels.delete(modelId);
}

export function isModelStopped(modelId: string): boolean {
  const record = runtimeStoppedModels.get(modelId);
  if (!record) return false;
  if (Date.now() > record.until) {
    runtimeStoppedModels.delete(modelId);
    return false;
  }
  return true;
}
