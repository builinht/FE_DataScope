import { useState, useEffect } from "react";
import api from "../api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const [location, setLocation] = useState("");
  const [days, setDays] = useState(7);
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("history"); // history | compare

  /* ======================
     Lịch sử thời tiết
  ====================== */
  const fetchHistory = async () => {
    if (!location.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/records/history/${location}?days=${days}`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     So sánh chất lượng không khí
  ====================== */
  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/records/compare-airquality?days=${days}`);
      setComparison(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "compare") {
      fetchComparison();
    }
  }, [activeTab]);

  /* ======================
     Format data cho chart
  ====================== */
  const chartData = history.map((r) => ({
    date: new Date(r.timestamp).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    }),
    temperature: r.temperature,
    humidity: r.humidity,
    pm25: r.pm25,
  }));

  return (
    <div className="max-w-6xl mx-auto mt-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-2xl font-bold mb-4">📊 Analytics & Insights</h2>

        {/* TABS */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "history"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            📈 Lịch sử thời tiết
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "compare"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
          >
            🏙️ So sánh không khí
          </button>
        </div>

        {/* TAB 1: LỊCH SỬ */}
        {activeTab === "history" && (
          <div>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Nhập tên thành phố hoặc quốc gia..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 border p-2 rounded"
              />
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="border p-2 rounded"
              >
                <option value={7}>7 ngày</option>
                <option value={14}>14 ngày</option>
                <option value={30}>30 ngày</option>
              </select>
              <button
                onClick={fetchHistory}
                disabled={loading || !location.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 rounded disabled:bg-gray-300"
              >
                {loading ? "Loading..." : "Xem"}
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Chưa có dữ liệu. Thử tìm kiếm một địa điểm.
              </p>
            ) : (
              <>
                <h3 className="font-semibold mb-2">
                  📍 {history[0]?.meta?.capital}, {history[0]?.meta?.country} (
                  {history.length} records)
                </h3>

                {/* NHIỆT ĐỘ */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">🌡️ Nhiệt độ (°C)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#ef4444"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ĐỘ ẨM */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2">💧 Độ ẩm (%)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="humidity"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* PM2.5 */}
                {history.some((r) => r.pm25) && (
                  <div>
                    <h4 className="font-medium mb-2">🏭 PM2.5 (µg/m³)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="pm25"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: SO SÁNH */}
        {activeTab === "compare" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                So sánh chất lượng không khí {days} ngày qua
              </h3>
              <select
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  fetchComparison();
                }}
                className="border p-2 rounded"
              >
                <option value={7}>7 ngày</option>
                <option value={14}>14 ngày</option>
                <option value={30}>30 ngày</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : comparison.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Chưa có dữ liệu để so sánh. Hãy lưu thêm snapshots từ nhiều địa
                điểm khác nhau.
              </p>
            ) : (
              <>
                {/* CHART */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="capital" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgPM25" fill="#f59e0b" name="PM2.5 (TB)" />
                  </BarChart>
                </ResponsiveContainer>

                {/* TABLE */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 border text-left">Thành phố</th>
                        <th className="p-2 border text-left">Quốc gia</th>
                        <th className="p-2 border text-right">PM2.5 (TB)</th>
                        <th className="p-2 border text-right">PM2.5 (Max)</th>
                        <th className="p-2 border text-center">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 border font-medium">
                            {c.capital}
                          </td>
                          <td className="p-2 border">{c.country}</td>
                          <td className="p-2 border text-right">
                            {c.avgPM25?.toFixed(1) || "N/A"}
                          </td>
                          <td className="p-2 border text-right">
                            {c.maxPM25?.toFixed(1) || "N/A"}
                          </td>
                          <td className="p-2 border text-center">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
