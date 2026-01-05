export const backupDB = async (api) => {
  const res = await api.post("/admin/db/backup", {}, { responseType: "blob" });

  const blob = new Blob([res.data], { type: "application/zip" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "geoinsight_backup.zip";
  a.click();

  window.URL.revokeObjectURL(url);
};


export const restoreDB = async (api, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/admin/db/restore/export", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const restoreBackupDB = async (api, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/admin/db/restore/backup", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const exportDB = async (api) => {
  const res = await api.get("/admin/db/export", {
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "geoinsight_export.json";
  a.click();

  window.URL.revokeObjectURL(url);
};

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
