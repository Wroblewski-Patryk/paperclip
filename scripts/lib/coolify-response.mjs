export function coolifyResponseItems(raw) {
  const data = raw?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.resources)) return data.resources;
  if (!data || typeof data !== "object") return [];

  const keys = Object.keys(data);
  if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
    return Object.values(data);
  }
  return [data];
}
