export default function TableGrid({ tables, onToggle }) {
  return (
    <div className="border border-panelLine bg-panel p-4">
      <h2 className="text-paper font-medium mb-3">Tables</h2>
      <div className="grid grid-cols-2 gap-2">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => onToggle(table.id)}
            className={`text-left px-3 py-2 border ${
              table.status === "FREE"
                ? "border-leaf/50 bg-leaf/10"
                : "border-rust/50 bg-rust/10"
            }`}
          >
            <p className="text-paper text-sm font-medium">Table {table.number}</p>
            <p className={`text-xs font-mono ${table.status === "FREE" ? "text-leaf" : "text-rust"}`}>
              {table.status === "FREE" ? "free" : "occupied"} · seats {table.capacity}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
