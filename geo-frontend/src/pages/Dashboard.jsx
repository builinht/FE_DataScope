import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CountryCard from "../components/CountryCard";
import WeatherCard from "../components/WeatherCard";
import AirQualityCard from "../components/AirQualityCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";
import DatabaseTools from "../components/DatabaseTools";
import { getUser, getToken } from "../utils/auth";

export default function Dashboard() {
  const user = getUser();
  const isAuthenticated = !!user;
  const navigate = useNavigate();

  /* =========================
     STATE
  ========================= */
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // autocomplete / suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const SUGGESTION_LIMIT = 7;

  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // custom dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [dropUp, setDropUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(null);

  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const rect = dropdownRef.current?.getBoundingClientRect();
    if (!rect) return;
    const padding = 16;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const willDropUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    setDropUp(!!willDropUp);
    const max = willDropUp
      ? Math.max(120, spaceAbove)
      : Math.max(120, spaceBelow);
    setDropdownMaxHeight(max);
  }, [showDropdown, filteredCountries.length]);

  /* =========================
     FETCH COUNTRIES
  ========================= */
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,capital,population",
        );
        if (!res.ok) throw new Error("Country API failed");
        const json = await res.json();
        const list = json
          .map((c) => ({
            name: c.name.common,
            capital: c.capital?.[0] || "N/A",
            population: c.population || 0,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
        setFilteredCountries(list);
      } catch {
        const fallback = [
          { name: "Sri Lanka", capital: "Colombo", population: 21919000 },
          {
            name: "United States",
            capital: "Washington D.C.",
            population: 331900000,
          },
          { name: "India", capital: "New Delhi", population: 1380000000 },
        ];
        setCountries(fallback);
        setFilteredCountries(fallback);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  /* =========================
     FILTER
  ========================= */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCountries(countries);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredCountries(
        countries.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.capital.toLowerCase().includes(q),
        ),
      );
    }
  }, [searchTerm, countries]);

  useEffect(() => {
    if (searchTerm.trim() && filteredCountries.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    setHighlightedIndex(-1);
  }, [searchTerm, filteredCountries]);

  /* =========================
     USER STATS (chỉ fetch khi đã đăng nhập)
  ========================= */
  useEffect(() => {
    if (isAuthenticated) fetchUserStats();
  }, [isAuthenticated]);

  const fetchUserStats = async () => {
    try {
      const res = await api.get("/records/stats");
      setStats(res.data);
    } catch {
      setStats({ totalRecords: 0, uniqueCountriesCount: 0 });
    }
  };

  /* =========================
     FETCH DATA
     ✅ Khách cũng fetch được (chỉ bỏ kiểm tra isAuthenticated)
  ========================= */
  const fetchData = async () => {
    if (!selectedCountry) return setError("Please select a country");

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const countryRes = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(
          selectedCountry,
        )}?fullText=true`,
      );
      if (!countryRes.ok) throw new Error("Country details not found");
      const country = (await countryRes.json())[0];

      const metadata = {
        capital: country.capital?.[0] || "N/A",
        population: country.population || 0,
        currency: Object.keys(country.currencies || {})[0] || "N/A",
        languages: Object.values(country.languages || {}),
        flag: country.flags?.svg || "",
        region: country.region || "N/A",
        subregion: country.subregion || "N/A",
        lat: country.latlng?.[0] ?? null,
        lon: country.latlng?.[1] ?? null,
        countryCode: country.cca2 || "",
      };

      const [weather, airQuality] = await Promise.all([
        fetchWeather(metadata),
        fetchAirQuality(metadata),
      ]);

      setData({
        country: selectedCountry,
        metadata,
        weather,
        airQuality: airQuality.measurements,
        airQualityFallback: airQuality.fallback,
        fetchedAt: new Date().toISOString(),
        userId: user?.userId,
      });

      setSuccess(`Successfully fetched data for ${selectedCountry}`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to fetch data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     WEATHER
  ========================= */
  const fetchWeather = async (m) => {
    try {
      const key = import.meta.env.VITE_OPENWEATHERMAP_KEY;
      if (!key) throw new Error("Missing OpenWeather key");
      const hasCoords = typeof m.lat === "number" && typeof m.lon === "number";
      const url = hasCoords
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${m.lat}&lon=${m.lon}&units=metric&appid=${key}`
        : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            m.capital,
          )}&units=metric&appid=${key}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather API error");
      const w = await res.json();
      return {
        temperature: Math.round(w.main?.temp),
        feelsLike: Math.round(w.main?.feels_like),
        humidity: w.main?.humidity,
        pressure: w.main?.pressure,
        description: w.weather?.[0]?.description,
        icon: w.weather?.[0]?.icon,
      };
    } catch {
      return {
        temperature: "N/A",
        humidity: "N/A",
        description: "Service unavailable",
      };
    }
  };

  /* =========================
     AIR QUALITY
  ========================= */
  const fetchAirQuality = async (m) => {
    const token = getToken();
    if (!token) {
      // Guest: call OpenWeatherMap directly
      try {
        const key = import.meta.env.VITE_OPENWEATHERMAP_KEY;
        if (!key) throw new Error("Missing OpenWeather key");
        const hasCoords =
          typeof m.lat === "number" && typeof m.lon === "number";
        if (!hasCoords) throw new Error("No coordinates available");

        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${m.lat}&lon=${m.lon}&appid=${key}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Air quality API error");

        const data = await res.json();
        if (!data.list || data.list.length === 0)
          throw new Error("No air quality data");

        const components = data.list[0].components;
        const aqi = data.list[0].main.aqi;

        // Trong Dashboard.jsx — thay hàm getStatus trong fetchAirQuality
        const getStatusFromPM25 = (pm25) => {
          if (typeof pm25 !== "number" || isNaN(pm25)) return "Unknown";
          if (pm25 <= 12) return "Good";
          if (pm25 <= 35.4) return "Moderate";
          if (pm25 <= 55.4) return "Unhealthy for Sensitive";
          if (pm25 <= 150.4) return "Unhealthy";
          if (pm25 <= 250.4) return "Very Unhealthy";
          return "Hazardous";
        };

        // Hàm status chung cho các chất khác (dùng AQI OWM)
        const getStatusFromAQI = (aqi) => {
          if (aqi === 1) return "Good";
          if (aqi === 2) return "Moderate";
          if (aqi === 3) return "Unhealthy for Sensitive";
          if (aqi === 4) return "Unhealthy";
          if (aqi === 5) return "Very Unhealthy";
          return "Unknown";
        };

        const measuredAt = new Date(data.list[0].dt * 1000).toISOString();

        // Create measurements array
        const measurements = [
          {
            parameter: "pm2.5",
            value: components.pm2_5,
            unit: "μg/m³",
            status: getStatusFromPM25(components.pm2_5),
            measuredAt,
            locationName: m.capital || "Unknown",
          },
          {
            parameter: "pm10",
            value: components.pm10,
            unit: "μg/m³",
            status: getStatusFromAQI(aqi),
            measuredAt,
            locationName: m.capital || "Unknown",
          },
          {
            parameter: "no2",
            value: components.no2,
            unit: "μg/m³",
            status,
            measuredAt,
            locationName: m.capital || "Unknown",
          },
          {
            parameter: "o3",
            value: components.o3,
            unit: "μg/m³",
            status,
            measuredAt,
            locationName: m.capital || "Unknown",
          },
          {
            parameter: "so2",
            value: components.so2,
            unit: "μg/m³",
            status,
            measuredAt,
            locationName: m.capital || "Unknown",
          },
          {
            parameter: "co",
            value: components.co,
            unit: "μg/m³",
            status,
            measuredAt,
            locationName: m.capital || "Unknown",
          },
        ];

        return {
          measurements,
          fallback: false,
        };
      } catch {
        return { measurements: [], fallback: true };
      }
    } else {
      // Authenticated user: call backend API
      try {
        const params = new URLSearchParams();
        if (m.lat != null && m.lon != null) {
          params.append("lat", m.lat);
          params.append("lon", m.lon);
        }
        if (m.capital) params.append("city", m.capital);
        if (m.countryCode) params.append("country", m.countryCode);
        const res = await api.get(
          `/records/geo/airquality?${params.toString()}`,
        );
        return {
          measurements: res.data?.results || [],
          fallback: res.data?.fallback || false,
        };
      } catch {
        return { measurements: [], fallback: false };
      }
    }
  };

  // highlight matching substring in suggestion
  const renderHighlighted = (text, q) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-100 rounded px-1">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const handleSearchKeyDown = (e) => {
    const visible = filteredCountries.slice(0, SUGGESTION_LIMIT);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && visible[highlightedIndex]) {
        const c = visible[highlightedIndex];
        setSelectedCountry(c.name);
        setSearchTerm(c.name);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      } else {
        const exact = countries.find(
          (c) => c.name.toLowerCase() === searchTerm.trim().toLowerCase(),
        );
        if (exact) setSelectedCountry(exact.name);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  /* =========================
     SAVE SNAPSHOT (chỉ user đã đăng nhập)
  ========================= */
  const saveSnapshot = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.post("/records", data);
      setSuccess("Snapshot saved!");
      fetchUserStats();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save snapshot");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     DASHBOARD RENDER
     ✅ Không còn "login wall" — khách vào thẳng dashboard
  ========================= */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ BANNER KHÁCH — chỉ hiện khi chưa đăng nhập */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-700">
              <span>👋</span>
              <span className="text-sm font-medium">
                Bạn đang xem với tư cách <b>khách</b> — Có thể tra cứu AQI &amp;
                thời tiết, nhưng không thể lưu snapshot hay xem Records.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-blue-600 whitespace-nowrap">
              🌍 GeoInsight Dashboard
            </h1>

            {/* Stats chỉ hiện khi đã đăng nhập */}
            {isAuthenticated && (
              <div className="flex items-center gap-4 text-sm text-gray-600 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>
                    {stats?.totalRecords ?? 0}{" "}
                    {(stats?.totalRecords ?? 0) === 1
                      ? "saved record"
                      : "saved records"}
                  </span>
                </div>
                <span className="text-gray-300">·</span>
                <div className="flex items-center gap-2">
                  <span>🗺️</span>
                  <span>
                    {stats?.uniqueCountriesCount ?? 0}{" "}
                    {(stats?.uniqueCountriesCount ?? 0) === 1
                      ? "country explored"
                      : "countries explored"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading && <LoadingSpinner size="lg" message="Loading data..." />}
        {error && <ErrorAlert message={error} onClose={() => setError("")} />}
        {success && (
          <SuccessAlert message={success} onClose={() => setSuccess("")} />
        )}

        {/* SEARCH */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="relative" ref={suggestionsRef}>
            <div className="relative">
              <svg
                className="w-5 h-5 absolute left-3 top-3 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                onFocus={() => {
                  if (searchTerm.trim()) setShowSuggestions(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search country..."
                className="
                  w-full border p-3 pl-10 rounded mb-4
                  transition
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-300
                  focus:border-blue-400
                  focus:shadow-sm
                "
              />
            </div>
            {showSuggestions && (
              <div className="absolute left-0 right-0 bg-white border rounded shadow z-20 max-h-48 overflow-auto">
                {filteredCountries.slice(0, SUGGESTION_LIMIT).length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No results</div>
                ) : (
                  filteredCountries.slice(0, SUGGESTION_LIMIT).map((c, idx) => (
                    <button
                      key={c.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCountry(c.name);
                        setSearchTerm(c.name);
                        setShowSuggestions(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0 ${
                        highlightedIndex === idx ? "bg-gray-100" : ""
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === idx}
                    >
                      <div className="font-medium">
                        {renderHighlighted(c.name, searchTerm)}
                      </div>
                      <div className="text-sm text-gray-500">{c.capital}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-2">
            <div className="flex-1 relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown((s) => !s)}
                className="w-full text-left border p-3 rounded flex items-center justify-between"
                aria-haspopup="listbox"
                aria-expanded={showDropdown}
              >
                <span>{selectedCountry || "Select country"}</span>
                <span className="text-gray-400">▾</span>
              </button>
              {showDropdown && (
                <div
                  className={`absolute left-0 right-0 bg-white border rounded shadow z-10 ${
                    dropUp ? "bottom-full mb-2" : "mt-2"
                  }`}
                  style={{
                    maxHeight: dropdownMaxHeight
                      ? `${dropdownMaxHeight}px`
                      : "14rem",
                    overflow: "auto",
                  }}
                  role="listbox"
                >
                  <button
                    key="__select-none__"
                    onClick={() => {
                      setSelectedCountry("");
                      setShowDropdown(false);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0 text-gray-700"
                    role="option"
                  >
                    Select country
                  </button>
                  {filteredCountries.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No results</div>
                  ) : (
                    filteredCountries.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setSelectedCountry(c.name);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                        role="option"
                      >
                        {c.name} - {c.capital}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={fetchData}
              disabled={!selectedCountry || loading}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 rounded font-semibold"
            >
              Get Insights
            </button>
          </div>
        </div>

        {/* CARDS */}
        {data && (
          <>
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <CountryCard metadata={data.metadata} country={data.country} />
              <WeatherCard
                weather={data.weather}
                capital={data.metadata.capital}
              />
              <AirQualityCard
                airQuality={data.airQuality}
                fallback={data.airQualityFallback}
              />
            </div>

            {/* ✅ ACTION BUTTONS — khách thấy nút mờ + tooltip đăng nhập */}
            <div className="flex gap-4">
              {isAuthenticated ? (
                /* User đã đăng nhập: Save bình thường */
                <button
                  onClick={saveSnapshot}
                  disabled={saving}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded font-semibold transition"
                >
                  {saving ? "Saving..." : "💾 Save Snapshot"}
                </button>
              ) : (
                /* Khách: nút Save dẫn đến trang đăng nhập */
                <button
                  onClick={() => navigate("/login")}
                  className="flex-1 bg-gray-200 hover:bg-blue-500 hover:text-white text-gray-500 py-3 rounded font-semibold transition group"
                  title="Đăng nhập để lưu snapshot"
                >
                  🔐 Đăng nhập để lưu Snapshot
                </button>
              )}

              {isAuthenticated ? (
                /* User đã đăng nhập: View Records */
                <button
                  onClick={() => navigate("/records")}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded font-semibold transition"
                >
                  📜 View Records
                </button>
              ) : (
                /* Khách: nút View Records dẫn đến đăng nhập */
                <button
                  onClick={() => navigate("/login")}
                  className="flex-1 bg-gray-200 hover:bg-green-500 hover:text-white text-gray-500 py-3 rounded font-semibold transition"
                  title="Đăng nhập để xem Records"
                >
                  📜 Đăng nhập để xem Records
                </button>
              )}
            </div>

            {/* ✅ Gợi ý đăng ký cho khách sau khi xem kết quả */}
            {!isAuthenticated && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-yellow-800 text-sm">
                  💡 <b>Thích kết quả này?</b> Đăng ký để lưu snapshot, xem lịch
                  sử và phân tích dữ liệu của bạn.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/register")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Đăng ký ngay
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-white hover:bg-gray-50 text-gray-700 border text-sm px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Đăng nhập
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Database Tools chỉ hiện khi đã đăng nhập */}
        {isAuthenticated && <DatabaseTools user={user} />}
      </main>
    </div>
  );
}
