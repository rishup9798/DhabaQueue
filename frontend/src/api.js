const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://dhabaqueue-api.onrender.com";

export { API_BASE_URL };

export function createApiClient(token) {
  return {
    async request(path, options = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error || `Request failed (${response.status})`
          );
        }

        return data;
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Server took too long to respond");
        }

        if (error instanceof TypeError) {
          throw new Error(
            `Cannot reach DhabaQueue backend at ${API_BASE_URL}`
          );
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },

    get(path) {
      return this.request(path, { method: "GET" });
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
