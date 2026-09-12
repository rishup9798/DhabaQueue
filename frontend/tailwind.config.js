/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B19",       // base background - a working counter screen, not a bright SaaS panel
        panel: "#262420",     // card/row background, one step up from ink
        panelLine: "#3A3630", // hairline dividers
        paper: "#F2EAD8",     // primary text - warm off-white, not pure white
        muted: "#A9A08D",     // secondary text
        marigold: "#E3A008",  // at-risk / attention accent, evokes turmeric rather than generic red alert
        leaf: "#7A9B58",      // free table / healthy status
        rust: "#B4552E",      // occupied / stop-state, warmer than a stock red
      },
      fontFamily: {
        display: ["'Libre Franklin'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
