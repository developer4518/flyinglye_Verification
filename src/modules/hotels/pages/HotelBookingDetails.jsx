"use client";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { privateApi } from "../../../services/api";

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const HotelBookingDetails = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        let bookingId = id;

        if (!bookingId) {
          const saved = JSON.parse(
            localStorage.getItem("hotelBookingData") || "{}",
          );
          bookingId = saved?.bookingResponse?.data?.BookingId;
        }

        if (!bookingId) return navigate("/");

        const res = await privateApi.post("/hotels/hotel/get-booking-detail/", {
          BookingId: bookingId,
        });

        if (res.data?.success) {
          setData(res.data.data);
        } else throw new Error("Fetch failed");
      } catch (err) {
        console.error(err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, navigate]);

  if (loading)
    return <div className="text-white text-center py-24">Loading...</div>;

  if (!data)
    return <div className="text-white text-center py-24">Not Found</div>;

  // ✅ Pricing Fix
  const net = Number(data?.net_amount || data?.NetAmount || 0);
  const fee = Number(data?.convenience_fee || 0);
  const total = Number(data?.total_amount || net + fee);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
          <h2 className="text-2xl text-yellow-400">{data.HotelName}</h2>

          <div className="text-sm text-gray-400 mt-3 space-y-1">
            <p>Booking ID: {data.BookingId}</p>
            <p>Invoice: {data.InvoiceNo}</p>
            <p>Ref: {data.BookingRefNo}</p>
            <p>Confirmation: {data.ConfirmationNo}</p>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                data.HotelBookingStatus === "Cancelled"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {data.HotelBookingStatus}
            </span>

            <p className="text-xs text-gray-500 mt-2">
              Booked: {new Date(data.BookingDate).toLocaleString()}
            </p>
          </div>
        </div>

        {/* HOTEL INFO */}
        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
          <h3 className="text-yellow-300 mb-3">Hotel Info</h3>

          <p className="text-sm text-gray-400">
            {data.AddressLine1}, {data.City}
          </p>

          <p className="text-sm mt-2">
            {new Date(data.CheckInDate).toDateString()} →{" "}
            {new Date(data.CheckOutDate).toDateString()}
          </p>

          <p className="text-sm mt-1">⭐ {data.StarRating} Star</p>
        </div>

        {/* ROOMS LOOP ✅ */}
        {data.Rooms?.map((room, idx) => (
          <div
            key={idx}
            className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
          >
            <h3 className="text-yellow-300 mb-3">
              Room {idx + 1} - {room.RoomTypeName}
            </h3>

            <div
              className="text-sm text-gray-400"
              dangerouslySetInnerHTML={{
                __html: room.RoomDescription,
              }}
            />

            <p className="text-sm mt-2">
              Adults: {room.AdultCount} | Children: {room.ChildCount}
            </p>

            {/* Amenities */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-400">
              {room.Amenities?.slice(0, 9).map((a, i) => (
                <div key={i}>• {a}</div>
              ))}
            </div>

            {/* Guests */}
            <div className="mt-4">
              <h4 className="text-yellow-200 text-sm mb-1">Guests</h4>
              {room.HotelPassenger?.map((p, i) => (
                <div key={i} className="text-sm">
                  {p.Title} {p.FirstName} {p.LastName} ({p.Age})
                  {p.LeadPassenger && " • Lead"}
                </div>
              ))}
            </div>

            {/* Room Price */}
            <div className="mt-4 text-sm text-gray-300">
              <p>
                Room Price: ₹ {formatPrice(room.PriceBreakUp?.RoomRate || 0)}
              </p>
              <p>Tax: ₹ {formatPrice(room.PriceBreakUp?.RoomTax || 0)}</p>
            </div>
          </div>
        ))}

        {/* PRICE SUMMARY ✅ */}
        <div className="bg-yellow-400/10 p-6 rounded-3xl border border-yellow-400/20">
          <h3 className="text-yellow-300 mb-3 font-semibold">Price Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Net Amount</span>
              <span>₹ {formatPrice(net)}</span>
            </div>

            <div className="flex justify-between">
              <span>Convenience Fee</span>
              <span>₹ {formatPrice(fee)}</span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-yellow-400">₹ {formatPrice(total)}</span>
            </div>

            {/* REFUND */}
            {data?.HotelBookingStatus === "Cancelled" && (
              <div className="flex justify-between text-green-400 font-semibold pt-2">
                <span>Refund</span>
                <span>
                  ₹{" "}
                  {formatPrice(
                    data?.CancellationStatus?.[0]?.RefundAmount || 0,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* POLICIES */}
        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
          <h3 className="text-yellow-300 mb-3">Policies</h3>

          <ul className="text-sm text-gray-400 space-y-2">
            {data?.RateConditions?.slice(0, 6).map((r, i) => (
              <li key={i}>• {r.replace(/<[^>]+>/g, "")}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HotelBookingDetails;
