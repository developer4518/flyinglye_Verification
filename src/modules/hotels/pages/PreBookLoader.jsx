"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const getSafeValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
};

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const normalizeRoomGuests = (payload = {}, guests = {}, search = {}) => {
  const rawRoomGuests = Array.isArray(payload?.roomGuests)
    ? payload.roomGuests
    : Array.isArray(payload?.RoomGuests)
      ? payload.RoomGuests
      : Array.isArray(payload?.guests?.roomGuests)
        ? payload.guests.roomGuests
        : Array.isArray(guests?.roomGuests)
          ? guests.roomGuests
          : Array.isArray(search?.guests?.roomGuests)
            ? search.guests.roomGuests
            : [];

  return rawRoomGuests.map((room, index) => {
    const children = Number(room.Children ?? room.children ?? 0);

    const ages =
      room.ChildrenAges ||
      room.ChildAges ||
      room.childAges ||
      room.childrenAges ||
      [];

    const cleanAges = Array.isArray(ages)
      ? ages
          .slice(0, children)
          .map((age) => Number(age))
          .filter((age) => age >= 1 && age <= 12)
      : [];

    return {
      RoomIndex: room.RoomIndex ?? room.roomIndex ?? index + 1,
      roomIndex: room.roomIndex ?? room.RoomIndex ?? index + 1,

      Adults: Number(room.Adults ?? room.adults ?? 1),
      adults: Number(room.adults ?? room.Adults ?? 1),

      Children: children,
      children,

      ChildAges: cleanAges,
      ChildrenAges: cleanAges,
      childAges: cleanAges,
    };
  });
};

const buildPaxRooms = (roomGuests = []) => {
  return roomGuests.map((room) => ({
    Adults: Number(room.Adults ?? room.adults ?? 1),
    Children: Number(room.Children ?? room.children ?? 0),
    ChildrenAges: room.ChildrenAges || room.ChildAges || room.childAges || [],
  }));
};

const normalizeName = (name) => {
  if (Array.isArray(name)) return name[0] || "Standard Room";
  if (typeof name === "string" && name.trim()) return name.trim();
  return "Standard Room";
};

const extractHotelResult = (data) => {
  return (
    data?.raw?.HotelResult?.[0] ||
    data?.raw?.Response?.HotelResult?.[0] ||
    data?.data?.raw?.HotelResult?.[0] ||
    data?.data?.raw?.Response?.HotelResult?.[0] ||
    data?.HotelResult?.[0] ||
    data?.Response?.HotelResult?.[0] ||
    null
  );
};

const extractPrebookRoom = (data, fallbackRoom) => {
  const hotelResult = extractHotelResult(data);

  return (
    hotelResult?.Rooms?.[0] ||
    data?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    data?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    data?.data?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    data?.data?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    data?.HotelResult?.[0]?.Rooms?.[0] ||
    data?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    fallbackRoom ||
    null
  );
};

const normalizePrebookRoom = (prebookRoom = {}, fallbackRoom = {}) => {
  const rawRoom = prebookRoom?.room_raw || prebookRoom || {};
  const fallbackRawRoom = fallbackRoom?.room_raw || fallbackRoom || {};

  const bookingCode = getSafeValue(
    rawRoom?.BookingCode,
    rawRoom?.booking_code,
    fallbackRawRoom?.BookingCode,
    fallbackRawRoom?.booking_code,
  );

  const roomName = normalizeName(
    getSafeValue(
      rawRoom?.Name,
      rawRoom?.RoomTypeName,
      rawRoom?.room_name,
      fallbackRawRoom?.Name,
      fallbackRawRoom?.RoomTypeName,
      fallbackRawRoom?.room_name,
    ),
  );

  const price = Number(
    getSafeValue(
      rawRoom?.TotalFare,
      rawRoom?.Price?.PublishedPrice,
      rawRoom?.PublishedPrice,
      rawRoom?.price,
      fallbackRawRoom?.TotalFare,
      fallbackRawRoom?.Price?.PublishedPrice,
      fallbackRawRoom?.PublishedPrice,
      fallbackRawRoom?.price,
      0,
    ),
  );

  const tax = Number(
    getSafeValue(
      rawRoom?.TotalTax,
      rawRoom?.Price?.Tax,
      rawRoom?.Tax,
      rawRoom?.tax,
      fallbackRawRoom?.TotalTax,
      fallbackRawRoom?.Price?.Tax,
      fallbackRawRoom?.Tax,
      fallbackRawRoom?.tax,
      0,
    ),
  );

  const netAmount = Number(
    getSafeValue(
      rawRoom?.NetAmount,
      rawRoom?.net_amount,
      fallbackRawRoom?.NetAmount,
      fallbackRawRoom?.net_amount,
      price,
      0,
    ),
  );

  return {
    ...fallbackRoom,
    ...prebookRoom,

    room_raw: rawRoom,

    Name: roomName,
    room_name: roomName,
    RoomTypeName: roomName,

    BookingCode: bookingCode,
    booking_code: bookingCode,

    price,
    tax,
    TotalFare: price,
    TotalTax: tax,
    NetAmount: netAmount,

    meal: getSafeValue(
      rawRoom?.MealType,
      rawRoom?.MealPlan,
      rawRoom?.meal,
      fallbackRawRoom?.MealType,
      fallbackRawRoom?.MealPlan,
      fallbackRawRoom?.meal,
      "",
    ),
    MealType: getSafeValue(
      rawRoom?.MealType,
      rawRoom?.MealPlan,
      rawRoom?.meal,
      fallbackRawRoom?.MealType,
      fallbackRawRoom?.MealPlan,
      fallbackRawRoom?.meal,
      "",
    ),

    inclusion: getSafeValue(
      rawRoom?.Inclusion,
      rawRoom?.inclusion,
      fallbackRawRoom?.Inclusion,
      fallbackRawRoom?.inclusion,
      "",
    ),
    Inclusion: getSafeValue(
      rawRoom?.Inclusion,
      rawRoom?.inclusion,
      fallbackRawRoom?.Inclusion,
      fallbackRawRoom?.inclusion,
      "",
    ),

    refundable: getSafeValue(
      rawRoom?.IsRefundable,
      rawRoom?.refundable,
      fallbackRawRoom?.IsRefundable,
      fallbackRawRoom?.refundable,
      false,
    ),
    IsRefundable: getSafeValue(
      rawRoom?.IsRefundable,
      rawRoom?.refundable,
      fallbackRawRoom?.IsRefundable,
      fallbackRawRoom?.refundable,
      false,
    ),

    cancel_policies: getFirstArray(
      rawRoom?.CancelPolicies,
      rawRoom?.cancel_policies,
      fallbackRawRoom?.CancelPolicies,
      fallbackRawRoom?.cancel_policies,
    ),
    CancelPolicies: getFirstArray(
      rawRoom?.CancelPolicies,
      rawRoom?.cancel_policies,
      fallbackRawRoom?.CancelPolicies,
      fallbackRawRoom?.cancel_policies,
    ),

    rate_conditions: getFirstArray(
      rawRoom?.RateConditions,
      rawRoom?.rate_conditions,
      fallbackRawRoom?.RateConditions,
      fallbackRawRoom?.rate_conditions,
    ),
    RateConditions: getFirstArray(
      rawRoom?.RateConditions,
      rawRoom?.rate_conditions,
      fallbackRawRoom?.RateConditions,
      fallbackRawRoom?.rate_conditions,
    ),

    supplements: getFirstArray(
      rawRoom?.Supplements,
      rawRoom?.supplements,
      fallbackRawRoom?.Supplements,
      fallbackRawRoom?.supplements,
    ),
    Supplements: getFirstArray(
      rawRoom?.Supplements,
      rawRoom?.supplements,
      fallbackRawRoom?.Supplements,
      fallbackRawRoom?.supplements,
    ),

    amenities: getFirstArray(
      rawRoom?.Amenities,
      rawRoom?.amenities,
      fallbackRawRoom?.Amenities,
      fallbackRawRoom?.amenities,
    ),
    Amenities: getFirstArray(
      rawRoom?.Amenities,
      rawRoom?.amenities,
      fallbackRawRoom?.Amenities,
      fallbackRawRoom?.amenities,
    ),

    room_promotion: getFirstArray(
      rawRoom?.RoomPromotion,
      rawRoom?.room_promotion,
      fallbackRawRoom?.RoomPromotion,
      fallbackRawRoom?.room_promotion,
    ),
    RoomPromotion: getFirstArray(
      rawRoom?.RoomPromotion,
      rawRoom?.room_promotion,
      fallbackRawRoom?.RoomPromotion,
      fallbackRawRoom?.room_promotion,
    ),
  };
};

const buildPrebookPayload = ({
  room,
  hotel,
  checkIn,
  checkOut,
  guests,
  payload,
  search,
}) => {
  const bookingCode = getSafeValue(
    payload?.bookingCode,
    payload?.BookingCode,
    room?.booking_code,
    room?.BookingCode,
    room?.room_raw?.BookingCode,
  );

  const hotelCode = getSafeValue(
    hotel?.hotel_code,
    hotel?.HotelCode,
    hotel?.code,
    payload?.hotelCode,
    payload?.HotelCode,
  );

  const normalizedRoomGuests = normalizeRoomGuests(payload, guests, search);
  const normalizedChildAges = normalizedRoomGuests.flatMap(
    (room) => room.ChildrenAges,
  );
  const paxRooms = buildPaxRooms(normalizedRoomGuests);

  const safeGuests = {
    ...(guests || {}),
    adults:
      Number(guests?.adults) ||
      paxRooms.reduce((sum, room) => sum + Number(room.Adults || 0), 0) ||
      1,
    children:
      Number(guests?.children) ||
      paxRooms.reduce((sum, room) => sum + Number(room.Children || 0), 0) ||
      0,
    rooms: Number(guests?.rooms) || paxRooms.length || 1,
    childAges: normalizedChildAges,
    roomGuests: normalizedRoomGuests,
    PaxRooms: paxRooms,
  };

  return {
    BookingCode: bookingCode,
    HotelCode: hotelCode,
    CheckIn: checkIn,
    CheckOut: checkOut,

    GuestNationality:
      payload?.guestNationality ||
      payload?.GuestNationality ||
      guests?.nationality ||
      search?.nationality ||
      "IN",

    Guests: safeGuests,

    ChildAges: normalizedChildAges,
    ChildrenAges: normalizedChildAges,

    RoomGuests: normalizedRoomGuests,
    PaxRooms: paxRooms,

    Rooms: safeGuests.rooms,
    Adults: safeGuests.adults,
    Children: safeGuests.children,
  };
};

const PrebookLoader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRunRef = useRef(false);

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

  const bookingCode = getSafeValue(
    payload?.bookingCode,
    payload?.BookingCode,
    room?.booking_code,
    room?.BookingCode,
    room?.room_raw?.BookingCode,
  );

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const prebookPayload = useMemo(() => {
    return buildPrebookPayload({
      room,
      hotel,
      checkIn,
      checkOut,
      guests,
      payload,
      search,
    });
  }, [room, hotel, checkIn, checkOut, guests, payload, search]);

  useEffect(() => {
    if (!hotel || !bookingCode) {
      navigate("/hotels", { replace: true });
      return;
    }

    setSelectedHotel(hotel);

    const roomWithBookingCode = {
      ...room,
      BookingCode: bookingCode,
      booking_code: bookingCode,
    };

    setSelectedRoom(roomWithBookingCode);
  }, [hotel, room, bookingCode, navigate, setSelectedHotel, setSelectedRoom]);

  useEffect(() => {
    if (hasRunRef.current) return;
    if (!hotel || !bookingCode) return;

    hasRunRef.current = true;

    const prebook = async () => {
      const startedAt = performance.now();

      try {
        setStatus("loading");
        setError("");

        console.log("HOTEL PREBOOK PAYLOAD:", prebookPayload);
        console.log(
          "PREBOOK ROOM GUESTS:",
          JSON.stringify(prebookPayload.RoomGuests, null, 2),
        );
        console.log(
          "PREBOOK PAX ROOMS:",
          JSON.stringify(prebookPayload.PaxRooms, null, 2),
        );
        console.log(
          "PREBOOK CHILD AGES:",
          JSON.stringify(prebookPayload.ChildAges, null, 2),
        );
        const res = await privateApi.post(
          "/api/hotels/hotels/prebook/",
          prebookPayload,
        );

        const responseTimeMs = Math.round(performance.now() - startedAt);
        const data = res.data;

        console.log("HOTEL PREBOOK RESPONSE TIME:", responseTimeMs, "ms");
        console.log("HOTEL PREBOOK RESPONSE:", data);

        if (!data?.success) {
          throw new Error(data?.message || "PreBook failed");
        }

        const apiPrebookData = data?.data || data;
        const normalizedRoomGuests = prebookPayload.RoomGuests || [];
        const normalizedChildAges = prebookPayload.ChildAges || [];
        const paxRooms = prebookPayload.PaxRooms || [];
        const safeGuests = prebookPayload.Guests || guests || {};

        const hotelResult = extractHotelResult(apiPrebookData);
        const apiRoom = extractPrebookRoom(apiPrebookData, room);
        const normalizedRoom = normalizePrebookRoom(apiRoom, room);

        const finalPrebookData = {
          ...apiPrebookData,

          responseTimeMs,

          hotelResult,
          room: normalizedRoom,

          booking_code: normalizedRoom?.BookingCode || bookingCode,
          BookingCode: normalizedRoom?.BookingCode || bookingCode,

          net_amount: Number(
            getSafeValue(
              apiPrebookData?.net_amount,
              apiPrebookData?.NetAmount,
              normalizedRoom?.NetAmount,
              normalizedRoom?.TotalFare,
              0,
            ),
          ),
          NetAmount: Number(
            getSafeValue(
              apiPrebookData?.NetAmount,
              apiPrebookData?.net_amount,
              normalizedRoom?.NetAmount,
              normalizedRoom?.TotalFare,
              0,
            ),
          ),

          total_amount: Number(
            getSafeValue(
              apiPrebookData?.total_amount,
              apiPrebookData?.TotalAmount,
              normalizedRoom?.TotalFare,
              normalizedRoom?.NetAmount,
              0,
            ),
          ),

          convenience_fee: Number(
            getSafeValue(
              apiPrebookData?.convenience_fee,
              apiPrebookData?.convenienceFee,
              apiPrebookData?.ConvenienceFee,
              0,
            ),
          ),

          // Sheet required display fields
          roomPromotion: normalizedRoom?.RoomPromotion || [],
          supplements: normalizedRoom?.Supplements || [],
          inclusions: normalizedRoom?.Inclusion || "",
          mealType: normalizedRoom?.MealType || "",
          cancellationPolicies: normalizedRoom?.CancelPolicies || [],
          rateConditions: normalizedRoom?.RateConditions || [],
          amenities: normalizedRoom?.Amenities || [],

          // Preserve current search/guest data for booking page
          checkIn,
          checkOut,
          guests: safeGuests,
          childAges: normalizedChildAges,
          roomGuests: normalizedRoomGuests,
          PaxRooms: paxRooms,

          isDomesticHotel: payload?.isDomesticHotel,
          isInternationalHotel: payload?.isInternationalHotel,
          hotelType: payload?.hotelType,
        };

        setPrebookData(finalPrebookData);
        setSelectedRoom(normalizedRoom);

        navigate("/hotel-booking", {
          replace: true,
          state: {
            hotel,
            room: normalizedRoom,
            preBook: finalPrebookData,
            checkIn,
            checkOut,
            guests: safeGuests,

            bookingCode: normalizedRoom?.BookingCode || bookingCode,

            // Sheet required fields passed clearly to booking/details UI
            roomPromotion: normalizedRoom?.RoomPromotion || [],
            supplements: normalizedRoom?.Supplements || [],
            inclusions: normalizedRoom?.Inclusion || "",
            mealType: normalizedRoom?.MealType || "",
            cancellationPolicies: normalizedRoom?.CancelPolicies || [],
            rateConditions: normalizedRoom?.RateConditions || [],
            amenities: normalizedRoom?.Amenities || [],

            childAges: normalizedChildAges,
            roomGuests: normalizedRoomGuests,
            PaxRooms: paxRooms,

            isDomesticHotel: payload?.isDomesticHotel,
            isInternationalHotel: payload?.isInternationalHotel,
            hotelType: payload?.hotelType,
          },
        });
      } catch (err) {
        const statusCode = err?.response?.status;
        const apiData = err?.response?.data;

        const message =
          apiData?.message ||
          apiData?.error ||
          apiData?.data?.Error?.ErrorMessage ||
          apiData?.data?.Response?.Error?.ErrorMessage ||
          err?.message ||
          "PreBook failed. Please try again.";

        console.log("PREBOOK ERROR STATUS:", statusCode);
        console.log("PREBOOK ERROR:", apiData || err);

        const lowerMessage = String(message).toLowerCase();

        if (
          statusCode === 401 ||
          statusCode === 403 ||
          lowerMessage.includes("auth") ||
          lowerMessage.includes("login") ||
          lowerMessage.includes("token")
        ) {
          navigate("/login", {
            replace: true,
            state: {
              redirectTo: "/prebook",
              payload: {
                hotel,
                room,
                checkIn,
                checkOut,

                guests: prebookPayload.Guests || guests || {},
                bookingCode,

                childAges: prebookPayload.ChildAges || [],
                roomGuests: prebookPayload.RoomGuests || [],
                PaxRooms: prebookPayload.PaxRooms || [],

                isDomesticHotel: payload?.isDomesticHotel,
                isInternationalHotel: payload?.isInternationalHotel,
                hotelType: payload?.hotelType,
              },
            },
          });
          return;
        }

        setError(message);
        setStatus("error");
      }
    };

    prebook();
  }, [
    hotel,
    room,
    bookingCode,
    checkIn,
    checkOut,
    guests,
    payload,
    search,
    prebookPayload,
    navigate,
    setPrebookData,
    setSelectedRoom,
  ]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0F] text-white px-4">
        <div className="max-w-md w-full bg-[#15151C] border border-red-500/30 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-3">
            ⚠️ PreBooking Failed
          </h2>

          <p className="text-gray-400 text-sm text-center mb-5">{error}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full px-5 py-3 bg-yellow-400 text-black rounded-xl font-semibold"
            >
              Go Back
            </button>

            <button
              onClick={() => navigate("/hotels")}
              className="w-full px-5 py-3 bg-white/10 text-white rounded-xl font-semibold border border-white/10"
            >
              Search Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0F] text-white px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 border-4 border-yellow-400/30 rounded-full"></div>
        <div className="absolute inset-0 w-20 h-20 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <h2 className="text-xl font-semibold text-yellow-300">
        Confirming your room...
      </h2>

      <p className="text-gray-400 text-sm mt-2 text-center max-w-sm">
        Please wait while we verify price, cancellation policy, inclusions, meal
        type, supplements and room availability.
      </p>

      {/* {bookingCode && (
        <p className="text-gray-600 text-xs mt-4 text-center break-all max-w-md">
          BookingCode: {bookingCode}
        </p>
      )} */}
    </div>
  );
};

export default PrebookLoader;
