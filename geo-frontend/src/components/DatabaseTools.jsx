import { useState } from "react";
import api from "../api";
import {
  backupDB,
  exportDB,
  importDB,
  restoreLatestDB,
} from "../services/dbAdminService";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";

/* ===========================
   USER-SPECIFIC API HELPERS
   (gọi endpoint /user/db/...)
=========================== */

/**
 * Export records của user hiện tại → tải file Excel (.xlsx) về máy.
 * Endpoint: GET /api/user/db/export/excel
 */
const exportUserDBExcel = async () => {
  const res = await api.get("/user/db/export/excel", { responseType: "blob" });

  const disposition = res.headers["content-disposition"];
  const match = disposition?.match(/filename="(.+)"/);
  const fileName = match?.[1] ?? `geoinsight_user_export_${Date.now()}.xlsx`;

  const blob = new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Import records từ file Excel (.xlsx) vào account của user hiện tại.
 * Endpoint: POST /api/user/db/import/excel
 * File cần có cột: timestamp, countryCode (bắt buộc)
 */
const importUserDBExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/user/db/import/excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { message, imported, skipped }
};

/* ===========================
   COMPONENT
=========================== */
export default function DatabaseTools() {
  const user = getUser();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isUser = role === "user";

  const [loading, setLoading] = useState(false);

  if (!user) return null;

  /* ── ADMIN: BACKUP ── */
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

  /* ── ADMIN: RESTORE (Confirm by typing) ── */
  const handleAdminRestore = async () => {
    toast((t) => {
      let confirmText = "";

      return (
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-red-600 text-lg">
              ⚠️ Restore sẽ ghi đè TOÀN BỘ database
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Hành động này không thể hoàn tác.
            </p>
          </div>

          <div>
            <p className="text-sm">
              Nhập <span className="font-bold">RESTORE</span> để xác nhận:
            </p>
            <input
              type="text"
              onChange={(e) => (confirmText = e.target.value)}
              className="border rounded px-2 py-1 w-full mt-1"
              placeholder="Gõ RESTORE vào đây..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (confirmText !== "RESTORE") {
                  toast.error("❌ Bạn phải nhập đúng RESTORE để xác nhận");
                  return;
                }

                toast.dismiss(t.id);
                const loadingId = toast.loading("⏳ Đang restore...");

                try {
                  setLoading(true);
                  await restoreLatestDB(api);
                  toast.success("Restore thành công", { id: loadingId });
                  setTimeout(() => window.location.reload(), 1000);
                } catch (e) {
                  console.error(e);
                  toast.error("❌ Restore thất bại", { id: loadingId });
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Xác nhận Restore
            </button>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              Huỷ
            </button>
          </div>
        </div>
      );
    }, { duration: 10000 });
  };

  /* ── ADMIN: EXPORT (toàn bộ DB) ── */
  const handleAdminExport = async () => {
    const toastId = toast.loading("⏳ Đang export...");
    try {
      setLoading(true);
      await exportDB(api);
      toast.success("Export thành công", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Export thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ── ADMIN: IMPORT (toàn bộ DB) ── */
  const handleAdminImport = async (file) => {
    if (!file) return;
    const toastId = toast.loading("⏳ Đang import...");
    try {
      setLoading(true);
      await importDB(api, file);
      toast.success("Import thành công", { id: toastId });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      toast.error("❌ Import thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ── USER: BACKUP ── */
  const handleUserBackup = async () => {
    const toastId = toast.loading("⏳ Đang backup dữ liệu của bạn...");
    try {
      setLoading(true);
      const { data } = await api.post("/user/db/backup");
      if (data.success) {
        toast.success(`Backup thành công — ${data.total} records`, {
          id: toastId,
        });
      } else {
        toast.error("❌ Backup thất bại", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("❌ Backup thất bại", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ── USER: RESTORE ── */
  const handleUserRestore = async () => {
    toast(
      (t) => (
        <div>
          <p className="font-semibold">⚠️ Restore sẽ ghi đè dữ liệu của bạn</p>
          <p className="text-sm text-gray-500 mt-1">
            Data hiện tại sẽ bị xóa và thay bằng bản backup gần nhất.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const loadingId = toast.loading("⏳ Đang restore...");
                try {
                  setLoading(true);
                  await api.post("/user/db/restore");
                  toast.success("Restore thành công", { id: loadingId });
                  setTimeout(() => window.location.reload(), 800);
                } catch (e) {
                  console.error(e);
                  toast.error("❌ Restore thất bại", { id: loadingId });
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
      { duration: 6000 },
    );
  };

  /* ── USER: EXPORT EXCEL ── */
  const handleUserExportExcel = async () => {
    const toastId = toast.loading("⏳ Đang export Excel...");
    try {
      setLoading(true);
      await exportUserDBExcel();
      toast.success("Export thành công — file Excel đã tải về", {
        id: toastId,
      });
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.status === 404
          ? "Không có records để export"
          : "Export Excel thất bại";
      toast.error(`${msg}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /* ── USER: IMPORT EXCEL ── */
  const handleUserImportExcel = async (file) => {
    if (!file) return;
    const toastId = toast.loading("⏳ Đang import Excel...");
    try {
      setLoading(true);
      const result = await importUserDBExcel(file);
      toast.success(
        `Import Excel thành công — ${result.imported} records${result.skipped > 0 ? `, bỏ qua ${result.skipped}` : ""}`,
        { id: toastId },
      );
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message ?? "Import Excel thất bại";
      toast.error(`❌ ${msg}`, { id: toastId });
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

            <button
              onClick={handleAdminRestore}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Restore
            </button>

            <button
              onClick={handleAdminExport}
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
                onChange={(e) => handleAdminImport(e.target.files[0])}
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

            <button
              onClick={handleUserExportExcel}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Export Excel
            </button>

            <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-center cursor-pointer">
              Import Excel
              <input
                type="file"
                accept=".xlsx"
                hidden
                onChange={(e) => handleUserImportExcel(e.target.files[0])}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
