"use client";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { sendHotelChangeRequest } from "../../../services/sendHotelChangeRequest";

const HotelBookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState(null);
  const [changeError, setChangeError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [guestDetails, setGuestDetails] = useState([]);

  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelData, setCancelData] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  const [viewLoading, setViewLoading] = useState(false);

  /* ================= LOAD BOOKING ================= */
  useEffect(() => {
    try {
      let bookingData = location.state?.booking;

      // ✅ fallback (page reload case)
      if (!bookingData) {
        const saved = JSON.parse(
          localStorage.getItem("hotelBookingData") || "{}",
        );
        bookingData = saved.bookingResponse;
      }

      if (!bookingData) throw new Error("No booking data");

      // ✅ extract API response correctly
      setBooking(bookingData.data);

      const saved = JSON.parse(
        localStorage.getItem("hotelBookingData") || "{}",
      );

      setHotel(saved.hotel);
      setGuestDetails(saved.guestList || []);
    } catch (err) {
      console.error("BOOKING LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= DOWNLOAD INVOICE ================= */
  const handleInvoiceClick = () => {
    // 👉 Replace with real API when available
    alert(`Invoice No: ${booking.InvoiceNumber}`);
  };

  /* ================= CANCEL ================= */
  const handleChangeRequest = async () => {
    const remarks = window.prompt("Enter change request reason");
    if (!remarks) return;

    try {
      setChangeLoading(true);
      setChangeMsg(null);
      setChangeError(null);

      const res = await sendHotelChangeRequest(booking.BookingId, remarks);

      if (res?.success) {
        // 🔥 Proper message
        setChangeMsg(
          `${res.message} (Request ID: ${res.data?.ChangeRequestId})`,
        );
      } else {
        setChangeError(
          res?.message || res?.Error?.ErrorMessage || "Change request failed",
        );
      }
    } catch (err) {
      setChangeError(
        err?.response?.data?.message ||
          err?.response?.data?.Error?.ErrorMessage ||
          "Something went wrong",
      );
    } finally {
      setChangeLoading(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="text-white text-center py-24">Loading booking...</div>
    );
  }

  if (!booking) {
    return (
      <div className="p-10 text-center text-white bg-[#0B0B0F] min-h-screen">
        <h2 className="text-red-400 mb-4">⚠️ Booking not found</h2>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      {/* HEADER */}
      <div className="text-center mb-12">
        <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-5">
          <span className="text-5xl">✅</span>
        </div>

        <h1 className="text-3xl font-bold text-green-400">
          Booking Confirmed!
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* HOTEL */}
          <div className="bg-[#15151C] p-6 rounded-3xl border border-gray-800">
            <h2 className="text-xl text-yellow-400">{hotel?.hotel_name}</h2>

            <div className="text-sm text-gray-400 mt-3 space-y-1">
              <p>🏨 Booking ID: {booking.BookingId}</p>

              {/* ✅ CLICKABLE INVOICE */}
              <p>
                📄 Invoice: {booking.InvoiceNumber?.slice(0, 2)}
                <span
                  onClick={handleInvoiceClick}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {booking.InvoiceNumber?.slice(2)}
                </span>
              </p>

              <p>🔖 Ref: {booking.BookingRefNo}</p>
              <p>🔐 Confirmation: {booking.ConfirmationNo}</p>
              <p className="text-green-400">
                Status: {booking.HotelBookingStatus}
              </p>
            </div>
          </div>

          {/* GUESTS */}
          {guestDetails.length > 0 && (
            <div className="bg-[#15151C] p-6 rounded-3xl border border-gray-800">
              <h3 className="text-yellow-300 mb-3">Guests</h3>

              {guestDetails.map((g, i) => (
                <div key={i} className="text-sm py-1">
                  {g.FirstName} {g.LastName}
                </div>
              ))}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => {
                setViewLoading(true);
                navigate(`/booking-details/${booking.BookingId}`);
              }}
              className="px-5 py-2 bg-blue-500 rounded-lg"
            >
              {viewLoading ? "Loading..." : "View Details"}
            </button>

            <button
              onClick={handleChangeRequest}
              className="px-5 py-2 bg-yellow-400 text-black rounded-lg"
            >
              {changeLoading ? "Sending..." : "Send Change Request"}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-[#15151C] p-6 rounded-3xl border border-gray-800">
          <h3 className="text-yellow-300 mb-4">Payment</h3>

          {/* ✅ FIX: amount from localStorage */}
          <p>
            ₹{" "}
            {Math.round(
              JSON.parse(localStorage.getItem("hotelBookingData") || "{}")
                ?.net || 0,
            )}
          </p>

          <p className="text-green-400">Success</p>
        </div>
      </div>

      {/* CANCEL RESULT */}
      {cancelData && (
        <div className="mt-6 text-green-400">
          Refunded ₹ {cancelData.RefundedAmount}
        </div>
      )}

      {changeMsg && (
        <div className="mt-6 bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-green-400">
          {changeMsg}
        </div>
      )}

      {changeError && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400">
          {changeError}
        </div>
      )}
    </div>
  );
};

export default HotelBookingSuccess;
