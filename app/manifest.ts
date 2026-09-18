import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Avatar Money — 내 수당 플래너",
    short_name: "Avatar Money",
    description: "회차별 목표금액으로 예상 수당과 타임라인을 보여주는 플래너",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8ff",
    theme_color: "#4F46E5",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
