import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CountryCard from "../components/CountryCard";
import WeatherCard from "../components/WeatherCard";
import AirQualityCard from "../components/AirQualityCard";
import { getUser } from "../utils/auth";

export default function Records() {
  const user = getUser();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  // Nếu chưa login → đá về login
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Fetch saved records
  const fetchRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/records");
      const data = res.data || [];

      // Nếu record thiếu AQ → fetch bổ sung
      const recordsWithAQ = await Promise.all(
        data.map(async (rec) => {
          if (!rec.airQuality || (Array.isArray(rec.airQuality) && rec.airQuality.length === 0)) {
            try {
              const aqRes = await api.get("/records/geo/airquality", {
                params: {
                  city: rec.metadata?.capital || rec.country,
                  country: rec.metadata?.countryCode,
                },
              });

              console.debug("AQ response for", rec.country, aqRes.data);
              const payload = aqRes.data || {};

              // Extract candidate items from common shapes
              let items = [];
              if (Array.isArray(payload)) items = payload;
              else if (Array.isArray(payload.results)) items = payload.results;
              else if (Array.isArray(payload.data)) items = payload.data;
              else if (Array.isArray(payload.measurements)) items = payload.measurements;
              else if (Array.isArray(payload.results?.measurements)) items = payload.results.measurements;
              else if (Object.keys(payload).length) items = [payload];

              // If still empty, try to convert flat pollutant object { pm25: 12, pm10: 20, ... }
              if (items.length === 0 && typeof payload === "object") {
                const pollutantKeys = ["pm25", "pm2_5", "pm10", "no2", "so2", "o3", "co", "aqi"];
                const found = pollutantKeys.filter((k) => payload[k] != null);
                if (found.length) {
                  items = found.map((k) => ({
                    parameter: k,
                    value: payload[k],
                    unit: payload.unit || "µg/m³",
                    measuredAt: payload.timestamp || payload.date || new Date().toISOString(),
                    location: payload.location || rec.metadata?.capital || rec.country,
                    description: payload.message || undefined,
                  }));
                }
              }

               // Map to the shape AirQualityCard expects
               const normalized = items
                 .map((r) => ({
                   locationName: r.location || r.station || r.city || r.locationName || r.name,
                   parameter: r.parameter || r.param || r.pollutant || r.name,
                   measuredAt: r.measuredAt || r.date?.utc || r.date || r.timestamp || r.datetime || r.measured_at,
                   value: r.value ?? r.measurement ?? r.avg ?? r.concentration,
                   unit: r.unit || r.u || r.measurementUnit,
                   status: r.category || r.status || r.aqiCategory || (r.aqi ? `AQI ${r.aqi}` : undefined),
                   advisory: r.description || r.advisory || r.description,
                 }))
                 .filter((x) => x.value !== undefined); // drop items without numeric value
 
              // If still empty, try fallback if present, else set empty array
              if (normalized.length) {
                rec.airQuality = normalized;
              } else if (rec.airQualityFallback && rec.airQualityFallback.length) {
                console.debug("Using fallback AQ for", rec.country);
                rec.airQuality = rec.airQualityFallback;
              } else {
                console.debug("No AQ data available for", rec.country, payload);
                rec.airQuality = [];
              }
            } catch (err) {
              console.warn("AQ fetch failed for", rec.country, err?.message || err);
              rec.airQuality = [];
            }
          }
         return rec;
       })
     );

      setRecords(recordsWithAQ);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (rec) => {
    try {
      setDeleting(rec._id);

      // Optimistic UI
      setRecords((prev) => prev.filter((r) => r._id !== rec._id));

      await api.delete(`/records/${rec._id}`);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to delete snapshot.");

      // rollback
      setRecords((prev) => [...prev, rec]);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6 gap-2">
        <h1 className="text-3xl font-bold text-purple-600">
          📚 Saved Snapshots
        </h1>
        <div className="flex gap-2">
          <button
            onClick={fetchRecords}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Empty */}
      {!loading && records.length === 0 && (
        <p className="text-gray-500">No snapshots saved yet.</p>
      )}

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.map((rec) => (
          <div
            key={rec._id}
            className="bg-white p-4 rounded-xl shadow-md relative"
          >
            <h2 className="text-xl font-semibold text-blue-600 mb-1">
              {rec.country || "Unknown Country"}
            </h2>

            {rec.createdAt && (
              <p className="text-gray-400 text-sm mb-2">
                Saved: {new Date(rec.createdAt).toLocaleString()}
              </p>
            )}

            <CountryCard metadata={rec.metadata || {}} />
            <WeatherCard
              weather={rec.weather || {}}
              capital={rec.metadata?.capital || "N/A"}
            />
            <AirQualityCard airQuality={rec.airQuality || []} />

            <button
              onClick={() => handleDelete(rec)}
              disabled={deleting === rec._id}
              className={`absolute top-2 right-2 px-2 py-1 text-white rounded ${
                deleting === rec._id
                  ? "bg-gray-400"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {deleting === rec._id ? "Deleting..." : "Delete"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
