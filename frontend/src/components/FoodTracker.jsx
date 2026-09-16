const STATUS_FLOW = ["ORDERED", "PREPARING", "READY", "SERVED"];

const STATUS_LABEL = {
  ORDERED: "Ordered",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
};

const STATUS_COLOR = {
  ORDERED: "text-white/50",
  PREPARING: "text-[#e3a008]",
  READY: "text-green-400",
  SERVED: "text-white/40",
};

export default function FoodTracker({
  orders = [],
  history = [],
  onUpdateItems,
  onAdvanceStatus,
}) {
  return (
    <div className="space-y-5">
      {/* Active Orders */}
      <div className="rounded-2xl border border-white/10 bg-[#171715] p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-white">Food Orders</h2>
          <p className="mt-1 text-xs text-white/40">
            Track kitchen progress for seated guests.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-white/50">
              No active food orders.
            </p>
            <p className="mt-1 text-xs text-white/25">
              An order appears automatically when a party is seated.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <FoodOrderRow
                key={order.id}
                order={order}
                onUpdateItems={(items) =>
                  onUpdateItems(order.id, items)
                }
                onAdvanceStatus={() =>
                  onAdvanceStatus(
                    order.id,
                    nextStatus(order.status)
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Food History */}
      <div className="rounded-2xl border border-white/10 bg-[#171715] p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-white">Food History</h2>
          <p className="mt-1 text-xs text-white/40">
            Previously served orders.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-white/50">
              No served orders yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((order) => (
              <HistoryRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function nextStatus(current) {
  const index = STATUS_FLOW.indexOf(current);

  return STATUS_FLOW[
    Math.min(index + 1, STATUS_FLOW.length - 1)
  ];
}

function FoodOrderRow({
  order,
  onUpdateItems,
  onAdvanceStatus,
}) {
  const customer = order.queueEntry?.customer;

  const name = customer?.name || "Guest";

  const tableNumber = order.queueEntry?.table?.number;

  const isFinal = order.status === "SERVED";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            {name}
          </p>

          <p className="mt-1 text-[11px] text-white/40">
            Party of {order.queueEntry?.partySize || 0}
            {tableNumber
              ? ` · Table ${tableNumber}`
              : ""}
          </p>
        </div>

        <span
          className={`whitespace-nowrap font-mono text-[11px] ${STATUS_COLOR[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <input
        type="text"
        defaultValue={order.itemsSummary}
        placeholder="e.g. 2x thali, 1x lassi"
        onBlur={(event) =>
          onUpdateItems(event.target.value)
        }
        className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#e3a008]/50"
      />

      {!isFinal && (
        <button
          onClick={onAdvanceStatus}
          className="rounded-lg bg-[#e3a008] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#f0b51b]"
        >
          Mark as {STATUS_LABEL[nextStatus(order.status)]}
        </button>
      )}
    </div>
  );
}

function HistoryRow({ order }) {
  const customer = order.queueEntry?.customer;

  const name = customer?.name || "Guest";

  const tableNumber = order.queueEntry?.table?.number;

  const servedTime = order.servedAt
    ? new Date(order.servedAt).toLocaleString()
    : "Completed";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">
            {name}
          </p>

          <p className="mt-1 text-[10px] text-white/40">
            Party of {order.queueEntry?.partySize || 0}
            {tableNumber
              ? ` · Table ${tableNumber}`
              : ""}
          </p>

          {order.itemsSummary && (
            <p className="mt-2 text-[10px] text-white/50">
              {order.itemsSummary}
            </p>
          )}
        </div>

        <span className="whitespace-nowrap text-[10px] text-white/30">
          {servedTime}
        </span>
      </div>

      <div className="mt-2">
        <span className="text-[10px] font-medium text-green-400">
          SERVED
        </span>
      </div>
    </div>
  );
}