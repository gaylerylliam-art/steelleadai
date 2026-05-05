import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        steel: "#52657a",
        alloy: "#1f7a8c",
        copper: "#b86b3d"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(23, 32, 51, 0.08)"
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        }
      },
      animation: {
        "slide-in": "slideIn 220ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
