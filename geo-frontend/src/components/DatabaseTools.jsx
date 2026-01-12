import { useState } from "react";
import api from "../api";
import {
  backupDB,
  restoreDB,
  exportDB,
  importDB,
  restoreBackupDB,
} from "../services/dbAdminService";
import { getUser } from "../utils/auth";

// User-only endpoints
const exportUserDB = async () => {
  const res = await api.get("/user/db/export", { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "geoinsight_user_export.json";
  a.click();
  window.URL.revokeObjectURL(url);
};

const importUserDB = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  await api.post("/user/db/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default function DatabaseTools() {
  const user = getUser();
  const role = user?.role; // "admin" | "user"
  const isAdmin = role === "admin";
  const isUser = role === "user";

  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleBackup = async () => {
    try {
      setLoading(true);
      await backupDB(api);
      alert("✅ Backup thành công");
    } catch (e) {
      console.error(e);
      alert("❌ Backup thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      if (isAdmin) await exportDB(api);
      else if (isUser) await exportUserDB();
      else alert("⚠️ Bạn không có quyền export");
    } catch (e) {
      console.error(e);
      alert("❌ Export thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      if (isAdmin) await importDB(api, file);
      else if (isUser) await importUserDB(file);
      else return alert("⚠️ Bạn không có quyền import");
      alert("✅ Import thành công");
    } catch (e) {
      console.error(e);
      alert("❌ Import thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = async (file) => {
    if (!file) return;
    if (!isAdmin) return alert("❌ Chỉ admin mới được restore");
    if (!confirm("⚠️ Restore sẽ GHI ĐÈ dữ liệu hiện tại. Tiếp tục?")) return;

    try {
      setLoading(true);
      if (file.name.endsWith(".json")) await restoreDB(api, file);
      else if (file.name.endsWith(".zip"))
        await restoreBackupDB(api, file);
      else return alert("❌ Chỉ hỗ trợ .json hoặc .zip");
      alert("✅ Restore thành công");
    } catch (err) {
      console.error(err);
      alert("❌ Restore thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">🗄 Database Tools</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isAdmin && (
          <>
            <button
              onClick={handleBackup}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Backup
            </button>

            <label className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-center cursor-pointer">
              Restore
              <input
                type="file"
                accept=".json,.zip"
                hidden
                onChange={(e) => handleRestoreFile(e.target.files[0])}
              />
            </label>
          </>
        )}

        {(isAdmin || isUser) && (
          <>
            <button
              onClick={handleExport}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Export
            </button>

            <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-center cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => handleImport(e.target.files[0])}
              />
            </label>
          </>
        )}

        {!isAdmin && !isUser && (
          <p className="col-span-full text-gray-500 text-sm">
            ⚠️ Bạn không có quyền sử dụng công cụ này
          </p>
        )}
      </div>
    </div>
  );
}
