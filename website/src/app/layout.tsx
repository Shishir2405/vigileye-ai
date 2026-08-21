import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "VigilEye AI",
  description: "AI-powered automated structural health monitoring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border) / 0.6)",
              borderRadius: "16px",
              boxShadow: "rgba(205, 208, 223, 0.4) 0px 2px 48px 0px",
            },
          }}
        />
      </body>
    </html>
  );
}
