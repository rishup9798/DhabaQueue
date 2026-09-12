import {
  MessageCircle,
  BrainCircuit,
  LayoutDashboard,
  Bell,
  Utensils,
} from "lucide-react";

import AppDock from "../components/AppDock";

const steps = [
  {
    icon: MessageCircle,
    title: "Customer Messages",
    text: "The customer sends their name and party size through WhatsApp.",
  },
  {
    icon: BrainCircuit,
    title: "AI Understands",
    text: "Local Ollama AI extracts the customer's name and number of people.",
  },
  {
    icon: LayoutDashboard,
    title: "Queue Updates",
    text: "The customer is automatically added to the restaurant queue.",
  },
  {
    icon: Bell,
    title: "Staff Notifies",
    text: "Restaurant staff can notify and seat customers from the dashboard.",
  },
  {
    icon: Utensils,
    title: "Food Tracking",
    text: "Staff can track orders from Ordered to Preparing, Ready and Served.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#09090b] px-6 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">
            DhabaQueue
          </p>

          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            How it works
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            From the first WhatsApp message to the
            final food order, everything stays connected.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <Icon size={28} />
                </div>

                <p className="mb-2 text-sm font-bold text-zinc-500">
                  0{index + 1}
                </p>

                <h2 className="text-2xl font-bold">
                  {step.title}
                </h2>

                <p className="mt-3 leading-7 text-zinc-400">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <AppDock />
    </main>
  );
}