import Navbar from "../../src/components/Navbar/Navbar";
import Footer from "../../src/components/Footer/Footer";

export default function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </>
  );
}
