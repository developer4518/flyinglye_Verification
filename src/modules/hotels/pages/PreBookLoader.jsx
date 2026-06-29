"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const getSafeValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "n/a",
  );
};

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value) && value.length > 0) || [];
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const extractTboErrorMessage = (
  data,
  fallback = "PreBook failed. Please try again.",
) => {
  return (
    data?.raw?.Response?.Error?.ErrorMessage ||
    data?.raw?.Error?.ErrorMessage ||
    data?.raw?.Status?.Description ||
    data?.data?.raw?.Response?.Error?.ErrorMessage ||
    data?.data?.raw?.Error?.ErrorMessage ||
    data?.data?.raw?.Status?.Description ||
    data?.data?.Response?.Error?.ErrorMessage ||
    data?.data?.Error?.ErrorMessage ||
    data?.data?.message ||
    data?.data?.error ||
    data?.Response?.Error?.ErrorMessage ||
    data?.Error?.ErrorMessage ||
    data?.error?.ErrorMessage ||
    data?.message ||
    data?.error ||
    data?.detail ||
    fallback
  );
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

  if (rawRoomGuests.length > 0) {
    return rawRoomGuests.map((room, index) => {
      const children = toNumber(room.Children ?? room.children, 0);

      const rawAges =
        room.ChildrenAges ||
        room.ChildAges ||
        room.childAges ||
        room.childrenAges ||
        [];

      const cleanAges = Array.isArray(rawAges)
        ? rawAges
            .slice(0, children)
            .map((age) => Number(age))
            .filter((age) => age >= 1 && age <= 12)
        : [];

      return {
        RoomIndex: toNumber(room.RoomIndex ?? room.roomIndex, index + 1),
        roomIndex: toNumber(room.roomIndex ?? room.RoomIndex, index + 1),

        Adults: toNumber(room.Adults ?? room.adults, 1),
        adults: toNumber(room.adults ?? room.Adults, 1),

        Children: children,
        children,

        ChildAges: cleanAges,
        ChildrenAges: cleanAges,
        childAges: cleanAges,
      };
    });
  }

  const children = toNumber(guests?.children ?? search?.guests?.children, 0);

  const rawAges =
    guests?.childAges ||
    guests?.ChildrenAges ||
    guests?.ChildAges ||
    search?.guests?.childAges ||
    [];

  const cleanAges = Array.isArray(rawAges)
    ? rawAges
        .slice(0, children)
        .map((age) => Number(age))
        .filter((age) => age >= 1 && age <= 12)
    : [];

  return [
    {
      RoomIndex: 1,
      roomIndex: 1,
      Adults: toNumber(guests?.adults ?? search?.guests?.adults, 1),
      adults: toNumber(guests?.adults ?? search?.guests?.adults, 1),
      Children: children,
      children,
      ChildAges: cleanAges,
      ChildrenAges: cleanAges,
      childAges: cleanAges,
    },
  ];
};

const buildPaxRooms = (roomGuests = []) => {
  return roomGuests.map((room) => ({
    Adults: toNumber(room.Adults ?? room.adults, 1),
    Children: toNumber(room.Children ?? room.children, 0),
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
    data?.room_raw ||
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

  const price = toNumber(
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
    0,
  );

  const tax = toNumber(
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
    0,
  );

  const netAmount = toNumber(
    getSafeValue(
      rawRoom?.NetAmount,
      rawRoom?.net_amount,
      fallbackRawRoom?.NetAmount,
      fallbackRawRoom?.net_amount,
      price,
      0,
    ),
    0,
  );

  const meal = getSafeValue(
    rawRoom?.MealType,
    rawRoom?.MealPlan,
    rawRoom?.meal,
    fallbackRawRoom?.MealType,
    fallbackRawRoom?.MealPlan,
    fallbackRawRoom?.meal,
    "",
  );

  const inclusion = getSafeValue(
    rawRoom?.Inclusion,
    rawRoom?.inclusion,
    fallbackRawRoom?.Inclusion,
    fallbackRawRoom?.inclusion,
    "",
  );

  const refundable = getSafeValue(
    rawRoom?.IsRefundable,
    rawRoom?.refundable,
    fallbackRawRoom?.IsRefundable,
    fallbackRawRoom?.refundable,
    false,
  );

  const cancelPolicies = getFirstArray(
    rawRoom?.CancelPolicies,
    rawRoom?.cancel_policies,
    fallbackRawRoom?.CancelPolicies,
    fallbackRawRoom?.cancel_policies,
  );

  const rateConditions = getFirstArray(
    rawRoom?.RateConditions,
    rawRoom?.rate_conditions,
    fallbackRawRoom?.RateConditions,
    fallbackRawRoom?.rate_conditions,
  );

  const supplements = getFirstArray(
    rawRoom?.Supplements,
    rawRoom?.supplements,
    fallbackRawRoom?.Supplements,
    fallbackRawRoom?.supplements,
  );

  const amenities = getFirstArray(
    rawRoom?.Amenities,
    rawRoom?.amenities,
    fallbackRawRoom?.Amenities,
    fallbackRawRoom?.amenities,
  );

  const roomPromotion = getFirstArray(
    rawRoom?.RoomPromotion,
    rawRoom?.room_promotion,
    fallbackRawRoom?.RoomPromotion,
    fallbackRawRoom?.room_promotion,
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

    meal,
    MealType: meal,

    inclusion,
    Inclusion: inclusion,

    refundable,
    IsRefundable: refundable,

    cancel_policies: cancelPolicies,
    CancelPolicies: cancelPolicies,

    rate_conditions: rateConditions,
    RateConditions: rateConditions,

    supplements,
    Supplements: supplements,

    amenities,
    Amenities: amenities,

    room_promotion: roomPromotion,
    RoomPromotion: roomPromotion,
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
  const paxRooms = buildPaxRooms(normalizedRoomGuests);

  const childAges = paxRooms.flatMap((room) => room.ChildrenAges || []);

  const totalAdults =
    paxRooms.reduce((sum, room) => sum + toNumber(room.Adults, 0), 0) || 1;

  const totalChildren = paxRooms.reduce(
    (sum, room) => sum + toNumber(room.Children, 0),
    0,
  );

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
      search?.guestNationality ||
      "IN",

    PaxRooms: paxRooms,

    Rooms: paxRooms.length || 1,
    Adults: totalAdults,
    Children: totalChildren,
    ChildAges: childAges,
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
  const payload = state?.payload || state || {};

  const hotel = payload.hotel || selectedHotel;
  const room = payload.room || selectedRoom;
  const checkIn = payload.checkIn || search?.checkIn;
  const checkOut = payload.checkOut || search?.checkOut;
  const guests = payload.guests || search?.guests || {};

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

    setSelectedRoom({
      ...room,
      BookingCode: bookingCode,
      booking_code: bookingCode,
    });
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

        const missingFields = [];

        if (!prebookPayload.BookingCode) missingFields.push("BookingCode");
        if (!prebookPayload.HotelCode) missingFields.push("HotelCode");
        if (!prebookPayload.CheckIn) missingFields.push("CheckIn");
        if (!prebookPayload.CheckOut) missingFields.push("CheckOut");

        const totalChildren = toNumber(prebookPayload.Children, 0);
        const childAgeCount = prebookPayload.ChildAges?.length || 0;

        if (totalChildren > 0 && childAgeCount !== totalChildren) {
          missingFields.push("Correct Child Ages");
        }

        if (missingFields.length > 0) {
          throw new Error(
            `Missing required prebook data: ${missingFields.join(", ")}`,
          );
        }

        console.log("HOTEL PREBOOK PAYLOAD:", prebookPayload);
        console.log(
          "PREBOOK PAX ROOMS:",
          JSON.stringify(prebookPayload.PaxRooms, null, 2),
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
          throw new Error(extractTboErrorMessage(data, "TBO PreBook failed"));
        }

        const apiPrebookData = data?.data || data;

        const normalizedRoomGuests = normalizeRoomGuests(
          payload,
          guests,
          search,
        );

        const paxRooms = prebookPayload.PaxRooms || [];
        const normalizedChildAges = prebookPayload.ChildAges || [];

        const safeGuests = {
          ...(guests || {}),
          adults: prebookPayload.Adults || 1,
          children: prebookPayload.Children || 0,
          rooms: prebookPayload.Rooms || paxRooms.length || 1,
          childAges: normalizedChildAges,
          roomGuests: normalizedRoomGuests,
          PaxRooms: paxRooms,
        };

        const hotelResult = extractHotelResult(apiPrebookData);
        const apiRoom = extractPrebookRoom(apiPrebookData, room);
        const normalizedRoom = normalizePrebookRoom(apiRoom, room);

        const finalTotalFare = toNumber(
          getSafeValue(
            normalizedRoom?.TotalFare,
            normalizedRoom?.room_raw?.TotalFare,
            apiPrebookData?.room_raw?.TotalFare,
            apiPrebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.TotalFare,
            apiPrebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]
              ?.TotalFare,
            room?.TotalFare,
            room?.room_raw?.TotalFare,
            0,
          ),
          0,
        );

        const finalNetAmount = toNumber(
          getSafeValue(
            apiPrebookData?.net_amount,
            apiPrebookData?.NetAmount,
            normalizedRoom?.NetAmount,
            normalizedRoom?.room_raw?.NetAmount,
            apiPrebookData?.room_raw?.NetAmount,
            apiPrebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.NetAmount,
            apiPrebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]
              ?.NetAmount,
            0,
          ),
          0,
        );

        const normalizedRoomWithFare = {
          ...normalizedRoom,
          TotalFare: finalTotalFare,
          totalFare: finalTotalFare,
          displayFare: finalTotalFare,
          NetAmount: finalNetAmount,
          net_amount: finalNetAmount,
        };

        const apiRateConditions = getFirstArray(
          apiPrebookData?.rate_conditions,
          apiPrebookData?.rateConditions,
          apiPrebookData?.RateConditions,
          apiPrebookData?.raw?.HotelResult?.[0]?.RateConditions,
          apiPrebookData?.raw?.Response?.HotelResult?.[0]?.RateConditions,
          hotelResult?.RateConditions,
          normalizedRoom?.RateConditions,
        );

        const apiValidation =
          apiPrebookData?.validation ||
          apiPrebookData?.ValidationInfo ||
          apiPrebookData?.raw?.ValidationInfo ||
          apiPrebookData?.raw?.Response?.ValidationInfo ||
          {};

        const finalBookingCode =
          normalizedRoom?.BookingCode ||
          apiPrebookData?.booking_code ||
          apiPrebookData?.BookingCode ||
          bookingCode;

        const finalRoomPromotions = getFirstArray(
          apiPrebookData?.room_promotions,
          apiPrebookData?.roomPromotion,
          normalizedRoom?.RoomPromotion,
        );

        const finalSupplements = getFirstArray(
          apiPrebookData?.supplements,
          normalizedRoom?.Supplements,
        );

        const finalCancellationPolicies = getFirstArray(
          apiPrebookData?.cancellation_policies,
          normalizedRoom?.CancelPolicies,
        );

        const finalAmenities = getFirstArray(
          apiPrebookData?.amenities,
          normalizedRoom?.Amenities,
        );

        const finalInclusions = getSafeValue(
          apiPrebookData?.inclusions,
          normalizedRoom?.Inclusion,
          "",
        );

        const finalMealType = getSafeValue(
          apiPrebookData?.meal_type,
          apiPrebookData?.mealType,
          normalizedRoom?.MealType,
          "",
        );

        const finalPrebookData = {
          ...apiPrebookData,

          responseTimeMs,

          hotelResult,
          room: normalizedRoomWithFare,

          booking_code: finalBookingCode,
          BookingCode: finalBookingCode,

          TotalFare: finalTotalFare,
          totalFare: finalTotalFare,
          displayFare: finalTotalFare,

          net_amount: finalNetAmount,
          NetAmount: finalNetAmount,

          // Important: do not pass backend total_amount for customer display
          total_amount: finalTotalFare,

          convenience_fee: toNumber(
            getSafeValue(
              apiPrebookData?.convenience_fee,
              apiPrebookData?.convenienceFee,
              apiPrebookData?.ConvenienceFee,
              0,
            ),
            0,
          ),

          roomPromotion: finalRoomPromotions,
          room_promotions: finalRoomPromotions,

          supplements: finalSupplements,

          inclusions: finalInclusions,
          Inclusion: finalInclusions,

          mealType: finalMealType,
          meal_type: finalMealType,

          cancellationPolicies: finalCancellationPolicies,
          cancellation_policies: finalCancellationPolicies,

          rateConditions: apiRateConditions,
          RateConditions: apiRateConditions,
          rate_conditions: apiRateConditions,

          amenities: finalAmenities,

          validation: apiValidation,
          ValidationInfo: apiValidation,

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
        setSelectedRoom(normalizedRoomWithFare);

        navigate("/hotel-booking", {
          replace: true,
          state: {
            hotel,
            room: normalizedRoomWithFare,
            preBook: finalPrebookData,
            checkIn,
            checkOut,
            guests: safeGuests,

            bookingCode: finalBookingCode,

            TotalFare: finalTotalFare,
            totalFare: finalTotalFare,
            displayFare: finalTotalFare,
            net_amount: finalNetAmount,
            NetAmount: finalNetAmount,

            roomPromotion: finalRoomPromotions,
            room_promotions: finalRoomPromotions,

            supplements: finalSupplements,

            inclusions: finalInclusions,
            Inclusion: finalInclusions,

            mealType: finalMealType,
            meal_type: finalMealType,

            cancellationPolicies: finalCancellationPolicies,
            cancellation_policies: finalCancellationPolicies,

            rateConditions: apiRateConditions,
            RateConditions: apiRateConditions,
            rate_conditions: apiRateConditions,

            amenities: finalAmenities,

            validation: apiValidation,
            ValidationInfo: apiValidation,

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

        console.log("FULL AXIOS ERROR:", err);
        console.log("BACKEND ERROR RESPONSE:", err?.response);
        console.log("BACKEND ERROR DATA:", apiData);
        console.log("PREBOOK ERROR STATUS:", statusCode);

        const message =
          extractTboErrorMessage(apiData, "") ||
          "TBO PreBook failed. Please check selected room availability.";

        console.log("PREBOOK ERROR MESSAGE:", message);

        const lowerMessage = String(message).toLowerCase();

        if (
          statusCode === 401 ||
          statusCode === 403 ||
          lowerMessage.includes("auth") ||
          lowerMessage.includes("login") ||
          lowerMessage.includes("token") ||
          lowerMessage.includes("session")
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

                guests: {
                  ...(guests || {}),
                  adults: prebookPayload.Adults || 1,
                  children: prebookPayload.Children || 0,
                  rooms: prebookPayload.Rooms || 1,
                  childAges: prebookPayload.ChildAges || [],
                  PaxRooms: prebookPayload.PaxRooms || [],
                },

                bookingCode,

                childAges: prebookPayload.ChildAges || [],
                roomGuests: normalizeRoomGuests(payload, guests, search),
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
    </div>
  );
};

export default PrebookLoader;
