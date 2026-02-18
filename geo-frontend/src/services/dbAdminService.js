/* ======================
   BACKUP FULL DB
====================== */
export const backupDB = async (api) => {
  const res = await api.post("/admin/db/backup");
  return res.data;
};

/* ======================
   RESTORE LATEST BACKUP
====================== */
export const restoreLatestDB = async (api) => {
  const res = await api.post("/admin/db/restore/latest");
  return res.data;
};

/* ======================
   RESTORE BY ID
====================== */
export const restoreByIdDB = async (api, backupId) => {
  const res = await api.post(`/admin/db/restore/${backupId}`);
  return res.data;
};

/* ======================
   EXPORT FULL DB (JSON)
====================== */
export const exportDB = async (api) => {
  const res = await api.get("/admin/db/export", {
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `geoinsight_export_${Date.now()}.json`;
  a.click();

  window.URL.revokeObjectURL(url);
};

/* ======================
   IMPORT FULL DB (JSON)
====================== */
export const importDB = async (api, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/admin/db/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
