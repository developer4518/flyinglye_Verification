import React from "react";
import Register from "./Pages/Register";
import { Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import LoginPage from "./Pages/LoginPage";
import ContactPage from "./Pages/ContactPage";
import Navbar from "./components/Home/Navbar";
import FareRule from "./modules/flights/pages/FareRule";
import FareQuote from "./modules/flights/pages/FareQuote";
import SSRPage from "./modules/flights/pages/SSRPage";
import PassengerDetails from "./modules/flights/pages/PassengerDetails";
import ReviewBooking from "./modules/flights/pages/ReviewBooking";
import BookingSuccess from "./modules/flights/pages/BookingSuccess";
import BookingDetails from "./modules/flights/pages/FlightBookingDetails";
import TermsConditions from "./Pages/TermsConditions";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import RefundPolicy from "./Pages/RefundPolicy";
import PackageDetails from "./modules/packages/PackageDetail";
import PackageSection from "./modules/packages/PackageSection";
import PackageBookingSuccess from "./modules/packages/PackageBookingSuccess";
import AboutUs from "./components/Home/AboutUs";
import MyBookings from "./components/Home/Mybookings";
import WhatsAppFloating from "./components/WhatsAppFloating";
import Footer from "./components/Home/Footer/Footer";
import FlightsResults from "./modules/flights/pages/FlightsResults";
import HotelResults from "./modules/hotels/pages/HotelResults";
import HotelDetails from "./modules/hotels/pages/HotelDetails";
import PrebookLoader from "./modules/hotels/pages/PreBookLoader";
import HotelBooking from "./modules/hotels/pages/HotelBooking";
import HotelBookingSuccess from "./modules/hotels/pages/BookingSuccess";
import HotelBookingDetails from "./modules/hotels/pages/HotelBookingDetails";
import FlightBookingDetails from "./modules/flights/pages/FlightBookingDetails";
import Blogs from "./Pages/Blogs";
import BlogDetails from "./Pages/BlogDetails";

const App = () => {
  return (
    <main>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/packages" element={<PackageSection limit={8} />} />
        <Route path="/packages/:slug" element={<PackageDetails />} />
        <Route
          path="/package_booking_success/:bookingId"
          element={<PackageBookingSuccess />}
        />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:slug" element={<BlogDetails />} />
        <Route path="/flights" element={<FlightsResults />} />
        <Route path="/hotels" element={<HotelResults />} />
        <Route path="/hotels/:id" element={<HotelDetails />} />
        <Route path="/prebook" element={<PrebookLoader />} />
        <Route path="/hotel-booking" element={<HotelBooking />} />
        {/* <Route path="/booking-success" element={<HotelBookingSuccess />} /> */}
        <Route
          path="/hotel-booking-success"
          element={<HotelBookingSuccess />}
        />
        <Route
          path="/booking-details/:bookingId"
          element={<HotelBookingDetails />}
        />
        <Route path="/fare-rule" element={<FareRule />} />
        <Route path="/fare-quote" element={<FareQuote />} />
        <Route path="/ssr" element={<SSRPage />} />
        <Route path="/passenger-details" element={<PassengerDetails />} />
        <Route path="/review-booking" element={<ReviewBooking />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route
          path="/flight-booking-details/:id"
          element={<FlightBookingDetails />}
        />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        {/* <Route path="/hotels" element={<HotelPage />} /> */}
        {/* <Route path="/railways" element={<RailwayPage />} /> */}
        {/* Optional: 404 Page */}
        <Route
          path="*"
          element={<h1 className="text-center mt-20">404 - Page Not Found</h1>}
        />
      </Routes>

      <WhatsAppFloating />
      <Footer />
    </main>
  );
};

export default App;
