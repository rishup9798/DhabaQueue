import { useState } from "react";
import { createApiClient } from "../api.js";

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("owner@shantidhaba.test");
  const [password, setPassword] = useState("queuechat123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const api = createApiClient();
      const { data } = await api.post("/api/auth/login", { email, password });
      onLoggedIn(data.token, data.restaurantId);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't log in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-panelLine bg-panel p-8"
      >
        <h1 className="text-paper text-2xl font-semibold mb-1">QueueChat</h1>
        <p className="text-muted text-sm mb-6">Staff sign in — Shanti Dhaba</p>

        <label className="block text-muted text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-ink border border-panelLine text-paper px-3 py-2 mb-4 focus:outline-none focus:border-marigold"
        />

        <label className="block text-muted text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-ink border border-panelLine text-paper px-3 py-2 mb-6 focus:outline-none focus:border-marigold"
        />

        {error && <p className="text-rust text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-marigold text-ink font-semibold py-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
