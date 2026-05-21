"use client";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const PrebookLoader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    selectedHotel,
    selectedRoom,
    search,
    setPrebookData,
    setSelectedHotel,
    setSelectedRoom,
  } = useHotelStore();

  const state = location.state || {};
  const payload = state?.payload || state;

  const hotel = payload.hotel || selectedHotel;
  const room = payload.room || selectedRoom;
  const checkIn = payload.checkIn || search?.checkIn;
  const checkOut = payload.checkOut || search?.checkOut;
  const guests = payload.guests || search?.guests;

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (!hotel || !room?.BookingCode) {
      navigate("/hotels");
      return;
    }

    setSelectedHotel(hotel);
    setSelectedRoom(room);
  }, [hotel, room, navigate, setSelectedHotel, setSelectedRoom]);

  useEffect(() => {
    if (hasRun) return;
    if (!hotel || !room?.BookingCode) return;

    setHasRun(true);

    const prebook = async () => {
      try {
        const res = await privateApi.post("/api/hotels/hotels/prebook/", {
          BookingCode: room.BookingCode,
        });

        const data = res.data;

        if (data.success) {
          const preBookData = data.data;
          const preBookedRoom = preBookData?.raw?.HotelResult?.[0]?.Rooms?.[0];

          setPrebookData(preBookData);

          navigate("/hotel-booking", {
            state: {
              hotel,
              room: preBookedRoom || room,
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

        if (
          statusCode === 400 ||
          statusCode === 401 ||
          statusCode === 403 ||
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
    hasRun,
    hotel,
    room,
    checkIn,
    checkOut,
    guests,
    navigate,
    location.pathname,
    setPrebookData,
  ]);

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
