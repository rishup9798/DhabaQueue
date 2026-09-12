import { useState } from "react";

export default function AddWalkInForm({ onAdd }) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const size = parseInt(partySize, 10);
    if (!name.trim() || !size || size < 1 || size > 30) {
      setError("Enter a name and a party size between 1 and 30.");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), partySize: size, phoneNumber: phoneNumber.trim() || undefined });
      setName("");
      setPartySize("");
      setPhoneNumber("");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't add to queue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-panelLine bg-panel p-4 mb-6">
      <h2 className="text-paper font-medium mb-3">Add walk-in</h2>
      <p className="text-muted text-xs mb-3">
        For customers who don't want to use WhatsApp. Phone number is optional —
        without one, they won't get an automatic "table ready" text.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-ink border border-panelLine text-paper px-3 py-2 text-sm focus:outline-none focus:border-marigold"
        />
        <input
          type="number"
          placeholder="Party size"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          className="w-full sm:w-28 bg-ink border border-panelLine text-paper px-3 py-2 text-sm focus:outline-none focus:border-marigold"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full sm:w-40 bg-ink border border-panelLine text-paper px-3 py-2 text-sm focus:outline-none focus:border-marigold"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-marigold text-ink text-sm font-semibold px-4 py-2 disabled:opacity-60 shrink-0"
        >
          {submitting ? "Adding…" : "Add to queue"}
        </button>
      </div>

      {error && <p className="text-rust text-xs mt-2">{error}</p>}
    </form>
  );
}
