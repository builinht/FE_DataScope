import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import api from "../api";
import {
  backupDB,
  restoreDB,
  exportDB,
  importDB,
  restoreBackupDB,
} from "../services/dbAdminService";

// User-only endpoints
const exportUserDB = async (api) => {
  const res = await api.get("/user/db/export", { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "geoinsight_user_export.json";
  a.click();
  window.URL.revokeObjectURL(url);
};

const importUserDB = async (api, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/user/db/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export default function DatabaseTools() {
  const { getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState(null); // null = chưa biết roles

  // Decode roles from token
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = await getAccessTokenSilently();
        const payload = JSON.parse(atob(token.split(".")[1]));
        const r = payload["https://geoinsight/roles"];
        // ép kiểu luôn thành array
        setRoles(Array.isArray(r) ? r : r ? [r] : []);
      } catch (err) {
        console.error("Failed to get roles:", err);
        setRoles([]);
      }
    };
    fetchRoles();
  }, []);

  // Chờ roles load
  if (roles === null) return null;

  const isAdmin = roles.includes("admin");
  const isUser = roles.includes("user");

  const withAuthApi = async () => {
    const token = await getAccessTokenSilently();
    api.defaults.headers.Authorization = `Bearer ${token}`;
    return api;
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      const apiAuth = await withAuthApi();
      await backupDB(apiAuth);
      alert("✅ Backup thành công");
    } catch (e) {
      alert("❌ Backup thất bại");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const apiAuth = await withAuthApi();
      if (isAdmin) await exportDB(apiAuth);
      else if (isUser) await exportUserDB(apiAuth);
      else alert("⚠️ Bạn không có quyền export");
    } catch (e) {
      alert("❌ Export thất bại");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      const apiAuth = await withAuthApi();
      if (isAdmin) await importDB(apiAuth, file);
      else if (isUser) await importUserDB(apiAuth, file);
      else alert("⚠️ Bạn không có quyền import");
      alert("✅ Import thành công");
    } catch (e) {
      alert("❌ Import thất bại");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = async (file) => {
    if (!file) return;
    if (!confirm("⚠️ Restore sẽ GHI ĐÈ dữ liệu hiện tại. Tiếp tục?")) return;
    if (!isAdmin) {
      alert("❌ Chỉ admin mới có thể restore");
      return;
    }

    try {
      setLoading(true);
      const apiAuth = await withAuthApi();
      if (file.name.endsWith(".json")) await restoreDB(apiAuth, file);
      else if (file.name.endsWith(".zip")) await restoreBackupDB(apiAuth, file);
      else return alert("❌ File không hợp lệ (chỉ .json hoặc .zip)");
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
