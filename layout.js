import "./globals.css";

export const metadata = {
  title: "metas.app — Evolua junto",
  description: "Plataforma colaborativa de acompanhamento de metas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
