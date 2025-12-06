import axios from "axios";

export async function fetchNewsForTicker(ticker) {
  const apiKey = process.env.NEWS_API_KEY;

  console.log("Using API Key in newsFetcher:", apiKey);

  const url = `https://gnews.io/api/v4/search?q=${ticker}&lang=en&max=10&token=${apiKey}`;

  try {
    const res = await axios.get(url);
    return res.data.articles || [];
  } catch (err) {
    console.error("GNews error:", err.response?.data || err);
    return [];
  }
}
