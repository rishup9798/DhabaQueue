import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { createApiClient, API_BASE_URL } from "../api.js";

import Login from "../components/Login.jsx";
import QueueBoard from "../components/QueueBoard.jsx";
import TableGrid from "../components/TableGrid.jsx";
import AddWalkInForm from "../components/AddWalkInForm.jsx";
import FoodTracker from "../components/FoodTracker.jsx";
import AppDock from "../components/AppDock.jsx";

export default function DashboardPage() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("queuechat_token")
  );

  const [restaurantId, setRestaurantId] = useState(() =>
    localStorage.getItem("queuechat_restaurant_id") ||
    localStorage.getItem("queuechat_restaurant")
  );

  const [entries, setEntries] = useState([]);
  const [tables, setTables] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  const api = createApiClient(token);

  const loadData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      const [queueRes, tablesRes, foodRes] = await Promise.all([
        api.get("/api/queue"),
        api.get("/api/queue/tables/all"),
        api.get("/api/queue/food-orders"),
      ]);

      const queueData = Array.isArray(queueRes)
        ? queueRes
        : Array.isArray(queueRes?.data)
          ? queueRes.data
          : [];

      const tablesData = Array.isArray(tablesRes)
        ? tablesRes
        : Array.isArray(tablesRes?.data)
          ? tablesRes.data
          : [];

      const foodData = Array.isArray(foodRes)
        ? foodRes
        : Array.isArray(foodRes?.data)
          ? foodRes.data
          : [];

      setEntries(queueData);
      setTables(tablesData);
      setFoodOrders(foodData);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setEntries([]);
      setTables([]);
      setFoodOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    loadData();

    if (!restaurantId) return;

    const socket = io(API_BASE_URL, {
  transports: ["polling"],
});

    socket.emit("join-restaurant", restaurantId);

    socket.on("queue:updated", loadData);

    return () => {
      socket.off("queue:updated", loadData);
      socket.disconnect();
    };
  }, [token, restaurantId, loadData]);

  function handleLoggedIn(newToken, newRestaurantId) {
    localStorage.setItem("queuechat_token", newToken);
    localStorage.setItem("queuechat_restaurant_id", newRestaurantId);

    setToken(newToken);
    setRestaurantId(newRestaurantId);
  }

  function handleLogout() {
    localStorage.removeItem("queuechat_token");
    localStorage.removeItem("queuechat_restaurant_id");
    localStorage.removeItem("queuechat_restaurant");

    setToken(null);
    setRestaurantId(null);
  }

  async function handleNotify(id) {
    await api.patch(`/api/queue/${id}/notify`);
    await loadData();
  }

  async function handleSeat(id) {
    await api.patch(`/api/queue/${id}/seat`);
    await loadData();
  }

  async function handleRemove(id) {
    await api.patch(`/api/queue/${id}/remove`);
    await loadData();
  }

  async function handleToggleTable(id) {
    await api.patch(`/api/queue/tables/${id}/toggle`);
    await loadData();
  }

  async function handleAddWalkIn(data) {
    await api.post("/api/queue/manual", data);
    await loadData();
  }

  async function handleUpdateFoodItems(orderId, itemsSummary) {
    await api.patch(`/api/queue/food-orders/${orderId}`, {
      itemsSummary,
    });

    await loadData();
  }

  async function handleAdvanceFoodStatus(orderId, status) {
    await api.patch(`/api/queue/food-orders/${orderId}`, {
      status,
    });

    await loadData();
  }

  if (!token) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }

  const waiting = entries.filter(
    (entry) => entry.status === "WAITING"
  ).length;

  const notified = entries.filter(
    (entry) => entry.status === "NOTIFIED"
  ).length;

  const seated = entries.filter(
    (entry) => entry.status === "SEATED"
  ).length;

  const availableTables = tables.filter(
    (table) =>
      table.status === "AVAILABLE" ||
      table.status === "FREE" ||
      table.occupied === false
  ).length;

  const filteredEntries = entries.filter((entry) => {
    const customerName =
      entry.customer?.name ||
      entry.customerPhoneNumber ||
      "";

    const matchesSearch = customerName
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "ALL" || entry.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#0f0f0e] text-white">

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f0f0e]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3a008] text-xl">
              🍛
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Shanti Dhaba
              </h1>

              <div className="mt-0.5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-white/50">
                  Live operations
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white sm:block"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            >
              Sign out
            </button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-32 pt-7">

        <div className="mb-7">
          <p className="text-sm text-white/40">
            Restaurant operations
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Good evening 👋
          </h2>

          <p className="mt-1 text-sm text-white/40">
            Keep an eye on your queue, tables and orders.
          </p>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">

          <StatCard
            label="Waiting"
            value={waiting}
            description="Guests in queue"
            icon="👥"
            active
          />

          <StatCard
            label="Notified"
            value={notified}
            description="Ready to seat"
            icon="🔔"
          />

          <StatCard
            label="Seated"
            value={seated}
            description="Currently seated"
            icon="🪑"
          />

          <StatCard
            label="Tables"
            value={availableTables}
            description="Available now"
            icon="▦"
          />

        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          <section className="min-w-0">

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-lg font-semibold">
                  Live Queue
                </h3>

                <p className="text-xs text-white/40">
                  Manage guests currently waiting
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guest..."
                className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#e3a008]/50"
              />

            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">

              {["ALL", "WAITING", "NOTIFIED", "SEATED"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      filter === status
                        ? "bg-[#e3a008] text-black"
                        : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {status === "ALL"
                      ? "All"
                      : status.charAt(0) +
                        status.slice(1).toLowerCase()}
                  </button>
                )
              )}

            </div>

            <div className="rounded-2xl border border-white/10 bg-[#171715] p-4">

              {filteredEntries.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center">

                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-2xl">
                    {search ? "🔎" : "✓"}
                  </div>

                  <h4 className="font-semibold">
                    {search ? "No guests found" : "Queue is empty"}
                  </h4>

                  <p className="mt-1 max-w-xs text-xs text-white/35">
                    {search
                      ? "Try another guest name or phone number."
                      : "New WhatsApp customers and walk-ins will appear here automatically."}
                  </p>

                </div>
              ) : (
                <QueueBoard
                  entries={filteredEntries}
                  onNotify={handleNotify}
                  onSeat={handleSeat}
                  onRemove={handleRemove}
                />
              )}

            </div>

            <div className="mt-6">

              <div className="mb-3">
                <h3 className="text-lg font-semibold">
                  Add Walk-in
                </h3>

                <p className="text-xs text-white/40">
                  Add a customer who didn't join through WhatsApp.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#171715] p-5">
                <AddWalkInForm onAdd={handleAddWalkIn} />
              </div>

            </div>

          </section>

          <aside className="space-y-6">

            <div className="rounded-2xl border border-white/10 bg-[#171715] p-5">

              <div className="mb-4 flex items-center justify-between">

                <div>
                  <h3 className="font-semibold">
                    Tables
                  </h3>

                  <p className="text-xs text-white/40">
                    Manage table availability
                  </p>
                </div>

                <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                  {availableTables} free
                </span>

              </div>

              <TableGrid
                tables={tables}
                onToggle={handleToggleTable}
              />

            </div>

            <div className="rounded-2xl border border-white/10 bg-[#171715] p-5">

              <div className="mb-4">
                <h3 className="font-semibold">
                  Food Orders
                </h3>

                <p className="text-xs text-white/40">
                  Track kitchen progress
                </p>
              </div>

              <FoodTracker
                orders={foodOrders}
                onUpdateItems={handleUpdateFoodItems}
                onAdvanceStatus={handleAdvanceFoodStatus}
              />

            </div>

          </aside>

        </div>

      </main>

      <AppDock />

    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  active = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        active
          ? "border-[#e3a008]/30 bg-[#e3a008]/10"
          : "border-white/10 bg-[#171715]"
      }`}
    >
      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-medium text-white/45">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <span className="text-lg opacity-70">
          {icon}
        </span>

      </div>

      <p className="mt-2 text-[11px] text-white/30">
        {description}
      </p>
    </div>
  );
}