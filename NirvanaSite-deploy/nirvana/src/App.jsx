import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AboutUs from "./components/AboutUs/AboutUs"
import FAQ from "./components/FAQ/FAQ";
import Booking from "./components/Booking/Booking";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Home from "./components/Home/Home";

import ReviewsPage from "./components/Review/ReviewPage";
import PropertyOverview from "./components/PropertyOverview/propertyOverview";
import PropertyPage from "./components/PropertyPage/PropertyPage";
import ActivitiesPage from "./components/NearbyActivities/ActivitiesPage";
import AdminLogin from "./components/Admin/AdminLogin";
import ProtectedAdminRoute from "./components/Admin/ProtectedAdminRoute";
import Dashboard from "./components/Admin/Dashboard";
import PropertyList from "./components/Admin/Properties/PropertyList";
import PropertyEditor from "./components/Admin/Properties/PropertyEditor";
import GlobalContent from "./components/Admin/Global/GlobalContent";
import ScrollToTop from "./components/scrolltotop/ScrolltoTop";
import './App.css';

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const mainContentClass = isAdminRoute ? "main-content admin-main-content" : "main-content";

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute ? <Navbar /> : null}
      <div className={mainContentClass}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/faq/:slug" element={<FAQ />} />
          <Route path="/book" element={<Booking />} />

          <Route path="/review" element={<ReviewsPage />} />
          <Route path="/review/:slug" element={<ReviewsPage />} />
          <Route path="/properties" element={<PropertyOverview />} />
          <Route path="/book/:slug" element={<Booking />} />

          {/* Dynamic Activity Route */}
          <Route path="/activities/:slug" element={<ActivitiesPage />} />

          {/* Dynamic Property Route */}
          <Route path="/:slug" element={<PropertyPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdminRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<PropertyList />} />
            <Route path="properties/:slug" element={<PropertyEditor />} />
            <Route path="global" element={<GlobalContent />} />
          </Route>
        </Routes>
      </div>
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename="/">
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
