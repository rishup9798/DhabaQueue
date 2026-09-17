"use client";

import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_TAGS = [
  { text: "Smart Queue", background: "#F59E0B", color: "#111827" },
  { text: "WhatsApp AI", background: "#22C55E", color: "#ffffff" },
  { text: "Live Dashboard", background: "#2563EB", color: "#ffffff" },
  { text: "Zero Waiting Chaos", background: "#7C3AED", color: "#ffffff" },
];

export default function HeroScrollVideoReveal({
  topText,
  headingText,
  tags = DEFAULT_TAGS,
  subText = "AI-powered queue management for modern restaurants.",
  videoSrc = "https://res.cloudinary.com/dsuwzuaxp/video/upload/856381-hd_1920_1080_30fps_gsq11b.mp4",
  bottomText,
  className = "",
}) {
  const heroRef = useRef(null);
  const introRef = useRef(null);
  const videoSectionRef = useRef(null);
  const videoBoxRef = useRef(null);
  const videoRef = useRef(null);
  const headingRef = useRef(null);
  const tagsRef = useRef([]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.play().catch((error) => console.log("Video autoplay blocked:", error));
    }

    const ctx = gsap.context(() => {
      const headingWords = headingRef.current?.querySelectorAll(".hero-word");
      gsap.set(headingWords, { opacity: 0, y: 35, rotateX: 40 });
      gsap.to(headingWords, {
        opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.06, ease: "power3.out",
        scrollTrigger: { trigger: introRef.current, start: "top 65%", toggleActions: "play none none reverse" },
      });

      const tagElements = tagsRef.current.filter(Boolean);
      gsap.set(tagElements, { opacity: 0, y: 25, scale: 0.85 });
      gsap.to(tagElements, {
        opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: "back.out(1.5)",
        scrollTrigger: { trigger: introRef.current, start: "top 50%", toggleActions: "play none none reverse" },
      });

      gsap.set(videoBoxRef.current, { clipPath: "circle(8% at 50% 50%)", scale: 1 });
      const videoTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: videoSectionRef.current, start: "top top", end: "+=1800", scrub: 1.2,
          pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      videoTimeline
        .to(videoBoxRef.current, { clipPath: "circle(150% at 50% 50%)", ease: "none", duration: 1 })
        .to(videoBoxRef.current, { scale: 1.05, ease: "none", duration: 1 }, 0);

      gsap.fromTo(".hero-bottom-word", { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out",
        scrollTrigger: {
          trigger: heroRef.current?.querySelector(".hero-bottom"), start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });
    }, heroRef);

    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => { clearTimeout(refreshTimer); ctx.revert(); };
  }, []);

  const renderWords = (content) => {
    if (typeof content !== "string") return content;
    return content.split(" ").map((word, index) => (
      <span key={`${word}-${index}`} className="hero-word mr-[0.25em] inline-block">{word}</span>
    ));
  };

  return (
    <div ref={heroRef} className={`w-full overflow-hidden bg-[#09090b] text-white ${className}`}>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#e3a008]/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[#7c3aed]/10 blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-5xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Restaurant Queue Intelligence</span>
          </div>
          <h1 className="text-[clamp(3rem,8vw,8rem)] font-black leading-[0.9] tracking-[-0.06em]">
            {topText || <><span>Welcome to</span><br /><span className="text-[#e3a008]">DhabaQueue</span></>}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/45 md:text-lg">Stop making your customers wait without knowing what comes next.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="rounded-full bg-[#e3a008] px-7 py-3.5 text-sm font-bold text-black shadow-[0_0_40px_rgba(227,160,8,0.2)] transition duration-300 hover:scale-105 hover:bg-[#f5b51b]">Open Dashboard</Link>
            <Link to="/how-it-works" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-white/10">See How It Works</Link>
          </div>
          <div className="mt-16 text-xs uppercase tracking-[0.3em] text-white/25">Scroll to explore</div>
          <div className="mx-auto mt-5 h-10 w-px bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      <section ref={introRef} className="relative flex min-h-screen items-center justify-center px-5 py-24">
        <div className="mx-auto w-full max-w-6xl text-center">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-[#e3a008]">One system. Everything connected.</p>
          <h2 ref={headingRef} className="mx-auto max-w-5xl text-[clamp(2.5rem,6vw,6.5rem)] font-black leading-[0.95] tracking-[-0.05em]" style={{ perspective: "800px" }}>
            {renderWords(headingText || "Turn restaurant queues into seamless experiences.")}
          </h2>
          <div className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-3">
            {tags.map((tag, index) => (
              <div key={tag.id || index} ref={(element) => { tagsRef.current[index] = element; }} className="rounded-full px-5 py-3 text-sm font-bold shadow-lg sm:px-7 sm:py-3.5 sm:text-base" style={{ backgroundColor: tag.background, color: tag.color || "#ffffff" }}>{tag.text}</div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-xl text-base leading-7 text-white/40 md:text-lg">{subText}</p>
        </div>
      </section>

      <section ref={videoSectionRef} className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#09090b]">
        <div ref={videoBoxRef} className="relative h-full w-full overflow-hidden" style={{ clipPath: "circle(8% at 50% 50%)" }}>
          <video ref={videoRef} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover"><source src={videoSrc} type="video/mp4" /></video>
          <div className="absolute inset-0 bg-black/25" /><div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          <div className="absolute inset-0 flex items-center justify-center"><div className="rounded-full border border-white/20 bg-black/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 backdrop-blur-xl">Smart restaurant operations</div></div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"><p className="text-xs uppercase tracking-[0.3em] text-white/50">DhabaQueue</p></div>
        </div>
      </section>

      <section className="hero-bottom relative flex min-h-screen items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0"><div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e3a008]/10 blur-[130px]" /></div>
        <div className="relative z-10 max-w-5xl">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-white/30">The future of restaurant queues</p>
          <h2 className="text-[clamp(3rem,8vw,8rem)] font-black leading-[0.9] tracking-[-0.06em]">
            {bottomText || <><span className="hero-bottom-word inline-block">Less waiting.</span><br /><span className="hero-bottom-word inline-block text-[#e3a008]">More dining.</span></>}
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base leading-7 text-white/40 md:text-lg">Give your staff a simple way to manage the queue while your customers stay informed.</p>
          <div className="mt-10"><Link to="/dashboard" className="inline-flex rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition duration-300 hover:scale-105 hover:bg-white/90">Launch DhabaQueue →</Link></div>
        </div>
      </section>
    </div>
  );
}
