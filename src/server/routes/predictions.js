import { Router } from 'express';
import { fetchPredictions, fetchPredictionsNearby, AGENCIES } from '../services/swiftly.js';

const router = Router();

const predictionCache = new Map();
const CACHE_TTL_MS = 15_000;

function getCached(key) {
  const entry = predictionCache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCache(key, data) {
  predictionCache.set(key, { data, time: Date.now() });
}

router.get('/stop/:stopId', async (req, res) => {
  const { stopId } = req.params;
  const { agency, number } = req.query;

  try {
    const agencies = agency ? [agency] : AGENCIES;
    const allPredictions = [];

    for (const ag of agencies) {
      const cacheKey = `${ag}:${stopId}:${number || 3}`;
      let data = getCached(cacheKey);

      if (!data) {
        try {
          data = await fetchPredictions(ag, stopId, number || 3);
          setCache(cacheKey, data);
        } catch {
          continue;
        }
      }

      if (data?.data?.predictionsData) {
        allPredictions.push(...data.data.predictionsData);
      }
    }

    res.json({ stopId, predictions: allPredictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions', detail: err.message });
  }
});

router.get('/nearby', async (req, res) => {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query params required' });
  }

  try {
    const allPredictions = [];

    for (const agency of AGENCIES) {
      const cacheKey = `nearby:${agency}:${lat}:${lon}:${radius || 500}`;
      let data = getCached(cacheKey);

      if (!data) {
        try {
          data = await fetchPredictionsNearby(agency, lat, lon, radius || 500);
          setCache(cacheKey, data);
        } catch {
          continue;
        }
      }

      if (data?.data?.predictionsData) {
        allPredictions.push(
          ...data.data.predictionsData.map(p => ({ ...p, agency }))
        );
      }
    }

    allPredictions.sort((a, b) => (a.distanceToStop || 0) - (b.distanceToStop || 0));
    res.json({ predictions: allPredictions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nearby predictions', detail: err.message });
  }
});

export default router;
