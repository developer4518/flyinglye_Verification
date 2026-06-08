"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useHotelStore } from "../../../store/hotelStore";

const INDIA_CITY_KEYWORDS = [
  "delhi",
  "new delhi",
  "mumbai",
  "bangalore",
  "bengaluru",
  "goa",
  "jaipur",
  "agra",
  "kolkata",
  "chennai",
  "hyderabad",
  "pune",
  "gurgaon",
  "gurugram",
  "noida",
  "lucknow",
  "varanasi",
  "amritsar",
  "udaipur",
  "jodhpur",
  "manali",
  "shimla",
  "rishikesh",
  "haridwar",
  "dehradun",
  "ahmedabad",
  "surat",
  "indore",
  "bhopal",
  "chandigarh",
  "kochi",
  "cochin",
  "ooty",
  "mysore",
  "nainital",
  "mussoorie",
  "darjeeling",
  "gangtok",
  "srinagar",
  "kashmir",
  "leh",
  "ladakh",
];

const getSafeText = (...values) => {
  return values
    .find((v) => v !== undefined && v !== null && String(v).trim() !== "")
    ?.toString()
    .trim();
};

const HotelDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { selectedHotel, selectedRoom, search, setSelectedRoom } =
    useHotelStore();

  const payload = state || {};

  const hotel = payload.hotel || selectedHotel;

  const availableRooms =
    hotel?.rooms ||
    hotel?.Rooms ||
    hotel?.hotel_raw?.Rooms ||
    hotel?.rawHotel?.Rooms ||
    [];

  const normalizeRoom = (roomData = {}) => {
    const rawRoom = roomData.room_raw || roomData;

    const bookingCode =
      roomData.booking_code ||
      roomData.BookingCode ||
      rawRoom?.BookingCode ||
      null;

    const name =
      roomData.room_name ||
      roomData.Name?.[0] ||
      roomData.Name ||
      roomData.RoomTypeName ||
      rawRoom?.Name?.[0] ||
      rawRoom?.Name ||
      "Standard Room";

    return {
      ...roomData,
      room_raw: rawRoom,
      booking_code: bookingCode,
      BookingCode: bookingCode,
      Name: name,
      room_name: name,
      price:
        Number(
          roomData.price ||
            roomData.TotalFare ||
            rawRoom?.TotalFare ||
            roomData.Price?.PublishedPrice ||
            0,
        ) || 0,
      tax:
        Number(
          roomData.tax ||
            roomData.TotalTax ||
            rawRoom?.TotalTax ||
            roomData.Price?.Tax ||
            0,
        ) || 0,
      meal: roomData.meal || roomData.MealType || rawRoom?.MealType || "",
      refundable:
        roomData.refundable ??
        roomData.IsRefundable ??
        rawRoom?.IsRefundable ??
        false,
      inclusion:
        roomData.inclusion || roomData.Inclusion || rawRoom?.Inclusion || "",
      cancel_policies:
        roomData.cancel_policies ||
        roomData.CancelPolicies ||
        rawRoom?.CancelPolicies ||
        [],
    };
  };

  const roomOptions = availableRooms.length
    ? availableRooms.map(normalizeRoom)
    : [payload.room || selectedRoom].filter(Boolean).map(normalizeRoom);

  const [activeRoom, setActiveRoom] = useState(() =>
    normalizeRoom(payload.room || selectedRoom || roomOptions[0]),
  );

  const room = activeRoom;
  const checkIn = payload.checkIn || search?.checkIn;
  const checkOut = payload.checkOut || search?.checkOut;
  const guests = payload.guests || search?.guests;

  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const { isDomesticHotel, isInternationalHotel } = useMemo(() => {
    if (!hotel) {
      return {
        isDomesticHotel: true,
        isInternationalHotel: false,
      };
    }

    const cityName = getSafeText(
      search?.cityName,
      search?.CityName,
      payload?.cityName,
      payload?.CityName,
      payload?.search?.cityName,
      payload?.search?.CityName,
      hotel?.cityName,
      hotel?.CityName,
      hotel?.city,
      hotel?.City,
      hotel?.HotelCityName,
      hotel?.hotel_city,
      hotel?.Destination,
      hotel?.destination,
      hotel?.Address,
      hotel?.address,
    )?.toLowerCase();

    const countryCode = getSafeText(
      search?.countryCode,
      search?.CountryCode,
      payload?.countryCode,
      payload?.CountryCode,
      payload?.search?.countryCode,
      payload?.search?.CountryCode,
      hotel?.countryCode,
      hotel?.CountryCode,
      hotel?.HotelCountryCode,
      hotel?.country_code,
    )?.toUpperCase();

    const countryName = getSafeText(
      search?.countryName,
      search?.CountryName,
      payload?.countryName,
      payload?.CountryName,
      payload?.search?.countryName,
      payload?.search?.CountryName,
      hotel?.countryName,
      hotel?.CountryName,
      hotel?.country,
      hotel?.Country,
      hotel?.HotelCountryName,
      hotel?.hotel_country,
    )?.toLowerCase();

    const hasIndiaCountryCode = ["IN", "IND", "INDIA"].includes(countryCode);
    const hasIndiaCountryName = countryName === "india";
    const hasIndianCity = INDIA_CITY_KEYWORDS.some((city) =>
      cityName?.includes(city),
    );

    const domestic = Boolean(
      hasIndiaCountryCode || hasIndiaCountryName || hasIndianCity,
    );

    return {
      isDomesticHotel: domestic,
      isInternationalHotel: !domestic,
    };
  }, [hotel, search, payload]);

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-gray-400">
        No hotel data found
      </div>
    );
  }

  const images =
    Array.isArray(hotel?.images) && hotel.images.length > 0
      ? hotel.images
      : [hotel?.image || "https://via.placeholder.com/600"];

  const totalGuests =
    Number(guests?.adults || 0) + Number(guests?.children || 0);

  const formatPrice = (val) =>
    Math.round(Number(val) || 0).toLocaleString("en-IN");

  const roomPrice = Number(
    room?.price || room?.TotalFare || room?.NetAmount || 0,
  );

  const tax = Number(room?.tax || room?.TotalTax || room?.Tax || 0);

  const totalAmount = roomPrice + tax;

  const hotelName =
    hotel?.hotel_name || hotel?.HotelName || hotel?.Name || "Hotel";
  const roomName =
    room?.room_name || room?.Name || room?.RoomTypeName || "Standard Room";

  const mealPlan = room?.meal || room?.MealType || room?.MealPlan || "";

  const description =
    hotel?.description ||
    hotel?.Description ||
    "This premium hotel offers modern rooms, excellent hospitality, and top-class amenities. Ideal for business and leisure stays with easy access to major attractions.";

  const handlePreBook = () => {
    const bookingCode =
      room?.booking_code || room?.BookingCode || room?.room_raw?.BookingCode;

    if (!bookingCode) {
      alert("Please select a valid room");
      return;
    }

    const finalRoom = {
      ...room,
      booking_code: bookingCode,
      BookingCode: bookingCode,
    };

    const safeRoomGuests = Array.isArray(payload?.roomGuests)
      ? payload.roomGuests
      : Array.isArray(payload?.guests?.roomGuests)
        ? payload.guests.roomGuests
        : Array.isArray(search?.guests?.roomGuests)
          ? search.guests.roomGuests
          : [];

    const normalizedRoomGuests = safeRoomGuests.map((room, index) => {
      const children = Number(room.Children ?? room.children ?? 0);

      const ages =
        room.ChildrenAges ||
        room.ChildAges ||
        room.childAges ||
        room.childrenAges ||
        [];

      const cleanAges = ages
        .slice(0, children)
        .map((age) => Number(age))
        .filter((age) => age >= 1 && age <= 12);

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

    const normalizedChildAges = normalizedRoomGuests.flatMap(
      (room) => room.ChildrenAges,
    );

    const safeGuests = {
      ...(guests || {}),
      childAges: normalizedChildAges,
      roomGuests: normalizedRoomGuests,
    };

    setSelectedRoom(finalRoom);
    setLoading(true);

    navigate("/prebook", {
      state: {
        hotel,
        room: finalRoom,
        checkIn,
        checkOut,
        guests: safeGuests,

        childAges: normalizedChildAges,
        roomGuests: normalizedRoomGuests,

        bookingCode,
        cancellationPolicies: finalRoom.cancel_policies || [],
        inclusions: finalRoom.inclusion || "",
        mealType: finalRoom.meal || "",
        refundable: finalRoom.refundable,

        isDomesticHotel,
        isInternationalHotel,
        hotelType: isInternationalHotel ? "international" : "domestic",
      },
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
            alt={hotelName}
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
              alt={`${hotelName} ${i + 2}`}
              onClick={() => setSelectedImage(img)}
              className="w-full h-32 md:h-50 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
            />
          ))}
        </div>
      </div>

      {/* ================= LIGHTBOX ================= */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 text-white text-xl bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full"
          >
            ✕
          </button>

          <img
            src={selectedImage}
            alt="Selected hotel"
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-2 text-xs tracking-[0.35em] uppercase text-yellow-300">
                  {isInternationalHotel
                    ? "International Hotel"
                    : "Domestic Hotel"}
                </p>

                <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {hotelName}
                </h1>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  isInternationalHotel
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                    : "bg-green-500/10 text-green-300 border-green-500/30"
                }`}
              >
                {isInternationalHotel
                  ? "Passport Required"
                  : "No Passport Needed"}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <span className="text-yellow-300 text-sm">
                ⭐ {hotel?.rating || hotel?.Rating || "4.2"}
              </span>

              {hotel?.refundable && (
                <span className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded-full">
                  Refundable
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-400">
              📅 {checkIn || "Check-in"} → {checkOut || "Check-out"} • 👤{" "}
              {totalGuests || 1} Guests
            </p>
          </div>

          {/* ROOM SELECTION */}
          {roomOptions.length > 0 && (
            <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg text-yellow-300">Select Room</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose your preferred room before booking.
                  </p>
                </div>

                <span className="text-xs px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
                  {roomOptions.length} Option{roomOptions.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {roomOptions.map((roomItem, index) => {
                  const isSelected =
                    (room?.BookingCode || room?.booking_code) ===
                    (roomItem?.BookingCode || roomItem?.booking_code);

                  return (
                    <button
                      type="button"
                      key={roomItem.BookingCode || index}
                      onClick={() => {
                        setActiveRoom(roomItem);
                        setSelectedRoom(roomItem);
                      }}
                      className={`w-full text-left rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-gray-800 bg-[#0B0B0F] hover:border-yellow-400/40"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {roomItem.room_name ||
                              roomItem.Name ||
                              "Standard Room"}
                          </p>

                          {roomItem.inclusion && (
                            <div className="mt-3 space-y-1">
                              {roomItem.inclusion
                                .split(",")
                                .filter(Boolean)
                                .map((item, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 text-sm text-gray-300"
                                  >
                                    <span className="text-green-400">✓</span>
                                    <span>{item.trim()}</span>
                                  </div>
                                ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-2">
                            {roomItem.meal && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {String(roomItem.meal).replaceAll("_", " ")}
                              </span>
                            )}

                            <span
                              className={`text-[10px] px-2 py-1 rounded-full border ${
                                roomItem.refundable
                                  ? "bg-green-500/10 text-green-300 border-green-500/20"
                                  : "bg-red-500/10 text-red-300 border-red-500/20"
                              }`}
                            >
                              {roomItem.refundable
                                ? "Refundable"
                                : "Non-refundable"}
                            </span>
                          </div>
                        </div>

                        <div className="md:text-right">
                          <p className="text-xl font-bold text-yellow-400">
                            ₹ {formatPrice(roomItem.price)}
                          </p>

                          <p className="text-xs text-gray-500">
                            + ₹ {formatPrice(roomItem.tax)} taxes
                          </p>

                          {isSelected && (
                            <p className="text-xs text-yellow-300 mt-1">
                              Selected
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ROOM DETAILS */}
          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h2 className="text-lg text-yellow-300 mb-3">Room Details</h2>

            <p className="text-sm mb-2">
              🛏 <strong>{roomName}</strong>
            </p>

            {mealPlan && (
              <p className="text-sm mb-2">
                🍽 {String(mealPlan).replace("_", " ")}
              </p>
            )}

            <p className="text-sm text-gray-400">
              ✔ Free WiFi • ✔ AC • ✔ 24h Support
            </p>

            {(room?.BookingCode || room?.booking_code) && (
              <p className="mt-3 text-xs text-gray-500 break-all">
                Booking Code: {room.BookingCode || room.booking_code}
              </p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h2 className="text-lg text-yellow-300 mb-3">About this hotel</h2>

            <p className="text-sm text-gray-400 leading-relaxed">
              {showFullDesc
                ? description
                : description.length > 160
                  ? `${description.slice(0, 160)}...`
                  : description}
            </p>

            {description.length > 160 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-2 text-sm text-yellow-400 hover:underline"
              >
                {showFullDesc ? "Show Less" : "Read More"}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800 md:sticky md:top-24 h-fit">
          <h2 className="text-lg text-yellow-300 mb-4">Price Details</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span>Room Price</span>
              <span>₹ {formatPrice(roomPrice)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span>Taxes</span>
              <span>₹ {formatPrice(tax)}</span>
            </div>

            <hr className="border-gray-700 my-2" />

            <div className="flex justify-between text-lg font-bold gap-4">
              <span>Total</span>
              <span className="text-yellow-400">
                ₹ {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-800 bg-black/20 p-3">
            <p className="text-xs text-gray-400">Hotel Type</p>

            <p className="mt-1 text-sm font-semibold text-white">
              {isInternationalHotel ? "International Hotel" : "Domestic Hotel"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {isInternationalHotel
                ? "Passport details will be required on guest details page."
                : "Passport details are not required for Indian domestic hotels."}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handlePreBook}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-lg bg-linear-to-r from-yellow-400 to-orange-400 text-black hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 transition"
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
