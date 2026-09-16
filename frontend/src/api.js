export const API_BASE_URL = "https://dhabaqueue-api.onrender.com";

export function createApiClient(token) {
  return {
    async request(path, options = {}) {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    },

    get(path) {
      return this.request(path);
    },

    post(path, body) {
      return this.request(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    patch(path, body) {
      return this.request(path, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },

    delete(path) {
      return this.request(path, {
        method: "DELETE",
      });
    },
  };
}