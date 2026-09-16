import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApiClient } from "../api.js";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("owner@shantidhaba.test");
  const [password, setPassword] = useState("queuechat123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const api = createApiClient();

      const data = await api.post("/api/auth/login", {
        email,
        password,
      });

      if (!data?.token || !data?.restaurantId) {
        throw new Error("Invalid login response from server");
      }

      localStorage.setItem("queuechat_token", data.token);
      localStorage.setItem("queuechat_restaurant_id", data.restaurantId);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Couldn't log in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#18181b] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
            DhabaQueue
          </p>

          <h1 className="text-3xl font-bold">
            Staff sign in
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Manage your restaurant queue and tables.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}