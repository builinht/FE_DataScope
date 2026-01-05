import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import api from "../api";
import {
  backupDB,
  restoreDB,
  exportDB,
  importDB,
  restoreBackupDB,
} from "../services/dbAdminService";

export default function DatabaseTools() {
  const { getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(false);

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
      await exportDB(apiAuth);
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
      await importDB(apiAuth, file);
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

    try {
      setLoading(true);
      const apiAuth = await withAuthApi();

      if (file.name.endsWith(".json")) {
        await restoreDB(apiAuth, file); // JSON export
      } else if (file.name.endsWith(".zip")) {
        await restoreBackupDB(apiAuth, file); // ZIP backup
      } else {
        alert("❌ File không hợp lệ (chỉ .json hoặc .zip)");
        return;
      }

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
        <button
          onClick={handleBackup}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Backup
        </button>

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

        <label className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-center cursor-pointer">
          Restore
          <input
            type="file"
            accept=".json,.zip"
            hidden
            onChange={(e) => handleRestoreFile(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}
