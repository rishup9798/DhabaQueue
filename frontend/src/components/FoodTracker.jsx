const STATUS_FLOW = ["ORDERED", "PREPARING", "READY", "SERVED"];
const STATUS_LABEL = {
  ORDERED: "Ordered",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
};
const STATUS_COLOR = {
  ORDERED: "text-muted",
  PREPARING: "text-marigold",
  READY: "text-leaf",
  SERVED: "text-muted",
};

export default function FoodTracker({ orders, onUpdateItems, onAdvanceStatus }) {
  if (orders.length === 0) {
    return (
      <div className="border border-panelLine bg-panel p-4">
        <h2 className="text-paper font-medium mb-1">Food tracker</h2>
        <p className="text-muted text-sm">No active orders — appears once a party is seated.</p>
      </div>
    );
  }

  return (
    <div className="border border-panelLine bg-panel p-4">
      <h2 className="text-paper font-medium mb-3">Food tracker</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <FoodOrderRow
            key={order.id}
            order={order}
            onUpdateItems={(items) => onUpdateItems(order.id, items)}
            onAdvanceStatus={() => onAdvanceStatus(order.id, nextStatus(order.status))}
          />
        ))}
      </div>
    </div>
  );
}

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
}

function FoodOrderRow({ order, onUpdateItems, onAdvanceStatus }) {
  const name = order.queueEntry.customer?.name || "Guest";
  const isFinal = order.status === "SERVED";

  return (
    <div className="border border-panelLine p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-paper text-sm font-medium">
          {name} · party of {order.queueEntry.partySize}
        </span>
        <span className={`font-mono text-xs ${STATUS_COLOR[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <input
        type="text"
        defaultValue={order.itemsSummary}
        placeholder="e.g. 2x thali, 1x lassi"
        onBlur={(e) => onUpdateItems(e.target.value)}
        className="w-full bg-ink border border-panelLine text-paper text-sm px-2 py-1 mb-2 focus:outline-none focus:border-marigold"
      />

      {!isFinal && (
        <button
          onClick={onAdvanceStatus}
          className="text-xs bg-marigold text-ink font-semibold px-3 py-1.5"
        >
          Mark as {STATUS_LABEL[nextStatus(order.status)]}
        </button>
      )}
    </div>
  );
}
