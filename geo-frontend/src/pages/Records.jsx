import { useState, useEffect, useMemo } from "react";
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

  const formatValue = (value) => {
    if (value == null) return "-";
    const num = Number(value);
    if (num < 1) return num.toFixed(3);
    if (num < 10) return num.toFixed(1);
    return num.toFixed(1);
  };

  // ✅ Filter & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, country, temp, pm25
  const [groupByCountry, setGroupByCountry] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  // Redirect nếu chưa login
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Fetch saved records (TIME-SERIES CLEAN VERSION)
  const fetchRecords = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/records");
      const data = res.data || [];

      const normalized = data.map((r) => {
        const meta = r.meta || {};

        const metadata = {
          country: meta.country,
          capital: meta.capital,
          population: meta.population,
          currency: meta.currency,
          languages: meta.languages,
          flag: meta.flag,
          region: meta.region,
          subregion: meta.subregion,
          countryCode: meta.countryCode,
        };

        const weather = {
          temperature: r.temperature,
          feelsLike: r.feelsLike,
          humidity: r.humidity,
          pressure: r.pressure,
          description: r.weatherDescription,
        };

        // Build airQuality array từ pm25
        const airQuality =
          r.pm25 != null
            ? [
                {
                  // locationName: metadata.capital || metadata.country,
                  parameter: "PM2.5",
                  value: r.pm25,
                  unit: "µg/m³",
                  // measuredAt: r.timestamp,
                  status: r.airQualityStatus,
                },
              ]
            : [];

        return {
          ...r,
          metadata,
          country: metadata.country,
          weather,
          airQuality,
        };
      });

      setRecords(normalized);
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
      const recordId = rec.meta?.recordId || rec._id;
      setDeleting(recordId);

      // Optimistic UI - xóa theo recordId
      setRecords((prev) =>
        prev.filter((r) => {
          const rId = r.meta?.recordId || r._id;
          return rId !== recordId;
        }),
      );

      await api.delete(`/records/${recordId}`);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to delete snapshot.");

      // rollback
      setRecords((prev) => [...prev, rec]);
    } finally {
      setDeleting(null);
    }
  };

  /* ======================
        FILTER & SORT LOGIC
      ====================== */
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = [...records];

    // 🔍 SEARCH FILTER
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.metadata?.country?.toLowerCase().includes(term) ||
          r.metadata?.capital?.toLowerCase().includes(term),
      );
    }

    // 📊 SORT
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.timestamp) - new Date(a.timestamp);
        case "oldest":
          return new Date(a.timestamp) - new Date(b.timestamp);
        case "country":
          return (a.metadata?.country || "").localeCompare(
            b.metadata?.country || "",
          );
        case "temp":
          return (b.temperature || 0) - (a.temperature || 0);
        case "pm25":
          return (b.pm25 || 0) - (a.pm25 || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [records, searchTerm, sortBy]);

  /* ======================
        GROUP BY COUNTRY
      ====================== */
  const groupedRecords = useMemo(() => {
    if (!groupByCountry) return null;

    const groups = {};
    filteredAndSortedRecords.forEach((rec) => {
      const country = rec.metadata?.country || "Unknown";
      if (!groups[country]) {
        groups[country] = [];
      }
      groups[country].push(rec);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAndSortedRecords, groupByCountry]);

  /* ======================
        STATS
      ====================== */
  const stats = useMemo(() => {
    const uniqueCountries = new Set(
      records.map((r) => r.metadata?.country).filter(Boolean),
    );
    const avgTemp =
      records.reduce((sum, r) => sum + (r.temperature || 0), 0) /
        records.length || 0;
    const avgPM25 =
      records.filter((r) => r.pm25).reduce((sum, r) => sum + r.pm25, 0) /
        records.filter((r) => r.pm25).length || 0;

    return {
      total: records.length,
      countries: uniqueCountries.size,
      avgTemp: avgTemp.toFixed(1),
      avgPM25: avgPM25.toFixed(1),
    };
  }, [records]);

  /* ======================
        RENDER CARD
      ====================== */
  const renderCard = (rec) => {
    const recordId = rec.meta?.recordId || rec._id;

    return (
      <div
        key={recordId}
        className={`bg-white rounded-lg shadow-sm relative border ${
          viewMode === "list" ? "flex gap-3 p-3" : "p-3"
        }`}
      >
        <div className={viewMode === "list" ? "flex-1" : ""}>
          {/* COUNTRY TITLE */}
          <h2 className="text-lg font-semibold text-blue-600 mb-1">
            {rec.country || "Unknown"}
          </h2>

          {/* TIMESTAMP */}
          {rec.timestamp && (
            <p className="text-gray-400 text-xs mb-2">
              {new Date(rec.timestamp).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* QUICK SUMMARY ROW */}
          <div className="flex flex-wrap gap-3 text-sm mb-2">
            {rec.temperature != null && <span>🌡️ {formatValue(rec.temperature)}°C</span>}
            {rec.weather?.humidity != null && (
              <span>💧 {rec.weather.humidity}%</span>
            )}
            {rec.pm25 != null && <span>🏭 {formatValue(rec.pm25)} µg/m³</span>}
          </div>

          {/* COLLAPSIBLE DETAILS (nhỏ gọn hơn) */}
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer text-blue-500">
              View details
            </summary>
            <div className="mt-2 space-y-2">
              <CountryCard
                metadata={rec.metadata}
                country={rec.metadata?.country}
              />
              <WeatherCard
                weather={rec.weather || {}}
                capital={rec.metadata?.capital || "N/A"}
              />
              <AirQualityCard airQuality={rec.airQuality || []} />
            </div>
          </details>
        </div>

        {/* DELETE BUTTON */}
        <button
          onClick={() => handleDelete(rec)}
          disabled={deleting === recordId}
          className={`absolute top-2 right-2 text-xs px-2 py-1 rounded ${
            deleting === recordId
              ? "bg-gray-400 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {deleting === recordId ? "..." : "✕"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-600">
            📚 Saved Snapshots
          </h1>
          {/* STATS */}
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>📊 {stats.total} records</span>
            <span>🌍 {stats.countries} countries</span>
            {stats.total > 0 && (
              <>
                <span>🌡️ {stats.avgTemp}°C avg</span>
                {stats.avgPM25 !== "NaN" && (
                  <span>🏭 {stats.avgPM25} PM2.5 avg</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchRecords}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* FILTERS & CONTROLS */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* SEARCH */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search country or capital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border p-2 pl-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* SORT */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="country">Country A-Z</option>
            <option value="temp">🌡️ Highest temperature</option>
            <option value="pm25">🏭 Highest PM2.5</option>
          </select>

          {/* GROUP */}
          <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={groupByCountry}
              onChange={(e) => setGroupByCountry(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Group by country</span>
          </label>

          {/* VIEW MODE */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex-1 p-2 rounded border ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              ▦ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 p-2 rounded border ${
                viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              ☰ List
            </button>
          </div>
        </div>

        {/* RESULT COUNT */}
        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredAndSortedRecords.length} of {records.length} records
          {searchTerm && (
            <span className="font-semibold"> matching "{searchTerm}"</span>
          )}
        </p>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        </div>
      )}

      {/* ERROR */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* EMPTY STATE */}
      {!loading && records.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No snapshots saved yet.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Go to Dashboard to create your first snapshot
          </button>
        </div>
      )}

      {/* NO RESULTS */}
      {!loading &&
        records.length > 0 &&
        filteredAndSortedRecords.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              No records match your search "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Clear search
            </button>
          </div>
        )}

      {/* RECORDS DISPLAY */}
      {!loading && filteredAndSortedRecords.length > 0 && (
        <>
          {/* GROUPED VIEW */}
          {groupByCountry && groupedRecords ? (
            <div className="space-y-6">
              {groupedRecords.map(([country, countryRecords]) => (
                <div key={country}>
                  <h2 className="text-2xl font-bold mb-4 text-gray-700 flex items-center gap-2">
                    {countryRecords[0]?.metadata?.flag && (
                      <img
                        src={countryRecords[0].metadata.flag}
                        alt={country}
                        className="w-6 h-4 object-cover rounded-sm"
                      />
                    )}
                    <span>{country}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({countryRecords.length} records)
                    </span>
                  </h2>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "space-y-4"
                    }
                  >
                    {countryRecords.map(renderCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* NORMAL VIEW */
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
                  : "space-y-4"
              }
            >
              {filteredAndSortedRecords.map(renderCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
