import Navbar from "../../src/components/Navbar/Navbar";
import Footer from "../../src/components/Footer/Footer";
import ChatWidget from "../../src/components/ChatWidget/ChatWidget";

export default function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
