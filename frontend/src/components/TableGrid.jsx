export default function TableGrid({ tables = [] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tables.map((table) => {
        const currentEntry = table.queueEntries?.[0];

        const isOccupied = table.status === "OCCUPIED";

        const customerName =
          currentEntry?.customer?.name ||
          currentEntry?.customer?.phoneNumber ||
          "Guest";

        return (
          <div
            key={table.id}
            className={`rounded-xl border p-3 transition ${
              isOccupied
                ? "border-[#e3a008]/30 bg-[#e3a008]/10"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Table {table.number}
              </span>

              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOccupied ? "bg-[#e3a008]" : "bg-green-500"
                }`}
              />
            </div>

            <div className="mt-2">
              <p
                className={`text-[11px] font-medium ${
                  isOccupied ? "text-[#e3a008]" : "text-green-400"
                }`}
              >
                {isOccupied ? "OCCUPIED" : "FREE"}
              </p>

              <p className="mt-1 text-[11px] text-white/40">
                Capacity: {table.capacity}
              </p>

              {isOccupied && currentEntry && (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                  <p className="truncate text-xs font-medium text-white">
                    {customerName}
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/40">
                    {currentEntry.partySize}{" "}
                    {currentEntry.partySize === 1 ? "guest" : "guests"}
                  </p>
                </div>
              )}

              {!isOccupied && (
                <p className="mt-3 text-[10px] text-white/30">
                  Available for next party
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}