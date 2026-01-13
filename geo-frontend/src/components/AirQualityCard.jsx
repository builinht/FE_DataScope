import React from "react";

export default function AirQualityCard({
  airQuality = [],
  fallback = false,
  className = "",
}) {
  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("good")) return "text-green-600";
    if (s.includes("moderate")) return "text-yellow-600";
    if (s.includes("unhealthy for sensitive")) return "text-orange-600";
    if (s.includes("unhealthy")) return "text-red-600";
    if (s.includes("very unhealthy")) return "text-purple-600";
    if (s.includes("hazardous")) return "text-red-800";
    return "text-gray-600";
  };

  const getStatusBgColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("good")) return "bg-green-100";
    if (s.includes("moderate")) return "bg-yellow-100";
    if (s.includes("unhealthy for sensitive")) return "bg-orange-100";
    if (s.includes("unhealthy")) return "bg-red-100";
    if (s.includes("very unhealthy")) return "bg-purple-100";
    if (s.includes("hazardous")) return "bg-red-200";
    return "bg-gray-100";
  };

  const getHealthAdvisory = (status) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s.includes("good")) return "Air quality is satisfactory. Enjoy outdoor activities.";
    if (s.includes("moderate")) return "Air quality is acceptable. Sensitive groups should take caution.";
    if (s.includes("unhealthy for sensitive")) return "Sensitive groups should reduce prolonged outdoor activities.";
    if (s.includes("unhealthy")) return "Everyone should limit prolonged outdoor activities.";
    if (s.includes("very unhealthy")) return "Health alert: everyone may experience serious effects.";
    if (s.includes("hazardous")) return "Health warning: emergency conditions. Avoid outdoor activities.";
    return "";
  };

  const getStatusBorderColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("good")) return "border-green-200";
    if (s.includes("moderate")) return "border-yellow-200";
    if (s.includes("unhealthy for sensitive")) return "border-orange-200";
    if (s.includes("unhealthy")) return "border-red-200";
    if (s.includes("very unhealthy")) return "border-purple-200";
    if (s.includes("hazardous")) return "border-red-300";
    return "border-gray-200";
  };

  const getAdvisoryStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("good")) return { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "✅" };
    if (s.includes("moderate")) return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "⚠️" };
    if (s.includes("unhealthy for sensitive")) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", icon: "⚠️" };
    if (s.includes("unhealthy")) return { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "💡" };
    if (s.includes("very unhealthy")) return { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", icon: "☠️" };
    if (s.includes("hazardous")) return { bg: "bg-red-100", border: "border-red-300", text: "text-red-900", icon: "☠️" };
    return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800", icon: "ℹ️" };
  };

  // Nếu không có dữ liệu
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

  // Lọc bản ghi mới nhất mỗi trạm + mỗi thông số
  const latestPerStation = Object.values(
    airQuality.reduce((acc, aq) => {
      const key = `${aq.locationName}-${aq.parameter}`;
      if (!acc[key] || new Date(aq.measuredAt) > new Date(acc[key].measuredAt)) {
        acc[key] = aq;
      }
      return acc;
    }, {})
  );

  latestPerStation.sort((a, b) => new Date(b.measuredAt) - new Date(a.measuredAt));

  const primaryMeasurement =
    latestPerStation.find(aq => aq.parameter?.toLowerCase().includes("pm2.5") || aq.parameter?.toLowerCase().includes("pm25"))
    || latestPerStation[0];

  return (
    <div className={`bg-white rounded-lg p-6 shadow ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💨</span>
        <h3 className="text-xl font-semibold text-gray-800">Air Quality</h3>
      </div>

      {/* Primary Measurement */}
      {primaryMeasurement && (
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl font-bold text-gray-800">
            {primaryMeasurement.value} <span className="text-xl text-gray-600">{primaryMeasurement.unit}</span>
          </div>
          <div className={`inline-block px-4 py-1 rounded-full ${getStatusBgColor(primaryMeasurement.status)} ${getStatusColor(primaryMeasurement.status)} ${getStatusBorderColor(primaryMeasurement.status)}`}>
            {primaryMeasurement.status}
          </div>
          <p className="text-sm text-gray-500 mt-2">{primaryMeasurement.parameter} — {primaryMeasurement.locationName}</p>
          <div className={`mt-2 ${getAdvisoryStyle(primaryMeasurement.status).bg} ${getAdvisoryStyle(primaryMeasurement.status).border} rounded-lg p-2`}>
            <p className={`text-sm ${getAdvisoryStyle(primaryMeasurement.status).text} flex items-center gap-2`}>
              <span className="text-xl">{getAdvisoryStyle(primaryMeasurement.status).icon}</span>
              {primaryMeasurement.advisory || getHealthAdvisory(primaryMeasurement.status)}
            </p>
          </div>
          {/* <p className="text-xs text-gray-400 mt-2">Measured at: {new Date(primaryMeasurement.measuredAt).toLocaleString()}</p> */}
        </div>
      )}

      {/* All Measurements List */}
      <div className="space-y-3">
        {latestPerStation.map((aq, i) => (
          <div key={i} className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">{aq.parameter}</p>
                <p className="text-xs text-gray-500">Station: {aq.locationName}</p>
                {aq.measuredAt && (
                  <p className="text-xs text-gray-400">Measured at: {new Date(aq.measuredAt).toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">
                  {aq.value} <span className="text-sm text-gray-600">{aq.unit}</span>
                </p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(aq.status)}`} style={{ color: getStatusColor(aq.status) }}>
                  {aq.status}
                </span>
                {aq.advisory && (
                  <p className="text-xs text-red-600 mt-1">{aq.advisory}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
