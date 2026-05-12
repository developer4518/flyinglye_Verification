"use client";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const HotelBooking = () => {
  const { setGuestDetails } = useHotelStore();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const payload = state?.payload || state;

  const { hotel, preBook, checkIn, checkOut, guests } = payload;

  if (!preBook) {
    return (
      <div className="p-10 text-center text-white bg-[#0B0B0F] min-h-screen">
        <h2 className="text-xl text-red-400 mb-4">⚠️ Session Expired</h2>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  const roomData = preBook?.raw?.HotelResult?.[0]?.Rooms?.[0];
  const validation = preBook?.validation || {};

  const bookingCode = preBook?.booking_code;
  const net = preBook?.net_amount || 0;
  const total = preBook?.total_amount || 0;
  const convenienceFee = preBook?.convenience_fee || 0;

  /* ================= GUEST STATE ================= */
  const totalGuests =
    typeof guests === "number"
      ? guests
      : (guests?.adults || 0) + (guests?.children || 0);

  const [guestList, setGuestList] = useState(
    Array.from({ length: totalGuests }, (_, i) => {
      const adultsCount = guests?.adults || totalGuests;
      const isChild = i >= adultsCount;

      return {
        Title: "Mr",
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Email: "",
        Phoneno: "",
        PaxType: isChild ? 2 : 1,
        LeadPassenger: i === 0,
        Age: "", // ✅ user will enter age
      };
    }),
  );

  const [loading, setLoading] = useState(false);

  const updateGuest = (index, field, value) => {
    const updated = [...guestList];
    updated[index][field] = value;
    setGuestList(updated);
  };

  const validateGuests = () => {
    for (let i = 0; i < guestList.length; i++) {
      const g = guestList[i];

      if (!g.FirstName.trim() || !g.LastName.trim()) {
        return `Guest ${i + 1}: First name and last name are required`;
      }

      if (!g.Age) {
        return `Guest ${i + 1}: Age is required`;
      }

      const age = Number(g.Age);

      if (Number.isNaN(age) || age <= 0) {
        return `Guest ${i + 1}: Enter valid age`;
      }

      if (g.PaxType === 1 && age < 12) {
        return `Guest ${i + 1}: Adult age must be 12 or above`;
      }

      if (g.PaxType === 2 && age >= 12) {
        return `Guest ${i + 1}: Child age must be below 12`;
      }

      if (g.LeadPassenger) {
        if (!g.Email.includes("@")) return "Valid email required";

        if (!/^[0-9]{10}$/.test(g.Phoneno)) {
          return "Valid 10-digit phone required";
        }
      }

      if (
        validation?.PaxNameMinLength &&
        g.FirstName.length < validation.PaxNameMinLength
      ) {
        return "Name too short";
      }

      if (
        validation?.PaxNameMaxLength &&
        g.FirstName.length > validation.PaxNameMaxLength
      ) {
        return "Name too long";
      }
    }

    return null;
  };

  /* ================= BOOK HOTEL ================= */
  const handleBookHotel = async () => {
    const error = validateGuests();
    if (error) return alert(error);

    try {
      setLoading(true);

      // ✅ CLEAN GUESTS (CRITICAL FIX)
      const cleanedGuests = guestList.map((g, i) => ({
        Title: g.Title,
        FirstName: g.FirstName,
        MiddleName: "",
        LastName: g.LastName,
        Email: i === 0 ? g.Email : undefined,
        Phoneno: i === 0 ? g.Phoneno : undefined,
        PaxType: g.PaxType,
        LeadPassenger: i === 0,
        Age: Number(g.Age), // ✅ important
      }));

      // ✅ SAFE ROOM STRUCTURE
      const HotelRoomsDetails = [
        {
          HotelPassenger: cleanedGuests,
        },
      ];

      const finalPayload = {
        BookingCode: bookingCode,
        IsVoucherBooking: true,
        GuestNationality: "IN",
        RequestedBookingMode: 5,
        NetAmount: net, // ❌ never round
        HotelRoomsDetails,
      };

      console.log("FINAL PAYLOAD:", JSON.stringify(finalPayload, null, 2));

      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        finalPayload,
      );

      console.log("BOOK RESPONSE:", res.data);

      // ✅ Save booking
      localStorage.setItem(
        "hotelBookingData",
        JSON.stringify({
          guestList: cleanedGuests,
          bookingCode,
          hotel,
          checkIn,
          checkOut,
          bookingResponse: res.data,
        }),
      );

      // ✅ Zustand
      setGuestDetails(cleanedGuests);

      // ✅ Navigate
      navigate("/hotel-booking-success", {
        state: { booking: res.data },
      });
    } catch (err) {
      console.log("BOOK ERROR:", err?.response?.data);
      alert(err?.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
            <h2 className="text-2xl font-bold text-yellow-400">
              {hotel?.hotel_name}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              📅 {checkIn} → {checkOut}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              🛏 {roomData?.Name?.[0] || "Standard Room"}
            </p>
          </div>

          {guestList.map((guest, index) => (
            <div
              key={index}
              className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
            >
              <h3 className="text-yellow-300 mb-4">
                Guest {index + 1} {guest.LeadPassenger && "(Lead)"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="First Name"
                  className="input"
                  value={guest.FirstName}
                  onChange={(e) =>
                    updateGuest(index, "FirstName", e.target.value)
                  }
                />
                <input
                  placeholder="Last Name"
                  className="input"
                  value={guest.LastName}
                  onChange={(e) =>
                    updateGuest(index, "LastName", e.target.value)
                  }
                />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {guest.PaxType === 1 ? "Adult Age" : "Child Age"}
                  </label>

                  <input
                    type="number"
                    min={guest.PaxType === 1 ? 12 : 1}
                    max={guest.PaxType === 1 ? 120 : 11}
                    placeholder={
                      guest.PaxType === 1
                        ? "Enter adult age"
                        : "Enter child age"
                    }
                    className="input"
                    value={guest.Age}
                    onChange={(e) => updateGuest(index, "Age", e.target.value)}
                  />
                </div>

                {guest.LeadPassenger && (
                  <>
                    <input
                      placeholder="Email"
                      className="input"
                      value={guest.Email}
                      onChange={(e) =>
                        updateGuest(index, "Email", e.target.value)
                      }
                    />
                    <input
                      placeholder="Phone"
                      className="input"
                      value={guest.Phoneno}
                      onChange={(e) =>
                        updateGuest(index, "Phoneno", e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800 h-fit sticky top-24">
          <h3 className="text-yellow-300 mb-4 text-lg">Price Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Net</span>
              <span>₹ {Math.round(net)}</span>
            </div>
            <div className="flex justify-between">
              <span>convenience Fees</span>
              <span>₹ {Math.round(convenienceFee)}</span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-yellow-400">₹ {Math.round(total)}</span>
            </div>
          </div>

          <button
            onClick={handleBookHotel}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold bg-linear-to-r from-yellow-400 to-orange-400 text-black"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .input {
          background: #0b0b0f;
          border: 1px solid #2a2a2f;
          padding: 12px;
          border-radius: 10px;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default HotelBooking;
