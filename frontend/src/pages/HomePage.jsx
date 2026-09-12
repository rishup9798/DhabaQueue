import HeroScrollVideoReveal from "../components/ui/hero-scroll-video-pin-reveal.jsx";
import AppDock from "../components/AppDock.jsx";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#09090b]">
      <HeroScrollVideoReveal />
      <AppDock />
    </main>
  );
}