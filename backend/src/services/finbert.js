import axios from 'axios';
const HF_API = process.env.HF_API_KEY;
const FINBERT_MODEL = 'yiyanghkust/finbert-tone';

export async function scoreWithFinBERT(text) {
  if (!HF_API) {
    const lower = text.toLowerCase();
    if (lower.includes('beat') || lower.includes('upgrade') || lower.includes('record')) return { compound: 0.7 };
    if (lower.includes('lawsuit') || lower.includes('recall') || lower.includes('down') || lower.includes('drop')) return { compound: -0.6 };
    return { compound: 0.0 };
  }

  try {
    const url = `https://api-inference.huggingface.co/models/${FINBERT_MODEL}`;
    const resp = await axios.post(url, { inputs: text }, {
      headers: { Authorization: `Bearer ${HF_API}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const out = resp.data;
    if (Array.isArray(out)) {
      const pos = out.find(o => /pos/i.test(o.label))?.score ?? 0;
      const neg = out.find(o => /neg/i.test(o.label))?.score ?? 0;
      const neu = out.find(o => /neu/i.test(o.label))?.score ?? 0;
      const compound = (pos - neg);
      return { pos, neg, neu, compound };
    } else if (out && out.label && typeof out.score === 'number') {
      const compound = out.label.toLowerCase().includes('positive') ? out.score : (out.label.toLowerCase().includes('negative') ? -out.score : 0);
      return { compound, raw: out };
    } else {
      return { compound: 0 };
    }
  } catch (err) {
    console.warn('FinBERT API error', err.message);
    return { compound: 0 };
  }
}
