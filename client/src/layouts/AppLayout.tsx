import { Outlet } from "react-router-dom";
import { Footer } from "../components/Footer";
import { MobileNav } from "../components/MobileNav";
import { Navbar } from "../components/Navbar";
import { PageTransition } from "../components/PageTransition";
import { ScrollToTop } from "../components/ScrollToTop";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <PageTransition><Outlet /></PageTransition>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
