"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { sendHotelChangeRequest } from "../../../services/sendHotelChangeRequest";

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const flatArray = (value) => toArray(value).flat(Infinity).filter(Boolean);

const splitTextList = (value, separator = ",") => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (!item) return [];

        if (typeof item === "string") {
          return item
            .split(separator)
            .map((text) => text.trim())
            .filter(Boolean);
        }

        return [item];
      })
      .filter(Boolean);
  }

  return String(value)
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseDateValue = (dateValue) => {
  if (!dateValue) return null;

  const value = String(dateValue).trim();
  const datePart = value.split(" ")[0];
  const parts = datePart.split("-");

  let date;

  if (parts.length === 3) {
    const [a, b, c] = parts;

    if (a.length === 4) {
      date = new Date(Number(a), Number(b) - 1, Number(c));
    } else if (c.length === 4) {
      date = new Date(Number(c), Number(b) - 1, Number(a));
    }
  }

  if (!date) date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (dateValue) => {
  const date = parseDateValue(dateValue);

  if (!date) return dateValue || "N/A";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value || 0);

  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === "INR") {
    return `₹ ${formattedAmount}`;
  }

  return `${currency} ${formattedAmount}`;
};

const getNights = (checkIn, checkOut) => {
  const inDate = parseDateValue(checkIn);
  const outDate = parseDateValue(checkOut);

  if (!inDate || !outDate) return 1;

  const diff = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

const cleanHtml = (value) => {
  return String(value || "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll(",", ", ");
};

const getStatusClass = (status = "") => {
  const value = String(status).toLowerCase();

  if (
    value.includes("confirm") ||
    value.includes("voucher") ||
    value.includes("success")
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (
    value.includes("cancel") ||
    value.includes("reject") ||
    value.includes("failed")
  ) {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  if (value.includes("pending") || value.includes("hold")) {
    return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
  }

  return "border-slate-400/30 bg-slate-400/10 text-slate-300";
};

const getRoomData = (saved, bookingData) => {
  return (
    saved?.roomData ||
    saved?.reviewBookingData?.roomData ||
    saved?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.room ||
    saved?.selectedRoom ||
    saved?.room ||
    bookingData?.HotelRoomsDetails?.[0] ||
    {}
  );
};

const getHotelResult = (saved) => {
  return (
    saved?.hotelResult ||
    saved?.reviewBookingData?.hotelResult ||
    saved?.prebookData?.raw?.HotelResult?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0] ||
    saved?.hotel?.hotel_raw ||
    saved?.hotel?.rawHotel ||
    {}
  );
};

const getRoomName = (room, fallbackRoomData, index) => {
  const name =
    room?.room_name ||
    room?.RoomTypeName ||
    room?.RoomName ||
    room?.RoomType ||
    room?.Name?.[0] ||
    room?.Name ||
    fallbackRoomData?.room_name ||
    fallbackRoomData?.Name?.[0] ||
    fallbackRoomData?.RoomName ||
    fallbackRoomData?.RoomTypeName ||
    fallbackRoomData?.RoomType ||
    fallbackRoomData?.Name ||
    `Room ${index + 1}`;

  return Array.isArray(name) ? name[0] : name;
};

const getRoomInclusion = (room, fallbackRoomData) => {
  return (
    room?.Inclusion ||
    room?.MealType ||
    room?.MealPlan ||
    fallbackRoomData?.Inclusion ||
    fallbackRoomData?.MealType ||
    fallbackRoomData?.MealPlan ||
    "N/A"
  );
};

const getCancellationChargeText = (policy, currency = "INR") => {
  const type = String(
    policy?.ChargeType || policy?.chargeType || "",
  ).toLowerCase();

  const charge = Number(policy?.CancellationCharge ?? policy?.Charge ?? 0);

  if (type === "percentage") return `${charge}%`;

  if (type === "fixed") {
    if (charge === 0) return "Free";
    return formatMoney(charge, currency);
  }

  if (charge === 0) return "Free";
  return charge ? formatMoney(charge, currency) : "N/A";
};

const getPaxTypeLabel = (guest) => {
  const title = String(guest?.Title || "").toLowerCase();

  if (
    Number(guest?.PaxType) === 2 ||
    title.includes("mstr") ||
    title.includes("miss") ||
    (guest?.Age && Number(guest.Age) < 12)
  ) {
    return "Child";
  }

  return "Adult";
};

const getGuestName = (guest) => {
  const title = guest?.Title ? `${guest.Title}. ` : "";
  const firstName = guest?.FirstName || guest?.firstName || "";
  const lastName = guest?.LastName || guest?.lastName || "";

  const fullName = `${title}${firstName} ${lastName}`.trim();
  return fullName || "Guest Name N/A";
};

const normalizeGuestsByRoom = (
  guestDetails = [],
  booking = {},
  savedData = {},
) => {
  const finalPayloadRooms =
    savedData?.finalPayload?.HotelRoomsDetails ||
    savedData?.reviewBookingData?.finalPayload?.HotelRoomsDetails ||
    booking?.HotelRoomsDetails ||
    [];

  if (Array.isArray(finalPayloadRooms) && finalPayloadRooms.length > 0) {
    return finalPayloadRooms.map((room, index) => ({
      roomIndex: index,
      guests: room?.HotelPassenger || room?.HotelPassengers || [],
    }));
  }

  const grouped = {};

  guestDetails.forEach((guest, index) => {
    const roomIndex = Number(guest?.RoomIndex ?? guest?.RoomNo ?? 0);

    if (!grouped[roomIndex]) grouped[roomIndex] = [];

    grouped[roomIndex].push({
      ...guest,
      _originalIndex: index,
    });
  });

  const entries = Object.entries(grouped);

  if (entries.length > 0) {
    return entries.map(([roomIndex, guests]) => ({
      roomIndex: Number(roomIndex),
      guests,
    }));
  }

  return [
    {
      roomIndex: 0,
      guests: guestDetails || [],
    },
  ];
};

const normalizeRooms = (booking = {}, savedData = {}, roomData = {}) => {
  const bookingRooms = booking?.HotelRoomsDetails || [];

  const finalPayloadRooms =
    savedData?.finalPayload?.HotelRoomsDetails ||
    savedData?.reviewBookingData?.finalPayload?.HotelRoomsDetails ||
    [];

  const paxRooms =
    savedData?.finalPayload?.PaxRooms ||
    savedData?.reviewBookingData?.finalPayload?.PaxRooms ||
    [];

  const sourceRooms =
    Array.isArray(bookingRooms) && bookingRooms.length > 0
      ? bookingRooms
      : Array.isArray(finalPayloadRooms) && finalPayloadRooms.length > 0
        ? finalPayloadRooms
        : [];

  if (sourceRooms.length > 0) {
    return sourceRooms.map((room, index) => ({
      ...room,
      _roomIndex: index,
      _paxRoom: paxRooms?.[index] || {},
    }));
  }

  return [
    {
      ...roomData,
      _roomIndex: 0,
      _paxRoom: paxRooms?.[0] || {},
    },
  ];
};

const getSupplementText = (item, currency = "INR") => {
  if (typeof item === "string") return item;

  const title =
    item?.Description ||
    item?.Name ||
    item?.SupplementDescription ||
    item?.SupplementName ||
    item?.Type ||
    item?.ChargeType ||
    "Supplement";

  const amount =
    item?.Price ||
    item?.Amount ||
    item?.Charge ||
    item?.SupplementPrice ||
    item?.SupplementCharge;

  if (amount !== undefined && amount !== null && amount !== "") {
    return `${title} - ${formatMoney(amount, item?.Currency || currency)}`;
  }

  return title;
};

const getPromotionText = (promotion) => {
  if (typeof promotion === "string") return promotion;

  return (
    promotion?.Description ||
    promotion?.Name ||
    promotion?.PromotionName ||
    "Promotion available"
  );
};

const getFacilityText = (facility) => {
  if (typeof facility === "string") return facility;

  return (
    facility?.Name ||
    facility?.Description ||
    facility?.FacilityName ||
    facility?.Facility ||
    "Facility"
  );
};

const pickFirst = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "n/a",
  );
};

const HotelBookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState(null);
  const [changeError, setChangeError] = useState(null);

  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [guestDetails, setGuestDetails] = useState([]);
  const [savedData, setSavedData] = useState({});

  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    try {
      const bookingSaved = safeJsonParse(
        localStorage.getItem("hotelBookingData"),
        {},
      );

      const reviewSaved = safeJsonParse(
        localStorage.getItem("reviewBookingData"),
        {},
      );

      const stateSaved = location.state?.savedData || {};

      const mergedSaved = {
        ...reviewSaved,
        ...bookingSaved,
        ...stateSaved,
        reviewBookingData: reviewSaved,
      };

      const bookingData =
        location.state?.booking ||
        location.state?.bookingResponse ||
        location.state?.fullResponse ||
        location.state?.data ||
        stateSaved?.bookingResponse ||
        bookingSaved?.bookingResponse ||
        reviewSaved?.bookingResponse;

      if (!bookingData) throw new Error("No booking data");

      const finalBooking =
        bookingData?.data ||
        bookingData?.Data ||
        bookingData?.Response ||
        bookingData;

      const finalHotel =
        stateSaved?.hotel ||
        bookingSaved?.hotel ||
        reviewSaved?.hotel ||
        mergedSaved?.hotel ||
        finalBooking?.HotelDetails ||
        finalBooking?.HotelDetail ||
        finalBooking?.Hotel ||
        {};

      const finalGuests =
        stateSaved?.guestList ||
        bookingSaved?.guestList ||
        reviewSaved?.guestList ||
        mergedSaved?.guestList ||
        reviewSaved?.finalPayload?.HotelRoomsDetails?.flatMap(
          (room) => room?.HotelPassenger || [],
        ) ||
        bookingSaved?.finalPayload?.HotelRoomsDetails?.flatMap(
          (room) => room?.HotelPassenger || [],
        ) ||
        finalBooking?.HotelPassenger ||
        finalBooking?.HotelPassengers ||
        finalBooking?.HotelRoomsDetails?.flatMap(
          (room) => room?.HotelPassenger || room?.HotelPassengers || [],
        ) ||
        [];

      setBooking(finalBooking);
      setSavedData(mergedSaved);
      setHotel(finalHotel);
      setGuestDetails(finalGuests);

      console.log("SUCCESS PAGE SAVED DATA:", mergedSaved);
      console.log("SUCCESS PAGE HOTEL:", finalHotel);
      console.log("SUCCESS PAGE BOOKING:", finalBooking);
      console.log("SUCCESS PAGE HOTEL ADDRESS:", mergedSaved?.hotelAddress);
    } catch (err) {
      console.error("BOOKING LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const hotelResult = useMemo(() => getHotelResult(savedData), [savedData]);

  const rooms = useMemo(
    () => normalizeRooms(booking, savedData, roomData),
    [booking, savedData, roomData],
  );

  const guestsByRoom = useMemo(
    () => normalizeGuestsByRoom(guestDetails, booking, savedData),
    [guestDetails, booking, savedData],
  );

  const checkIn =
    savedData?.checkIn ||
    booking?.CheckInDate ||
    booking?.HotelCheckIn ||
    booking?.CheckIn;

  const checkOut =
    savedData?.checkOut ||
    booking?.CheckOutDate ||
    booking?.HotelCheckOut ||
    booking?.CheckOut;

  const nights = getNights(checkIn, checkOut);

  const status =
    booking?.HotelBookingStatus ||
    booking?.BookingStatus ||
    booking?.StatusDescription ||
    booking?.VoucherStatusText ||
    (booking?.VoucherStatus ? "Vouchered" : "Confirmed");

  const confirmationNo =
    booking?.ConfirmationNo ||
    booking?.ConfirmationNumber ||
    booking?.SupplierConfirmationNo ||
    "N/A";

  const bookingId = booking?.BookingId || booking?.BookingID || "N/A";

  const invoiceNumber = booking?.InvoiceNumber || booking?.InvoiceNo || "N/A";

  const bookingRefNo =
    booking?.BookingRefNo ||
    booking?.TBOReferenceNo ||
    booking?.ReferenceNo ||
    "N/A";

  const currency =
    booking?.Currency ||
    booking?.currency ||
    roomData?.Currency ||
    savedData?.currency ||
    savedData?.finalPayload?.Currency ||
    "INR";

  const totalFare = Number(
    savedData?.TotalFare ??
      savedData?.totalFare ??
      savedData?.displayFare ??
      savedData?.reviewBookingData?.TotalFare ??
      savedData?.reviewBookingData?.totalFare ??
      savedData?.reviewBookingData?.displayFare ??
      savedData?.roomData?.TotalFare ??
      savedData?.reviewBookingData?.roomData?.TotalFare ??
      savedData?.selectedRoom?.TotalFare ??
      savedData?.room?.TotalFare ??
      savedData?.prebookData?.TotalFare ??
      savedData?.prebookData?.totalFare ??
      savedData?.prebookData?.displayFare ??
      savedData?.prebookData?.room?.TotalFare ??
      savedData?.prebookData?.room?.totalFare ??
      savedData?.prebookData?.room?.displayFare ??
      savedData?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.TotalFare ??
      savedData?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]
        ?.TotalFare ??
      roomData?.TotalFare ??
      booking?.TotalFare ??
      0,
  );

  const offeredRate =
    roomData?.TotalFare ||
    booking?.TotalFare ||
    booking?.OfferedFare ||
    totalFare;

  const publishedRate =
    roomData?.PublishedPrice ||
    roomData?.PublishedFare ||
    roomData?.Price?.PublishedPrice ||
    booking?.PublishedPrice ||
    booking?.PublishedFare ||
    offeredRate;

  const tax =
    roomData?.TotalTax ||
    booking?.TotalTax ||
    booking?.Tax ||
    booking?.TotalGSTAmount ||
    0;

  const tds = booking?.TDS || booking?.Tds || 0;
  const commission = booking?.Commission || booking?.CommEarned || 0;
  const gst = booking?.TotalGSTAmount || booking?.GST || 0;

  const hotelName =
    hotel?.hotel_name ||
    hotel?.HotelName ||
    booking?.HotelName ||
    hotelResult?.HotelName ||
    "Hotel Name N/A";

  const hotelAddress =
    pickFirst(
      savedData?.hotelAddress,
      savedData?.reviewBookingData?.hotelAddress,

      savedData?.hotel?.hotel_address,
      savedData?.hotel?.address,
      savedData?.hotel?.Address,
      savedData?.hotel?.HotelAddress,
      savedData?.hotel?.AddressLine,
      savedData?.hotel?.HotelAddressLine,
      savedData?.hotel?.Location,
      savedData?.hotel?.HotelLocation,

      savedData?.hotel?.hotel_raw?.hotel_address,
      savedData?.hotel?.hotel_raw?.address,
      savedData?.hotel?.hotel_raw?.Address,
      savedData?.hotel?.hotel_raw?.HotelAddress,
      savedData?.hotel?.hotel_raw?.AddressLine,
      savedData?.hotel?.hotel_raw?.HotelAddressLine,
      savedData?.hotel?.hotel_raw?.Location,
      savedData?.hotel?.hotel_raw?.HotelLocation,

      hotel?.hotel_address,
      hotel?.address,
      hotel?.Address,
      hotel?.HotelAddress,
      hotel?.AddressLine,
      hotel?.HotelAddressLine,
      hotel?.Location,
      hotel?.HotelLocation,

      hotel?.hotel_raw?.hotel_address,
      hotel?.hotel_raw?.address,
      hotel?.hotel_raw?.Address,
      hotel?.hotel_raw?.HotelAddress,
      hotel?.hotel_raw?.AddressLine,
      hotel?.hotel_raw?.HotelAddressLine,
      hotel?.hotel_raw?.Location,
      hotel?.hotel_raw?.HotelLocation,

      hotelResult?.hotel_address,
      hotelResult?.address,
      hotelResult?.Address,
      hotelResult?.HotelAddress,
      hotelResult?.AddressLine,
      hotelResult?.HotelAddressLine,
      hotelResult?.Location,
      hotelResult?.HotelLocation,

      booking?.HotelAddress,
      booking?.Address,
      booking?.AddressLine,
      booking?.HotelAddressLine,
      booking?.Location,

      savedData?.hotel?.city_name,
      savedData?.hotel?.CityName,
      hotel?.city_name,
      hotel?.CityName,
      hotelResult?.CityName,
      booking?.CityName,
    ) || "Address N/A";

  const cityName =
    hotel?.city_name ||
    hotel?.CityName ||
    booking?.CityName ||
    hotelResult?.CityName ||
    "";

  const hotelRating =
    hotel?.rating ||
    hotel?.HotelRating ||
    hotelResult?.HotelRating ||
    hotelResult?.StarRating ||
    "";

  const hotelNorms = useMemo(() => {
    const norms =
      savedData?.hotelNorms ||
      savedData?.HotelNorms ||
      savedData?.reviewBookingData?.hotelNorms ||
      savedData?.reviewBookingData?.HotelNorms ||
      hotelResult?.HotelNorms ||
      hotel?.HotelNorms ||
      hotel?.hotel_norms ||
      roomData?.HotelNorms ||
      booking?.HotelNorms ||
      [];

    if (Array.isArray(norms)) return norms.filter(Boolean);
    if (typeof norms === "string") return norms.split("|").filter(Boolean);

    return [];
  }, [savedData, hotelResult, hotel, roomData, booking]);

  const hotelFacilities = useMemo(() => {
    const data =
      savedData?.hotelFacilities ||
      savedData?.HotelFacilities ||
      savedData?.facilities ||
      savedData?.Facilities ||
      savedData?.reviewBookingData?.hotelFacilities ||
      savedData?.reviewBookingData?.HotelFacilities ||
      savedData?.reviewBookingData?.facilities ||
      savedData?.hotelResult?.HotelFacilities ||
      savedData?.hotelResult?.Facilities ||
      savedData?.hotelResult?.HotelFacility ||
      hotelResult?.HotelFacilities ||
      hotelResult?.Facilities ||
      hotelResult?.HotelFacility ||
      hotel?.HotelFacilities ||
      hotel?.Facilities ||
      hotel?.facilities ||
      hotel?.hotel_facilities ||
      booking?.HotelFacilities ||
      booking?.Facilities ||
      [];

    return flatArray(splitTextList(data));
  }, [savedData, hotelResult, hotel, booking]);

  const amenities = useMemo(() => {
    const list =
      savedData?.roomAmenities ||
      savedData?.RoomAmenities ||
      savedData?.amenities ||
      savedData?.Amenities ||
      savedData?.reviewBookingData?.roomAmenities ||
      savedData?.reviewBookingData?.RoomAmenities ||
      roomData?.Amenities ||
      roomData?.RoomAmenities ||
      roomData?.amenities ||
      savedData?.hotelResult?.Amenities ||
      savedData?.hotelResult?.RoomAmenities ||
      hotelResult?.Amenities ||
      hotelResult?.RoomAmenities ||
      hotel?.amenities ||
      hotel?.Amenities ||
      [];

    return splitTextList(list);
  }, [savedData, roomData, hotelResult, hotel]);

  const cancelPolicies = useMemo(() => {
    const data =
      savedData?.cancellationPolicies ||
      savedData?.reviewBookingData?.cancellationPolicies ||
      roomData?.CancelPolicies ||
      roomData?.CancellationPolicies ||
      booking?.HotelRoomsDetails?.[0]?.CancellationPolicies ||
      booking?.HotelRoomsDetails?.[0]?.CancelPolicies ||
      [];

    return Array.isArray(data) ? data : [];
  }, [savedData, roomData, booking]);

  const supplements = useMemo(() => {
    const data =
      savedData?.supplements ||
      savedData?.reviewBookingData?.supplements ||
      roomData?.Supplements ||
      roomData?.Supplement ||
      booking?.HotelRoomsDetails?.[0]?.Supplements ||
      [];

    return flatArray(data);
  }, [savedData, roomData, booking]);

  const roomPromotions = useMemo(() => {
    const data =
      savedData?.roomPromotions ||
      savedData?.roomPromotion ||
      savedData?.RoomPromotion ||
      savedData?.RoomPromotions ||
      savedData?.reviewBookingData?.roomPromotions ||
      savedData?.reviewBookingData?.RoomPromotion ||
      roomData?.RoomPromotion ||
      roomData?.RoomPromotions ||
      roomData?.Promotion ||
      savedData?.hotelResult?.RoomPromotion ||
      hotelResult?.RoomPromotion ||
      booking?.HotelRoomsDetails?.[0]?.RoomPromotion ||
      [];

    return flatArray(data);
  }, [savedData, roomData, hotelResult, booking]);

  const rateConditions = useMemo(() => {
    const data =
      savedData?.rateConditions ||
      savedData?.RateConditions ||
      savedData?.reviewBookingData?.rateConditions ||
      savedData?.reviewBookingData?.RateConditions ||
      roomData?.RateConditions ||
      savedData?.hotelResult?.RateConditions ||
      hotelResult?.RateConditions ||
      booking?.RateConditions ||
      booking?.HotelRoomsDetails?.[0]?.RateConditions ||
      [];

    return Array.isArray(data) ? data.filter(Boolean) : splitTextList(data);
  }, [savedData, roomData, hotelResult, booking]);

  const totalAdults = guestDetails.filter(
    (guest) => getPaxTypeLabel(guest) === "Adult",
  ).length;

  const totalChildren = guestDetails.filter(
    (guest) => getPaxTypeLabel(guest) === "Child",
  ).length;

  const totalRooms = rooms.length || 1;

  const supportPhone =
    booking?.SupportPhone ||
    booking?.CustomerSupportPhone ||
    savedData?.supportPhone ||
    "";

  const handleInvoiceClick = () => {
    if (!booking?.BookingId) {
      alert("Booking ID missing");
      return;
    }

    navigate(`/hotel-invoice/${booking.BookingId}`, {
      state: {
        booking,
        hotel,
        guestDetails,
        savedData,
        fullResponse: savedData?.bookingResponse || booking,
        prebookData: savedData?.prebookData,
      },
    });
  };

  const handleVoucherClick = () => {
    if (!booking?.BookingId) {
      alert("Booking ID missing");
      return;
    }

    navigate(`/booking-details/${booking.BookingId}`, {
      state: {
        booking,
        hotel,
        guestDetails,
        savedData,
      },
    });
  };

  const handleChangeRequest = async () => {
    if (changeMsg) return;

    if (!booking?.BookingId) {
      setChangeError("Booking ID missing");
      return;
    }

    const remarks = window.prompt("Enter cancellation/change request reason");
    if (!remarks) return;

    try {
      setChangeLoading(true);
      setChangeMsg(null);
      setChangeError(null);

      const res = await sendHotelChangeRequest(booking.BookingId, remarks);

      if (res?.success) {
        setChangeMsg(
          `${res.message || "Change request raised successfully"}${
            res.data?.ChangeRequestId
              ? ` (Request ID: ${res.data.ChangeRequestId})`
              : ""
          }`,
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070A] px-4 text-center text-yellow-300">
        Loading booking details...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#07070A] p-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-red-400/20 bg-red-400/10 p-8 shadow-2xl shadow-black/40">
          <h2 className="mb-3 text-2xl font-bold text-red-300">
            Booking not found
          </h2>

          <p className="mb-6 text-sm text-gray-400">
            No booking response was found for this page.
          </p>

          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 px-6 py-3 font-bold text-black"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070A] px-3 py-20 text-white sm:px-5 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-4xl border border-white/10 bg-[#111118] shadow-2xl shadow-black/50">
          <div className="relative overflow-hidden bg-linear-to-r from-[#17171F] via-[#211B12] to-[#2B160A] px-5 py-6 md:px-8">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>

                  {booking?.VoucherStatus !== undefined && (
                    <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-300">
                      Voucher: {booking.VoucherStatus ? "Yes" : "No"}
                    </span>
                  )}

                  {booking?.ResponseStatus !== undefined && (
                    <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
                      Response: {booking.ResponseStatus}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-black tracking-tight text-yellow-400 md:text-4xl">
                  Booking Confirmed
                </h1>

                <p className="mt-2 text-sm text-gray-300">
                  Booking ID:{" "}
                  <span className="font-bold text-white">{bookingId}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton variant="dark" onClick={() => navigate(-1)}>
                  Back
                </ActionButton>

                <ActionButton
                  onClick={() => {
                    setViewLoading(true);
                    handleVoucherClick();
                  }}
                >
                  {viewLoading ? "Loading..." : "View Voucher"}
                </ActionButton>

                <ActionButton onClick={handleInvoiceClick}>
                  View Invoice
                </ActionButton>

                {supportPhone && (
                  <a
                    href={`https://wa.me/${String(supportPhone).replace(
                      /\D/g,
                      "",
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-7">
            <InfoTile label="Confirmation No" value={confirmationNo} />
            <InfoTile label="Booking Reference" value={bookingRefNo} />
            <InfoTile label="Invoice Number" value={invoiceNumber} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-4xl border border-white/10 bg-[#111118] p-5 shadow-xl shadow-black/30 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-yellow-400/30 bg-yellow-400/10 text-5xl">
                  🏨
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      {hotelName}
                    </h2>

                    {hotelRating && (
                      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
                        {hotelRating} Star
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-2 text-sm leading-6 ${
                      hotelAddress === "Address N/A"
                        ? "text-red-300"
                        : "text-gray-400"
                    }`}
                  >
                    {hotelAddress}
                  </p>

                  {cityName && (
                    <p className="mt-2 text-sm font-semibold text-yellow-300">
                      📍 {cityName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
            <DateTile label="Check In" value={formatDate(checkIn)} icon="📅" />
            <DateTile
              label="Check Out"
              value={formatDate(checkOut)}
              icon="📅"
            />
            <DateTile
              label="Stay Duration"
              value={`${nights} Night${nights > 1 ? "s" : ""}`}
              icon="🌙"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <main className="space-y-5 lg:col-span-8">
            <SectionCard>
              <SectionTitle icon="🛏️" title="Room Details" />

              <div className="space-y-4 p-5">
                {rooms.map((room, index) => {
                  const roomName = getRoomName(room, roomData, index);
                  const inclusion = getRoomInclusion(room, roomData);

                  const roomGuests =
                    guestsByRoom.find((item) => item.roomIndex === index)
                      ?.guests || [];

                  const adults =
                    room?._paxRoom?.Adults ||
                    roomGuests.filter(
                      (guest) => getPaxTypeLabel(guest) === "Adult",
                    ).length ||
                    0;

                  const children =
                    room?._paxRoom?.Children ||
                    roomGuests.filter(
                      (guest) => getPaxTypeLabel(guest) === "Child",
                    ).length ||
                    0;

                  return (
                    <div
                      key={index}
                      className="rounded-3xl border border-white/10 bg-white/3 p-4 transition hover:border-yellow-400/30"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-yellow-300">
                            Room {index + 1}
                          </p>

                          <h3 className="mt-1 text-lg font-bold text-white">
                            {roomName}
                          </h3>

                          <p className="mt-2 text-sm text-gray-400">
                            Inclusion:{" "}
                            <span className="font-semibold text-white">
                              {inclusion}
                            </span>
                          </p>

                          {roomPromotions.length > 0 && index === 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {roomPromotions.map((promotion, promoIndex) => (
                                <span
                                  key={promoIndex}
                                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                                >
                                  {getPromotionText(promotion)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
                          <p className="font-bold text-white">
                            👤 {adults} Adult{Number(adults) !== 1 ? "s" : ""}
                          </p>

                          <p className="mt-1 font-bold text-white">
                            🧒 {children} Child
                            {Number(children) !== 1 ? "ren" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {supplements.length > 0 && (
                  <div className="rounded-3xl border border-orange-400/20 bg-orange-400/10 p-4">
                    <h4 className="mb-3 font-bold text-orange-200">
                      Supplements
                    </h4>

                    <ul className="space-y-2 text-sm text-orange-100">
                      {supplements.map((item, index) => (
                        <li key={index}>
                          • {getSupplementText(item, currency)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="🪪" title="Guest Details" />

              <div className="space-y-4 p-5">
                {guestsByRoom.length > 0 ? (
                  guestsByRoom.map((roomGroup, roomIndex) => (
                    <div
                      key={roomIndex}
                      className="rounded-3xl border border-white/10 bg-white/3 p-4"
                    >
                      <p className="mb-3 font-bold text-yellow-300">
                        Room {roomGroup.roomIndex + 1}
                      </p>

                      <div className="space-y-3">
                        {roomGroup.guests.length > 0 ? (
                          roomGroup.guests.map((guest, guestIndex) => (
                            <div
                              key={guestIndex}
                              className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-12 md:items-center"
                            >
                              <div className="md:col-span-3">
                                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">
                                  {getPaxTypeLabel(guest)} {guestIndex + 1}
                                </span>
                              </div>

                              <div className="md:col-span-6">
                                <p className="font-bold text-white">
                                  {getGuestName(guest)}
                                </p>

                                {guest?.Age && (
                                  <p className="text-xs text-gray-400">
                                    Age: {guest.Age}
                                  </p>
                                )}
                              </div>

                              <div className="md:col-span-3 md:text-right">
                                {guest?.LeadPassenger && (
                                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                    Lead Guest
                                  </span>
                                )}
                              </div>

                              {guest?.LeadPassenger &&
                                (guest?.Email || guest?.Phoneno) && (
                                  <div className="grid gap-2 border-t border-white/10 pt-3 text-xs text-gray-400 sm:grid-cols-2 md:col-span-12">
                                    {guest?.Email && <p>📧 {guest.Email}</p>}
                                    {guest?.Phoneno && (
                                      <p>📞 {guest.Phoneno}</p>
                                    )}
                                  </div>
                                )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">
                            Guest details not available for this room.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">
                    No guest details available.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="🕘" title="Cancellation Charges" />

              <div className="p-5">
                <p className="mb-4 text-sm font-semibold text-gray-400">
                  {getRoomName(rooms[0], roomData, 0)}
                </p>

                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-180 text-sm">
                      <thead className="bg-white/4 text-yellow-300">
                        <tr>
                          <th className="p-4 text-left font-bold">
                            Cancelled on or After
                          </th>
                          <th className="p-4 text-left font-bold">
                            Cancelled on or Before
                          </th>
                          <th className="p-4 text-left font-bold">Charges</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/10 text-gray-400">
                        {cancelPolicies.length > 0 ? (
                          cancelPolicies.map((policy, index) => (
                            <tr key={index}>
                              <td className="p-4">
                                {formatDate(
                                  policy?.FromDate || policy?.fromDate,
                                )}
                              </td>

                              <td className="p-4">
                                {formatDate(
                                  policy?.ToDate ||
                                    policy?.toDate ||
                                    policy?.CancelledOnOrBefore ||
                                    checkOut ||
                                    policy?.FromDate,
                                )}
                              </td>

                              <td className="p-4">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    getCancellationChargeText(
                                      policy,
                                      currency,
                                    ) === "Free"
                                      ? "bg-emerald-400/10 text-emerald-300"
                                      : "bg-red-400/10 text-red-300"
                                  }`}
                                >
                                  {getCancellationChargeText(policy, currency)}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-4 text-center">
                              Cancellation policy not available from previous
                              response.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-400">
                  <span className="font-semibold text-red-300">Note:</span>{" "}
                  Early check out may attract full cancellation charges if
                  specified by the supplier.
                </p>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="☑️" title="Room Amenities" />

              <div className="p-5">
                {amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-300"
                      >
                        {typeof amenity === "string"
                          ? amenity
                          : amenity?.Name || amenity?.Description || "Amenity"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Room amenities not available from previous response.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="🏨" title="Hotel Facilities" />

              <div className="p-5">
                {hotelFacilities.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {hotelFacilities.map((facility, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-gray-300"
                      >
                        <span className="mr-2 text-yellow-300">✓</span>
                        {getFacilityText(facility)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Hotel facilities not available from previous response.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="📋" title="Hotel Norms" />

              <div className="p-5">
                {hotelNorms.length > 0 ? (
                  <div className="space-y-3 text-sm text-gray-400">
                    {hotelNorms.map((norm, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        dangerouslySetInnerHTML={{
                          __html: `${index + 1}. ${cleanHtml(norm)}`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Hotel norms not available from previous response.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="📌" title="Rate Conditions" />

              <div className="p-5">
                {rateConditions.length > 0 ? (
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-400">
                    {rateConditions.map((condition, index) => (
                      <li
                        key={index}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                        dangerouslySetInnerHTML={{
                          __html: cleanHtml(condition),
                        }}
                      />
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-gray-400">
                    Rate conditions not available from previous response.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle icon="📝" title="Remark" />

              <div className="p-5 text-sm text-gray-400">
                {booking?.Remark || booking?.Remarks || "Remark not available."}
              </div>
            </SectionCard>
          </main>

          <aside className="space-y-5 lg:col-span-4">
            <SectionCard>
              <SectionTitle icon="⚙️" title="Booking Actions" />

              <div className="space-y-3 p-5">
                <button
                  onClick={handleChangeRequest}
                  disabled={changeLoading || Boolean(changeMsg)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                    changeMsg
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {changeLoading
                    ? "Sending request..."
                    : changeMsg
                      ? "Change request already raised"
                      : "Cancel / Change Request"}
                </button>

                {changeMsg && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300">
                    {changeMsg}
                  </div>
                )}

                {changeError && (
                  <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
                    {changeError}
                  </div>
                )}
              </div>
            </SectionCard>

            {supportPhone && (
              <div className="rounded-[2rem] border border-white/10 bg-[#111118] p-5 shadow-xl shadow-black/30">
                <p className="text-sm text-gray-400">Support Contact</p>

                <a
                  href={`tel:${supportPhone}`}
                  className="mt-1 block text-lg font-black text-yellow-400 hover:underline"
                >
                  {supportPhone}
                </a>
              </div>
            )}

            {/* Price Summary */}
            {/* Price Summary */}
            <div className="sticky top-24 h-fit rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-5 text-xl font-bold text-yellow-300">
                Price Summary
              </h3>

              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold text-white">
                    Total Paid
                  </span>

                  <span className="text-2xl font-black text-yellow-400">
                    {formatMoney(totalFare, currency)}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  onClick={handleVoucherClick}
                  className="w-full rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 py-3 text-base font-bold text-black transition hover:scale-[1.01]"
                >
                  View Voucher
                </button>

                <button
                  onClick={handleInvoiceClick}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-base font-bold text-white transition hover:bg-white/[0.08]"
                >
                  View Invoice
                </button>
              </div>
            </div>

            <SectionCard>
              <SectionTitle icon="📊" title="Stay Summary" />

              <div className="grid grid-cols-2 gap-3 p-5">
                <MiniStat label="Rooms" value={totalRooms} />
                <MiniStat label="Nights" value={nights} />
                <MiniStat label="Adults" value={totalAdults} />
                <MiniStat label="Children" value={totalChildren} />
              </div>
            </SectionCard>
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <ActionButton onClick={handleInvoiceClick}>View Invoice</ActionButton>

          <ActionButton
            onClick={() => {
              setViewLoading(true);
              handleVoucherClick();
            }}
          >
            {viewLoading ? "Loading..." : "View Voucher"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ children }) => {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111118] shadow-xl shadow-black/30">
      {children}
    </section>
  );
};

const SectionTitle = ({ icon, title }) => {
  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-[#16161D] via-[#1D1A12] to-[#1F120B] px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>

        <h3 className="font-bold tracking-wide text-yellow-400">{title}</h3>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
};

const InfoTile = ({ label, value }) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
};

const DateTile = ({ label, value, icon }) => {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#111118] p-5 shadow-xl shadow-black/30">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-xl">
          {icon}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            {label}
          </p>

          <p className="mt-1 font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-2xl font-black text-yellow-400">{value}</p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
    </div>
  );
};

const ActionButton = ({ children, onClick, variant = "gold" }) => {
  const className =
    variant === "dark"
      ? "rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
      : "rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2 text-sm font-bold text-black shadow-lg shadow-yellow-500/10 transition hover:scale-[1.02] active:scale-[0.98]";

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
};

export default HotelBookingSuccess;
