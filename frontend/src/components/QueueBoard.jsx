function minutesSince(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export default function QueueBoard({ entries = [], onNotify, onSeat, onRemove }) {
  if (entries.length === 0) {
    return (
      <div className="border border-panelLine bg-panel px-6 py-12 text-center">
        <p className="text-paper text-lg font-medium">Queue is empty</p>
        <p className="text-muted text-sm mt-1">
          Customers who message the WhatsApp number will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-panelLine bg-panel divide-y divide-panelLine">
      {entries.map((entry, i) => (
        <QueueRow
          key={entry.id}
          position={i + 1}
          entry={entry}
          onNotify={() => onNotify(entry.id)}
          onSeat={() => onSeat(entry.id)}
          onRemove={() => onRemove(entry.id)}
        />
      ))}
    </div>
  );
}

function QueueRow({ position, entry, onNotify, onSeat, onRemove }) {
  const waited = minutesSince(entry.joinedAt);
  const name =
    entry.customer?.name || formatPhone(entry.customerPhoneNumber);
  const isRegular = (entry.customer?.visitCount ?? 0) > 1;

  const isWaiting = entry.status === "WAITING";
  const isNotified = entry.status === "NOTIFIED";
  const isSeated = entry.status === "SEATED";

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 ${
        entry.isAtRisk
          ? "bg-marigold/10 border-l-4 border-marigold"
          : "border-l-4 border-transparent"
      }`}
    >
      <span className="font-mono text-2xl text-paper w-10 shrink-0">
        #{position}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-paper font-medium truncate">
            {name}
          </span>

          {isRegular && (
            <span className="text-xs text-marigold border border-marigold/40 px-1.5 py-0.5 shrink-0">
              regular · visit {entry.customer.visitCount}
            </span>
          )}
        </div>

        <p className="text-muted text-sm">
          Party of {entry.partySize} · waiting {waited} min
          {entry.isAtRisk && (
            <span className="text-marigold"> · over estimate</span>
          )}
        </p>

        {isSeated && entry.table?.number && (
          <p className="text-leaf text-xs mt-1">
            Table {entry.table.number} · Seated
          </p>
        )}
      </div>

      <span className="font-mono text-sm text-muted w-24 text-right shrink-0">
        est. {entry.estimatedWaitMinutes} min
      </span>

      <div className="flex gap-2 shrink-0">
        {isWaiting && (
          <button
            onClick={onNotify}
            className="bg-leaf text-ink text-sm font-semibold px-3 py-1.5"
          >
            Notify
          </button>
        )}

        {(isWaiting || isNotified) && (
          <button
            onClick={onSeat}
            className="border border-panelLine text-paper text-sm px-3 py-1.5 hover:border-leaf"
          >
            Seat
          </button>
        )}

        {(isWaiting || isNotified) && (
          <button
            onClick={onRemove}
            className="border border-panelLine text-muted text-sm px-3 py-1.5 hover:border-rust hover:text-rust"
          >
            Remove
          </button>
        )}

        {isSeated && (
          <span className="border border-leaf/40 text-leaf text-sm px-3 py-1.5">
            Seated
          </span>
        )}
      </div>
    </div>
  );
}

function formatPhone(phone) {
  if (!phone) return "Walk-in";
  return phone.length > 6 ? `…${phone.slice(-6)}` : phone;
}