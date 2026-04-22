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

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [groupByCountry, setGroupByCountry] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const formatValue = (value) => {
    if (value == null) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    if (num < 1) return num.toFixed(3);
    return num.toFixed(1);
  };

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const fetchRecords = async (currentPage = page) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/records", {
        params: {
          page: currentPage,
          limit,
        },
      });

      const payload = res.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      const paging = payload.pagination || {};

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

        const airQuality =
          r.pm25 != null
            ? [
                {
                  parameter: "PM2.5",
                  value: r.pm25,
                  unit: "µg/m³",
                  status: r.airQualityStatus,
                  measuredAt: r.timestamp,
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
      setPagination({
        page: paging.page || 1,
        limit: paging.limit || limit,
        total: paging.total || 0,
        totalPages: paging.totalPages || 1,
        hasNext: paging.hasNext || false,
        hasPrev: paging.hasPrev || false,
      });
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page);
  }, [page]);

  const handleDelete = async (rec) => {
    try {
      const recordId = rec._id;
      setDeleting(recordId);

      setRecords((prev) => prev.filter((r) => r._id !== recordId));

      await api.delete(`/records/${recordId}`);

      fetchRecords(page);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to delete snapshot.");
      fetchRecords(page);
    } finally {
      setDeleting(null);
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = [...records];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.metadata?.country?.toLowerCase().includes(term) ||
          r.metadata?.capital?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.timestamp) - new Date(a.timestamp);
        case "oldest":
          return new Date(a.timestamp) - new Date(b.timestamp);
        case "country":
          return (a.metadata?.country || "").localeCompare(
            b.metadata?.country || ""
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

  const groupedRecords = useMemo(() => {
    if (!groupByCountry) return null;

    const groups = {};
    filteredAndSortedRecords.forEach((rec) => {
      const country = rec.metadata?.country || "Unknown";
      if (!groups[country]) groups[country] = [];
      groups[country].push(rec);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAndSortedRecords, groupByCountry]);

  const stats = useMemo(() => {
    const uniqueCountries = new Set(
      records.map((r) => r.metadata?.country).filter(Boolean)
    );

    const validTemps = records.filter((r) => r.temperature != null);
    const validPM25 = records.filter((r) => r.pm25 != null);

    const avgTemp =
      validTemps.length > 0
        ? validTemps.reduce((sum, r) => sum + Number(r.temperature || 0), 0) /
          validTemps.length
        : 0;

    const avgPM25 =
      validPM25.length > 0
        ? validPM25.reduce((sum, r) => sum + Number(r.pm25 || 0), 0) /
          validPM25.length
        : 0;

    return {
      currentPageCount: records.length,
      total: pagination.total,
      countries: uniqueCountries.size,
      avgTemp: avgTemp.toFixed(1),
      avgPM25: avgPM25.toFixed(1),
    };
  }, [records, pagination.total]);

  const renderCard = (rec) => {
    const recordId = rec._id;

    return (
      <div
        key={recordId}
        className={`bg-white rounded-lg shadow-sm relative border ${
          viewMode === "list" ? "flex gap-3 p-3" : "p-3"
        }`}
      >
        <div className={viewMode === "list" ? "flex-1" : ""}>
          <h2 className="text-lg font-semibold text-blue-600 mb-1">
            {rec.country || "Unknown"}
          </h2>

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

          <div className="flex flex-wrap gap-3 text-sm mb-2">
            {rec.temperature != null && (
              <span>🌡️ {formatValue(rec.temperature)}°C</span>
            )}
            {rec.weather?.humidity != null && (
              <span>💧 {rec.weather.humidity}%</span>
            )}
            {rec.pm25 != null && (
              <span>🏭 {formatValue(rec.pm25)} µg/m³</span>
            )}
          </div>

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-purple-600">
            📚 Saved Snapshots
          </h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span>📊 {stats.total} total records</span>
            <span>📄 {stats.currentPageCount} records this page</span>
            <span>🌍 {stats.countries} countries this page</span>
            {stats.currentPageCount > 0 && (
              <>
                <span>🌡️ {stats.avgTemp}°C avg</span>
                <span>🏭 {stats.avgPM25} PM2.5 avg</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchRecords(page)}
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

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={groupByCountry}
              onChange={(e) => setGroupByCountry(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Group by country</span>
          </label>

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

        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredAndSortedRecords.length} records on page {pagination.page} of{" "}
          {pagination.totalPages}
          <span className="ml-2">({pagination.total} total)</span>
          {searchTerm && (
            <span className="font-semibold"> matching "{searchTerm}"</span>
          )}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
        </div>
      )}

      {error && <p className="text-red-500 mb-4">{error}</p>}

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

      {!loading && filteredAndSortedRecords.length > 0 && (
        <>
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

          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage((prev) => prev - 1)}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 rounded border bg-white disabled:opacity-50"
              >
                ← Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.page} / {pagination.totalPages}
              </span>

              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pagination.hasNext}
                className="px-4 py-2 rounded border bg-white disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}