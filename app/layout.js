import "./globals.css";

export const metadata = {
  title: "مسار",
  description: "نظام إدارة المعاهد",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
