import { useState } from "react";
import { createApiClient } from "../api.js";

export default function TableGrid({ tables = [], onTableAdded }) {
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(event) {
    event.preventDefault();
    setError("");

    const tableNumber = Number(number);
    const tableCapacity = Number(capacity);
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      setError("Enter a valid table number.");
      return;
    }
    if (!Number.isInteger(tableCapacity) || tableCapacity < 1 || tableCapacity > 30) {
      setError("Capacity must be between 1 and 30.");
      return;
    }

    setAdding(true);
    try {
      const token = localStorage.getItem("queuechat_token");
      await createApiClient(token).post("/api/queue/tables", {
        number: tableNumber,
        capacity: tableCapacity,
      });
      setNumber("");
      setCapacity("2");
      if (onTableAdded) await onTableAdded(table);
    } catch (err) {
      setError(err.message || "Couldn't add table.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="500"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Table #"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#e3a008]/50"
          />
          <select
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className="rounded-lg border border-white/10 bg-[#171715] px-2 py-2 text-xs text-white outline-none focus:border-[#e3a008]/50"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30].map((size) => (
              <option key={size} value={size}>{size} seats</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="shrink-0 rounded-lg bg-[#e3a008] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#f0b51b] disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}
      </form>

      {tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
          <p className="text-xs text-white/50">No tables configured yet.</p>
          <p className="mt-1 text-[10px] text-white/25">Add your tables above. Seating will automatically choose the smallest suitable free table.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tables.map((table) => {
            const currentEntry = table.queueEntries?.[0];
            const isOccupied = table.status === "OCCUPIED";
            const customerName = currentEntry?.customer?.name || currentEntry?.customer?.phoneNumber || "Guest";

            return (
              <div
                key={table.id}
                className={`rounded-xl border p-3 transition ${
                  isOccupied ? "border-[#e3a008]/30 bg-[#e3a008]/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Table {table.number}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${isOccupied ? "bg-[#e3a008]" : "bg-green-500"}`} />
                </div>
                <div className="mt-2">
                  <p className={`text-[11px] font-medium ${isOccupied ? "text-[#e3a008]" : "text-green-400"}`}>
                    {isOccupied ? "OCCUPIED" : "FREE"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">Capacity: {table.capacity}</p>
                  {isOccupied && currentEntry && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                      <p className="truncate text-xs font-medium text-white">{customerName}</p>
                      <p className="mt-0.5 text-[10px] text-white/40">
                        {currentEntry.partySize} {currentEntry.partySize === 1 ? "guest" : "guests"}
                      </p>
                    </div>
                  )}
                  {!isOccupied && <p className="mt-3 text-[10px] text-white/30">Available for next party</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
