import React from "react";

export default function AirQualityCard({
  airQuality = [],
  fallback = false,
  className = "",
}) {
  // Helper function to get color based on AQI status
  const getStatusColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower.includes("good")) return "text-green-600";
    if (statusLower.includes("moderate")) return "text-yellow-600";
    if (statusLower.includes("very unhealthy")) return "text-purple-600";
    if (statusLower.includes("unhealthy for sensitive"))
      return "text-orange-600";
    if (statusLower.includes("unhealthy")) return "text-red-600";
    if (statusLower.includes("hazardous")) return "text-red-800";
    return "text-gray-600";
  };

  // Helper function to get background color for status badge
  const getStatusBgColor = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower.includes("good")) return "bg-green-100";
    if (statusLower.includes("moderate")) return "bg-yellow-100";
    if (statusLower.includes("unhealthy for sensitive")) return "bg-orange-100";
    if (statusLower.includes("unhealthy")) return "bg-red-100";
    if (statusLower.includes("very unhealthy")) return "bg-purple-100";
    if (statusLower.includes("hazardous")) return "bg-red-200";
    return "bg-gray-100";
  };

  // No data available
  if (!Array.isArray(airQuality) || airQuality.length === 0) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💨</span>
          <h3 className="text-xl font-semibold text-gray-800">Air Quality</h3>
        </div>

        {fallback ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ No air quality monitoring stations found for this location.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              This country may not have active monitoring stations in the OpenAQ
              network.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              No air quality measurements available at this time.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Get the primary measurement (usually PM2.5)
  const primaryMeasurement =
    airQuality.find(
      (aq) =>
        aq.parameter?.toLowerCase().includes("pm2.5") ||
        aq.parameter?.toLowerCase().includes("pm25")
    ) || airQuality[0];

  return (
    <div className={`bg-white rounded-lg p-6 shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💨</span>
        <h3 className="text-xl font-semibold text-gray-800">Air Quality</h3>
      </div>

      {/* Primary Measurement Display */}
      {primaryMeasurement && (
        <div className="mb-6 text-center">
          <div className="mb-2">
            <span className="text-4xl font-bold text-gray-800">
              {primaryMeasurement.value}
            </span>
            <span className="text-xl text-gray-600 ml-2">
              {primaryMeasurement.unit}
            </span>
          </div>
          <div
            className={`inline-block px-4 py-1 rounded-full ${getStatusBgColor(
              primaryMeasurement.status
            )}`}
          >
            <span
              className={`text-sm font-semibold ${getStatusColor(
                primaryMeasurement.status
              )}`}
            >
              {primaryMeasurement.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {primaryMeasurement.parameter} — {primaryMeasurement.locationName}
          </p>
        </div>
      )}

      {/* All Measurements List - Show first 3 */}
      <div className="space-y-3">
        {airQuality.slice(0, 3).map((aq, i) => (
          <div key={i} className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {aq.parameter}
                </p>
                <p className="text-xs text-gray-500">{aq.locationName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">
                  {aq.value}{" "}
                  <span className="text-sm text-gray-600">{aq.unit}</span>
                </p>
                <span
                  className={`text-xs font-medium ${getStatusColor(aq.status)}`}
                >
                  {aq.status}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Show indicator if there are more measurements */}
        {airQuality.length > 3 && (
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              +{airQuality.length - 3} more parameters available
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {airQuality.length > 0 && airQuality[0].measuredAt && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Last updated:{" "}
            {new Date(airQuality[0].measuredAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
