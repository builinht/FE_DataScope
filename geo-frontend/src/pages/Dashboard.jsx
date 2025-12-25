import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CountryCard from "../components/CountryCard";
import WeatherCard from "../components/WeatherCard";
import AirQualityCard from "../components/AirQualityCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";

export default function Dashboard() {
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    getAccessTokenSilently,
    loginWithRedirect,
    logout 
  } = useAuth0();

  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [stats, setStats] = useState(null);
  
  const navigate = useNavigate();

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoading(true);
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,population");
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        const countryList = json
          .map(c => ({
            name: c.name.common,
            capital: c.capital?.[0] || "N/A",
            population: c.population || 0
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(countryList);
        setFilteredCountries(countryList);
      } catch (err) {
        console.error("Error fetching countries:", err);
        setError("Failed to load countries. Using fallback data.");
        const fallbackCountries = [
          { name: "Sri Lanka", capital: "Colombo", population: 21919000 },
          { name: "United States", capital: "Washington D.C.", population: 331900000 },
          { name: "India", capital: "New Delhi", population: 1380000000 },
          { name: "Japan", capital: "Tokyo", population: 125800000 },
          { name: "Germany", capital: "Berlin", population: 83200000 }
        ];
        setCountries(fallbackCountries);
        setFilteredCountries(fallbackCountries);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Filter countries
  useEffect(() => {
    if (!searchTerm.trim()) setFilteredCountries(countries);
    else setFilteredCountries(
      countries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.capital.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, countries]);

  // Fetch user stats
  useEffect(() => {
    if (isAuthenticated && user) fetchUserStats();
  }, [isAuthenticated, user]);

  const fetchUserStats = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get("/records/stats", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-api-key": import.meta.env.VITE_BACKEND_API_KEY
        }
      });
      setStats(response.data);
    } catch (err) {
      console.warn("Could not fetch stats:", err);
      setStats({ totalRecords: 0, uniqueCountriesCount: 0 });
    }
  };

  // Helper function to safely fetch with timeout
  const fetchWithTimeout = async (fetchFn, timeoutMs = 8000) => {
    return Promise.race([
      fetchFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  };

  // Get AQI status based on PM2.5 value
  const getAQIStatus = (value) => {
    if (typeof value !== "number") return "Unknown";
    if (value <= 12) return "Good";
    if (value <= 35) return "Moderate";
    if (value <= 55) return "Unhealthy for Sensitive";
    if (value <= 150) return "Unhealthy";
    if (value <= 250) return "Very Unhealthy";
    return "Hazardous";
  };

  // Fetch country data + weather + air quality
  const fetchData = async () => {
    if (!selectedCountry) return setError("Please select a country");
    if (!isAuthenticated) return setError("Please log in to access this feature");

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const countryObj = countries.find(c => c.name === selectedCountry);
      if (!countryObj) throw new Error("Selected country not found");

      // Country metadata
      const countryRes = await fetchWithTimeout(
        () => fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(selectedCountry)}?fullText=true`)
      );
      
      if (!countryRes.ok) throw new Error(`Country API Error: ${countryRes.status}`);
      const countryData = await countryRes.json();
      const countryInfo = countryData[0];
      
      const metadata = {
        capital: countryInfo.capital?.[0] || countryObj.capital,
        population: countryInfo.population || countryObj.population,
        currency: Object.keys(countryInfo.currencies || {})[0] || "N/A",
        languages: Object.values(countryInfo.languages || {}),
        flag: countryInfo.flags?.svg || countryInfo.flags?.png || "",
        region: countryInfo.region || "N/A",
        subregion: countryInfo.subregion || "N/A",
        lat: countryInfo.latlng?.[0] ?? null,
        lon: countryInfo.latlng?.[1] ?? null,
        countryCode: countryInfo.cca2 || ""
      };

      // Fetch weather and air quality in parallel
      const [weather, airQualityResult] = await Promise.allSettled([
        fetchWeatherData(metadata),
        fetchAirQualityData(metadata)
      ]);

      // Process weather data
      let weatherData = { temperature: "N/A", humidity: "N/A", description: "N/A" };
      if (weather.status === 'fulfilled') {
        weatherData = weather.value;
      } else {
        console.warn("Weather fetch failed:", weather.reason);
      }

      // Process air quality data
      let airQualityArray = [];
      let fallbackUsed = false;
      let aqWarning = "";

      if (airQualityResult.status === 'fulfilled') {
        const aqData = airQualityResult.value;
        airQualityArray = aqData.measurements || [];
        fallbackUsed = aqData.fallback || false;
        
        if (!airQualityArray.length) {
          aqWarning = "No air quality measurements available for this location.";
        }
      } else {
        console.warn("Air quality fetch failed:", airQualityResult.reason);
        aqWarning = "Air quality data temporarily unavailable.";
      }

      setData({
        country: countryInfo.name.common,
        metadata,
        weather: weatherData,
        airQuality: airQualityArray,
        airQualityFallback: fallbackUsed,
        fetchedAt: new Date().toISOString(),
        userId: user?.sub
      });

      // Set success message based on what data was fetched
      let successMsg = `Successfully fetched data for ${selectedCountry}!`;
      if (aqWarning) {
        successMsg += ` Note: ${aqWarning}`;
      }
      setSuccess(successMsg);
      setTimeout(() => setSuccess(""), 5000);

    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Failed to fetch data: ${err.message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather data
  const fetchWeatherData = async (metadata) => {
    try {
      const key = import.meta.env.VITE_OPENWEATHERMAP_KEY;
      if (!key) {
        console.warn("OpenWeatherMap API key not configured");
        return { temperature: "N/A", humidity: "N/A", description: "API key missing" };
      }

      let url = metadata.lat !== null && metadata.lon !== null
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${metadata.lat}&lon=${metadata.lon}&units=metric&appid=${key}`
        : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(metadata.capital)}&units=metric&appid=${key}`;
      
      const res = await fetchWithTimeout(() => fetch(url));
      
      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status}`);
      }
      
      const w = await res.json();
      
      return {
        temperature: Math.round(w.main?.temp) || "N/A",
        humidity: w.main?.humidity || "N/A",
        description: w.weather?.[0]?.description || "N/A",
        feelsLike: Math.round(w.main?.feels_like) || "N/A",
        pressure: w.main?.pressure || "N/A",
        windSpeed: w.wind?.speed || "N/A",
        icon: w.weather?.[0]?.icon || ""
      };
    } catch (err) {
      console.error("Weather fetch error:", err);
      return { 
        temperature: "N/A", 
        humidity: "N/A", 
        description: "Service unavailable" 
      };
    }
  };

  // Fetch air quality data through backend
  const fetchAirQualityData = async (metadata) => {
    try {
      const token = await getAccessTokenSilently();
      
      // Construct query parameters - always include both strategies
      const params = new URLSearchParams();
      
      if (metadata.lat !== null && metadata.lon !== null) {
        params.append('lat', metadata.lat);
        params.append('lon', metadata.lon);
      }
      
      // Always add city and country as fallback
      if (metadata.capital) {
        params.append('city', metadata.capital);
      }
      if (metadata.countryCode) {
        params.append('country', metadata.countryCode);
      }
      
      const aqUrl = '/records/geo/airquality?' + params.toString();
      
      const res = await fetchWithTimeout(
        () => api.get(aqUrl, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "x-api-key": import.meta.env.VITE_BACKEND_API_KEY
          }
        }),
        10000 // 10 second timeout for air quality
      );
      
      const results = res?.data?.results;
      const fallback = res?.data?.fallback || false;
      
      if (!Array.isArray(results) || !results.length) {
        return {
          measurements: [],
          fallback: fallback
        };
      }
      
      // Transform and validate measurements
      const measurements = results
        .filter(aq => aq.value != null && !isNaN(Number(aq.value)))
        .map(aq => ({
          parameter: aq.parameter || "PM2.5",
          value: Number(aq.value),
          unit: aq.unit || "µg/m³",
          status: aq.status || getAQIStatus(Number(aq.value)),
          measuredAt: aq.measuredAt || new Date().toISOString(),
          locationName: aq.locationName || metadata.capital || "Unknown"
        }));
      
      return {
        measurements,
        fallback
      };
      
    } catch (err) {
      console.error("Air quality fetch error:", err);
      
      // Return empty measurements instead of throwing
      return {
        measurements: [],
        fallback: false
      };
    }
  };

  const saveSnapshot = async () => {
    if (!data) return setError("No data to save.");
    if (!isAuthenticated) return setError("Please log in to save snapshots.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessTokenSilently();
      await api.post("/records", data, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-api-key": import.meta.env.VITE_BACKEND_API_KEY,
          "Content-Type": "application/json"
        }
      });
      setSuccess("Snapshot saved successfully!");
      await fetchUserStats();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Save error:", err);
      if (err.response?.status === 401) setError("Authentication failed. Please log in again.");
      else if (err.response?.status === 400) setError("Invalid data format. Please try again.");
      else if (err.response?.status === 404) setError("API endpoint not found.");
      else setError(`Failed to save snapshot: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = () => loginWithRedirect();
  const handleLogout = () => logout({ logoutParams: { returnTo: window.location.origin } });

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner size="lg" message="Initializing application..." />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">🌍 GeoInsight Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Explore countries with real-time weather and air quality data
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            🔐 Login to Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">🌍 GeoInsight Dashboard</h1>
              {stats && (
                <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
                  <span>📊 {stats.totalRecords} saved records</span>
                  <span>🗺️ {stats.uniqueCountriesCount} countries explored</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <LoadingSpinner size="lg" message="Fetching country data..." />
            </div>
          </div>
        )}
        {error && <ErrorAlert message={error} onClose={() => setError("")} />}
        {success && <SuccessAlert message={success} onClose={() => setSuccess("")} />}

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Select Country</h2>
          <input
            type="text"
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent mb-4"
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              <option value="">Select a country</option>
              {filteredCountries.map((c, i) => (
                <option key={i} value={c.name}>{c.name} - {c.capital}</option>
              ))}
            </select>
            <button
              onClick={fetchData}
              disabled={loading || !selectedCountry}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                loading || !selectedCountry ? "bg-gray-400 text-gray-700 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {loading ? "Fetching..." : "Get Insights"}
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        {data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <CountryCard metadata={data.metadata} country={data.country} className="hover:shadow-lg transition-shadow duration-200" />
              <WeatherCard weather={data.weather} capital={data.metadata.capital} className="hover:shadow-lg transition-shadow duration-200" />
              <AirQualityCard airQuality={data.airQuality} fallback={data.airQualityFallback} className="hover:shadow-lg transition-shadow duration-200" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col sm:flex-row gap-4">
              <button onClick={saveSnapshot} disabled={saving} className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${saving ? "bg-gray-400 text-gray-700 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
                {saving ? "💾 Saving..." : "💾 Save Snapshot"}
              </button>
              <button onClick={() => navigate("/records")} className="flex-1 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors duration-200">
                📜 View Saved Records
              </button>
              <button onClick={() => { setData(null); setSelectedCountry(""); setError(""); setSuccess(""); }} className="flex-1 px-6 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-semibold transition-colors duration-200">
                🔄 Reset
              </button>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Getting Started</h3>
            <p className="text-blue-700">
              Select a country from the dropdown above to view comprehensive data including 
              country information, current weather conditions, and air quality measurements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}