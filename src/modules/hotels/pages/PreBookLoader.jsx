"use client";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";

const PrebookLoader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Handle both direct state & return-from-login payload
  const state = location.state || {};
  const payload = state?.payload || state;

  const { hotel, room, checkIn, checkOut, guests } = payload;

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false); // ✅ prevent double API call

  // ✅ Safety guard (prevents crash on refresh / invalid entry)
  useEffect(() => {
    if (!hotel || !room) {
      navigate("/");
    }
  }, [hotel, room, navigate]);
;
  useEffect(() => {
    if (hasRun) return;
    setHasRun(true);

    if (!room?.BookingCode) {
      setError("Invalid room selection");
      setStatus("error");
      return;
    }

    const prebook = async () => {
      try {
        const res = await privateApi.post("/api/hotels/hotels/prebook/", {
          BookingCode: room.BookingCode,
        });

        const data = res.data;

        if (data.success) {
          const preBookData = data.data;
          const preBookedRoom = preBookData?.raw?.HotelResult?.[0]?.Rooms?.[0];

          navigate("/hotel-booking", {
            state: {
              hotel,
              room: preBookedRoom,
              preBook: preBookData,
              checkIn,
              checkOut,
              guests,
            },
          });
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        const statusCode = err?.response?.status;
        const message = err?.response?.data?.message || err?.message || "";

        console.log("STATUS:", statusCode);
        console.log("MESSAGE:", message);

        // ✅ Proper auth detection
        if (
          statusCode === 400 ||
          message.toLowerCase().includes("auth") ||
          message.toLowerCase().includes("login") ||
          message.toLowerCase().includes("token")
        ) {
          navigate("/login", {
            state: {
              redirectTo: location.pathname,
              payload: { hotel, room, checkIn, checkOut, guests },
            },
          });
          return;
        }

        setError(message || "PreBook failed. Please try again.");
        setStatus("error");
      }
    };

    prebook();
  }, [
    room,
    hasRun,
    location.pathname,
    hotel,
    checkIn,
    checkOut,
    guests,
    navigate,
  ]);

  /* UI */
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0F] text-white px-4">
        <h2 className="text-xl font-semibold text-red-400 mb-3">
          ⚠️ Booking Failed
        </h2>

        <p className="text-gray-400 text-center mb-5">{error}</p>

        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0F] text-white px-4">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-6"></div>

      <h2 className="text-lg font-semibold text-yellow-300">
        Confirming your room...
      </h2>

      <p className="text-gray-400 text-sm mt-2 text-center">
        Please wait while we secure the best price for you
      </p>
    </div>
  );
};

export default PrebookLoader;
