"use client";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useHotelStore } from "../../../store/hotelStore";

const HotelDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { selectedHotel, selectedRoom, search } = useHotelStore();

  const payload = state || {};

  const hotel = payload.hotel || selectedHotel;
  const room = payload.room || selectedRoom;
  const checkIn = payload.checkIn || search?.checkIn;
  const checkOut = payload.checkOut || search?.checkOut;
  const guests = payload.guests || search?.guests;

  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        No hotel data found
      </div>
    );
  }

  const images =
    Array.isArray(hotel?.images) && hotel.images.length > 0
      ? hotel.images
      : [hotel?.image || "https://via.placeholder.com/600"];

  const totalGuests = (guests?.adults || 0) + (guests?.children || 0);

  const formatPrice = (val) => Math.round(val || 0).toLocaleString("en-IN");

  const handlePreBook = () => {
    if (!room?.BookingCode) return alert("Invalid room");

    setLoading(true);

    navigate("/prebook", {
      state: { hotel, room, checkIn, checkOut, guests },
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-16 md:py-24">
      {/* ================= IMAGE GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {/* MAIN IMAGE */}
        <div className="md:col-span-2">
          <img
            src={images[0]}
            onClick={() => setSelectedImage(images[0])}
            className="w-full h-64 md:h-105 object-cover rounded-2xl cursor-pointer hover:opacity-90 transition"
          />
        </div>

        {/* SIDE IMAGES */}
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          {images.slice(1, 5).map((img, i) => (
            <img
              key={i}
              src={img}
              onClick={() => setSelectedImage(img)}
              className="w-full h-32 md:h-50 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
            />
          ))}
        </div>
      </div>

      {/* ================= LIGHTBOX ================= */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 text-white text-xl"
          >
            ✕
          </button>

          <img
            src={selectedImage}
            className="max-h-[90%] max-w-[90%] rounded-xl"
          />
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="md:col-span-2 space-y-6">
          {/* HOTEL HEADER */}
          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">
              {hotel.hotel_name}
            </h1>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-yellow-300 text-sm">
                ⭐ {hotel.rating || "4.2"}
              </span>

              {hotel.refundable && (
                <span className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded-full">
                  Refundable
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-400">
              📅 {checkIn} → {checkOut} • 👤 {totalGuests} Guests
            </p>
          </div>

          {/* ROOM DETAILS */}
          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h2 className="text-lg text-yellow-300 mb-3">Room Details</h2>

            <p className="text-sm mb-2">
              🛏 <strong>{room?.Name || "Standard Room"}</strong>
            </p>

            {hotel.meal && (
              <p className="text-sm mb-2">🍽 {hotel.meal.replace("_", " ")}</p>
            )}

            <p className="text-sm text-gray-400">
              ✔ Free WiFi • ✔ AC • ✔ 24h Support
            </p>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h2 className="text-lg text-yellow-300 mb-3">About this hotel</h2>

            <p className="text-sm text-gray-400">
              {showFullDesc
                ? "This premium hotel offers modern rooms, excellent hospitality, and top-class amenities. Ideal for business and leisure stays with easy access to major attractions."
                : "This premium hotel offers modern rooms and excellent hospitality..."}
            </p>

            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="mt-2 text-sm text-yellow-400 hover:underline"
            >
              {showFullDesc ? "Show Less" : "Read More"}
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800 md:sticky md:top-24 h-fit">
          <h2 className="text-lg text-yellow-300 mb-4">Price Details</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Room Price</span>
              <span>₹ {formatPrice(hotel.price)}</span>
            </div>

            <div className="flex justify-between">
              <span>Taxes</span>
              <span>₹ {formatPrice(hotel.tax)}</span>
            </div>

            <hr className="border-gray-700 my-2" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-yellow-400">
                ₹ {formatPrice(hotel.price + hotel.tax)}
              </span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handlePreBook}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-lg bg-linear-to-r from-yellow-400 to-orange-400 text-black hover:scale-105 transition"
          >
            {loading ? "Processing..." : "Book Now"}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="mt-3 w-full text-sm text-gray-400 hover:text-white transition"
          >
            ← Back to results
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;
