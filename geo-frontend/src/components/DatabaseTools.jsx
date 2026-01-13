import { useState } from "react";
import api from "../api";
import { backupDB, exportDB, importDB } from "../services/dbAdminService";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";

// ===== USER EXPORT =====
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

// ===== USER IMPORT =====
const importUserDB = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  await api.post("/user/db/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default function DatabaseTools() {
  const user = getUser();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isUser = role === "user";

  const [loading, setLoading] = useState(false);

  if (!user) return null;

  /* ======================
        ADMIN
  ====================== */
  const handleBackup = async () => {
    const toastId = toast.loading("⏳ Đang backup...");
    try {
      setLoading(true);
      await backupDB(api);
      toast.success("Backup thành công", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Backup thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
        EXPORT
  ====================== */
  const handleExport = async () => {
    const toastId = toast.loading("⏳ Đang export...");
    try {
      setLoading(true);
      if (isAdmin) await exportDB(api);
      else if (isUser) await exportUserDB();
      else throw new Error("No permission");

      toast.success("Export thành công", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Export thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
        IMPORT
  ====================== */
  const handleImport = async (file) => {
    if (!file) return;

    const toastId = toast.loading("⏳ Đang import...");
    try {
      setLoading(true);

      if (isAdmin) await importDB(api, file);
      else if (isUser) await importUserDB(file);
      else throw new Error("No permission");

      toast.success("Import thành công", { id: toastId });

      // ✅ reset page sau import
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      toast.error("Import thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
        USER BACKUP
  ====================== */
  const handleUserBackup = async () => {
    const toastId = toast.loading("⏳ Đang backup dữ liệu của bạn...");
    try {
      setLoading(true);
      const { data } = await api.post("/user/db/backup");
      toast.success(`Backup thành công: ${data.message}`, {
        id: toastId,
      });
    } catch (e) {
      console.error(e);
      toast.error("User backup thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
        USER RESTORE
  ====================== */
  const handleUserRestore = async () => {
    toast(
      (t) => (
        <div>
          <p className="font-semibold">
            ⚠️ Restore sẽ ghi đè dữ liệu của bạn
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const loadingId = toast.loading("⏳ Đang restore...");
                try {
                  setLoading(true);
                  await api.post("/user/db/restore");
                  toast.success("Restore thành công", {
                    id: loadingId,
                  });
                  setTimeout(() => window.location.reload(), 800);
                } catch (e) {
                  console.error(e);
                  toast.error("Restore thất bại", {
                    id: loadingId,
                  });
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              Restore
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              Huỷ
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
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

        {isUser && (
          <>
            <button
              onClick={handleUserBackup}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Backup
            </button>

            <button
              onClick={handleUserRestore}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Restore
            </button>
          </>
        )}
      </div>
    </div>
  );
}
