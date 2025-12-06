export function weightedAverage(scores, times, halfLifeHours = 6) {
  if (!scores || scores.length === 0) return 0;
  const now = Date.now();
  const lambda = Math.log(2) / (halfLifeHours * 3600 * 1000);
  let num = 0, den = 0;
  for (let i = 0; i < scores.length; i++) {
    const age = Math.max(0, now - (times[i] || now));
    const w = Math.exp(-lambda * age);
    num += scores[i] * w;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}
