import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Store Platform",
  description: "Punto de venta multi-tienda",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* aplica el tema guardado antes del primer paint (evita flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("store.theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
