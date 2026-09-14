import "./globals.css";

export const metadata = {
  title: "StudyMate — AI Study Companion",
  description: "Your AI-powered learning workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
