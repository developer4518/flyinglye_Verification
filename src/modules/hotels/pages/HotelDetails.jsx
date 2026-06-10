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

const getSafeText = (...values) =>
  values
    .find((v) => v !== undefined && v !== null && String(v).trim() !== "")
    ?.toString()
    .trim();

const formatPriceValue = (val) =>
  Math.round(Number(val) || 0).toLocaleString("en-IN");

const getDayRateBaseTotal = (room = {}) => {
  const dayRates = room?.DayRates || room?.day_rates || [];

  if (!Array.isArray(dayRates)) return 0;

  return dayRates
    .flat(Infinity)
    .reduce((sum, item) => sum + Number(item?.BasePrice || 0), 0);
};

const getMatchedRawRoom = (roomData = {}, hotel = {}) => {
  const bookingCode =
    roomData?.booking_code ||
    roomData?.BookingCode ||
    roomData?.room_raw?.BookingCode;

  const rawRooms =
    hotel?.hotel_raw?.Rooms ||
    hotel?.rawHotel?.Rooms ||
    hotel?.HotelResult?.[0]?.Rooms ||
    hotel?.raw?.HotelResult?.[0]?.Rooms ||
    hotel?.raw?.Response?.HotelResult?.[0]?.Rooms ||
    [];

  if (!Array.isArray(rawRooms) || !bookingCode) {
    return roomData?.room_raw || {};
  }

  return (
    rawRooms.find((rawRoom) => rawRoom?.BookingCode === bookingCode) ||
    roomData?.room_raw ||
    {}
  );
};

const getRoomCancelPolicies = (roomData = {}, rawRoom = {}) => {
  const policies =
    roomData?.cancel_policies ||
    roomData?.CancelPolicies ||
    roomData?.CancellationPolicies ||
    rawRoom?.CancelPolicies ||
    rawRoom?.CancellationPolicies ||
    [];

  return Array.isArray(policies) ? policies : [];
};

const getRoomDescription = (roomData = {}, hotel = {}) => {
  const name =
    roomData?.room_name ||
    roomData?.Name?.[0] ||
    roomData?.Name ||
    roomData?.RoomName ||
    "";

  const roomDetails =
    hotel?.rooms ||
    hotel?.roomDetails ||
    hotel?.HotelRooms ||
    hotel?.hotelRooms ||
    hotel?.RoomsDetails ||
    [];

  const matchedDetail = Array.isArray(roomDetails)
    ? roomDetails.find((item) => {
        const detailName = String(
          item?.RoomName || item?.room_name || item?.Name || "",
        ).toLowerCase();

        const currentName = String(name).toLowerCase();

        return (
          detailName &&
          currentName &&
          (detailName.includes(currentName) || currentName.includes(detailName))
        );
      })
    : null;

  return (
    roomData?.RoomDescription ||
    roomData?.room_description ||
    roomData?.description ||
    matchedDetail?.RoomDescription ||
    matchedDetail?.room_description ||
    matchedDetail?.Description ||
    ""
  );
};

const normalizeRoomData = (roomData = {}, hotel = {}) => {
  const matchedRawRoom = getMatchedRawRoom(roomData, hotel);
  const rawRoom = roomData?.room_raw || matchedRawRoom || roomData;

  const bookingCode =
    roomData?.booking_code ||
    roomData?.BookingCode ||
    rawRoom?.BookingCode ||
    matchedRawRoom?.BookingCode ||
    null;

  const name =
    roomData?.room_name ||
    roomData?.Name?.[0] ||
    roomData?.Name ||
    roomData?.RoomTypeName ||
    roomData?.RoomName ||
    rawRoom?.Name?.[0] ||
    rawRoom?.Name ||
    rawRoom?.RoomName ||
    "Standard Room";

  const cancelPolicies = getRoomCancelPolicies(roomData, rawRoom);

  const totalFare =
    Number(
      roomData?.publishedFare ||
        roomData?.TotalFare ||
        rawRoom?.TotalFare ||
        roomData?.Price?.PublishedPrice ||
        roomData?.PublishedPrice ||
        roomData?.NetAmount ||
        rawRoom?.NetAmount ||
        0,
    ) || 0;

  const totalTax =
    Number(
      roomData?.tax ||
        roomData?.TotalTax ||
        rawRoom?.TotalTax ||
        roomData?.Price?.Tax ||
        roomData?.Tax ||
        0,
    ) || 0;

  const dayRateBase =
    getDayRateBaseTotal(rawRoom) || getDayRateBaseTotal(roomData);

  const baseFare =
    Number(
      roomData?.baseFare ||
        roomData?.base_fare ||
        roomData?.BaseFare ||
        roomData?.Price?.RoomPrice ||
        roomData?.RoomPrice ||
        dayRateBase ||
        (totalFare && totalTax ? totalFare - totalTax : totalFare),
    ) || 0;

  const publishedFare = totalFare || baseFare + totalTax;

  return {
    ...roomData,

    room_raw: rawRoom,

    booking_code: bookingCode,
    BookingCode: bookingCode,

    Name: name,
    room_name: name,

    price: baseFare,
    baseFare,
    base_fare: baseFare,

    tax: totalTax,
    TotalTax: totalTax,

    publishedFare,
    TotalFare: publishedFare,

    dayRateBase,

    meal:
      roomData?.meal ||
      roomData?.MealType ||
      rawRoom?.MealType ||
      roomData?.MealPlan ||
      "",

    MealType:
      roomData?.MealType ||
      roomData?.meal ||
      rawRoom?.MealType ||
      roomData?.MealPlan ||
      "",

    refundable:
      roomData?.refundable ??
      roomData?.IsRefundable ??
      rawRoom?.IsRefundable ??
      false,

    IsRefundable:
      roomData?.IsRefundable ??
      roomData?.refundable ??
      rawRoom?.IsRefundable ??
      false,

    inclusion:
      roomData?.inclusion || roomData?.Inclusion || rawRoom?.Inclusion || "",

    Inclusion:
      roomData?.Inclusion || roomData?.inclusion || rawRoom?.Inclusion || "",

    room_description: getRoomDescription(roomData, hotel),

    cancel_policies: cancelPolicies,
    CancelPolicies: cancelPolicies,
  };
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
    hotel?.HotelResult?.[0]?.Rooms ||
    hotel?.raw?.HotelResult?.[0]?.Rooms ||
    [];

  const roomOptions = useMemo(() => {
    const rooms = Array.isArray(availableRooms) ? availableRooms : [];

    if (rooms.length > 0) {
      return rooms.map((roomData) => normalizeRoomData(roomData, hotel));
    }

    return [payload.room || selectedRoom]
      .filter(Boolean)
      .map((roomData) => normalizeRoomData(roomData, hotel));
  }, [availableRooms, hotel, payload.room, selectedRoom]);

  const [activeRoom, setActiveRoom] = useState(() =>
    normalizeRoomData(payload.room || selectedRoom || roomOptions[0], hotel),
  );

  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [roomSearch, setRoomSearch] = useState("");
  const [sortBy, setSortBy] = useState("price");
  const [splitRoom, setSplitRoom] = useState(false);
  const [openDescriptions, setOpenDescriptions] = useState({});
  const [openPolicies, setOpenPolicies] = useState({});

  const room = activeRoom;
  const checkIn = payload.checkIn || search?.checkIn;
  const checkOut = payload.checkOut || search?.checkOut;
  const guests = payload.guests || search?.guests;

  const formatPrice = (val) => formatPriceValue(val);

  const roomPrice = Number(
    room?.price || room?.baseFare || room?.base_fare || 0,
  );

  const tax = Number(room?.tax || room?.TotalTax || room?.Tax || 0);

  const totalAmount = Number(
    room?.publishedFare || room?.TotalFare || roomPrice + tax || 0,
  );

  const { isDomesticHotel, isInternationalHotel } = useMemo(() => {
    if (!hotel) {
      return { isDomesticHotel: true, isInternationalHotel: false };
    }

    const cityName = getSafeText(
      search?.cityName,
      payload?.cityName,
      hotel?.cityName,
      hotel?.CityName,
      hotel?.city,
      hotel?.City,
      hotel?.HotelCityName,
      hotel?.Address,
      hotel?.address,
    )?.toLowerCase();

    const countryCode = getSafeText(
      search?.countryCode,
      payload?.countryCode,
      hotel?.countryCode,
      hotel?.CountryCode,
      hotel?.HotelCountryCode,
    )?.toUpperCase();

    const countryName = getSafeText(
      search?.countryName,
      payload?.countryName,
      hotel?.countryName,
      hotel?.CountryName,
      hotel?.country,
      hotel?.Country,
      hotel?.HotelCountryName,
    )?.toLowerCase();

    const domestic = Boolean(
      ["IN", "IND", "INDIA"].includes(countryCode) ||
      countryName === "india" ||
      INDIA_CITY_KEYWORDS.some((city) => cityName?.includes(city)),
    );

    return {
      isDomesticHotel: domestic,
      isInternationalHotel: !domestic,
    };
  }, [hotel, search, payload]);

  const filteredRoomOptions = useMemo(() => {
    let data = [...roomOptions];

    if (roomSearch.trim()) {
      data = data.filter((item) =>
        String(item?.room_name || item?.Name || "")
          .toLowerCase()
          .includes(roomSearch.toLowerCase()),
      );
    }

    if (sortBy === "price") {
      data.sort(
        (a, b) =>
          Number(a.publishedFare || a.TotalFare || a.price || 0) -
          Number(b.publishedFare || b.TotalFare || b.price || 0),
      );
    }

    if (sortBy === "priceHigh") {
      data.sort(
        (a, b) =>
          Number(b.publishedFare || b.TotalFare || b.price || 0) -
          Number(a.publishedFare || a.TotalFare || a.price || 0),
      );
    }

    return data;
  }, [roomOptions, roomSearch, sortBy]);

  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] text-gray-400">
        No hotel data found
      </div>
    );
  }

  const hotelName =
    hotel?.hotel_name || hotel?.HotelName || hotel?.Name || "Hotel";

  const images =
    Array.isArray(hotel?.images) && hotel.images.length > 0
      ? hotel.images
      : Array.isArray(hotel?.Images) && hotel.Images.length > 0
        ? hotel.Images
        : [hotel?.image || hotel?.Image || "https://via.placeholder.com/600"];

  const totalGuests =
    Number(guests?.adults || guests?.Adults || 0) +
    Number(guests?.children || guests?.Children || 0);

  const roomName =
    room?.room_name || room?.Name || room?.RoomTypeName || "Standard Room";

  const mealPlan = room?.meal || room?.MealType || room?.MealPlan || "";

  const description =
    hotel?.description ||
    hotel?.Description ||
    "This premium hotel offers modern rooms, excellent hospitality, and top-class amenities. Ideal for business and leisure stays with easy access to major attractions.";

  const selectedRoomPolicies = Array.isArray(room?.cancel_policies)
    ? room.cancel_policies
    : [];

  const getCancellationCharge = (policy = {}, baseAmount = totalAmount) => {
    const charge = Number(policy.CancellationCharge || 0);
    const type = String(policy.ChargeType || "").toLowerCase();

    if (type.includes("percent")) {
      return (baseAmount * charge) / 100;
    }

    return charge;
  };

  const getCancellationText = (policy = {}, baseAmount = totalAmount) => {
    const charge = Number(policy.CancellationCharge || 0);
    const type = String(policy.ChargeType || "Fixed");

    if (charge === 0) return "Free cancellation";

    if (type.toLowerCase().includes("percent")) {
      return `${charge}% charge`;
    }

    return `₹ ${formatPrice(getCancellationCharge(policy, baseAmount))} charge`;
  };

  const getRoomCountTitle = () => {
    const adults = Number(guests?.adults || guests?.Adults || 0);
    const children = Number(guests?.children || guests?.Children || 0);
    const rooms = Number(guests?.rooms || guests?.Rooms || 1);

    return `Room ${rooms || 1} (${adults || 1} Adult${
      (adults || 1) > 1 ? "s" : ""
    } ${children ? `${children} Child${children > 1 ? "ren" : ""}` : ""})`;
  };

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
      price: roomPrice,
      baseFare: roomPrice,
      base_fare: roomPrice,
      tax,
      TotalTax: tax,
      publishedFare: totalAmount,
      TotalFare: totalAmount,
      cancel_policies: selectedRoomPolicies,
      CancelPolicies: selectedRoomPolicies,
    };

    const safeRoomGuests = Array.isArray(payload?.roomGuests)
      ? payload.roomGuests
      : Array.isArray(payload?.guests?.roomGuests)
        ? payload.guests.roomGuests
        : Array.isArray(search?.guests?.roomGuests)
          ? search.guests.roomGuests
          : [];

    const normalizedRoomGuests = safeRoomGuests.map((roomGuest, index) => {
      const children = Number(roomGuest.Children ?? roomGuest.children ?? 0);

      const ages =
        roomGuest.ChildrenAges ||
        roomGuest.ChildAges ||
        roomGuest.childAges ||
        roomGuest.childrenAges ||
        [];

      const cleanAges = Array.isArray(ages)
        ? ages
            .slice(0, children)
            .map((age) => Number(age))
            .filter((age) => age >= 1 && age <= 12)
        : [];

      return {
        RoomIndex: roomGuest.RoomIndex ?? roomGuest.roomIndex ?? index + 1,
        roomIndex: roomGuest.roomIndex ?? roomGuest.RoomIndex ?? index + 1,
        Adults: Number(roomGuest.Adults ?? roomGuest.adults ?? 1),
        adults: Number(roomGuest.adults ?? roomGuest.Adults ?? 1),
        Children: children,
        children,
        ChildAges: cleanAges,
        ChildrenAges: cleanAges,
        childAges: cleanAges,
      };
    });

    const normalizedChildAges = normalizedRoomGuests.flatMap(
      (roomGuest) => roomGuest.ChildrenAges,
    );

    setSelectedRoom(finalRoom);
    setLoading(true);

    navigate("/prebook", {
      state: {
        hotel,
        room: finalRoom,
        checkIn,
        checkOut,
        guests: {
          ...(guests || {}),
          childAges: normalizedChildAges,
          roomGuests: normalizedRoomGuests,
        },
        childAges: normalizedChildAges,
        roomGuests: normalizedRoomGuests,
        bookingCode,
        cancellationPolicies: selectedRoomPolicies,
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-2">
          <img
            src={images[0]}
            alt={hotelName}
            onClick={() => setSelectedImage(images[0])}
            className="w-full h-64 md:h-105 object-cover rounded-2xl cursor-pointer hover:opacity-90 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          {images.slice(1, 5).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${hotelName} ${i + 2}`}
              onClick={() => setSelectedImage(img)}
              className="w-full h-32 md:h-50.5 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
            />
          ))}
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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
            </div>

            <p className="mt-3 text-sm text-gray-400">
              📅 {checkIn || "Check-in"} → {checkOut || "Check-out"} • 👤{" "}
              {totalGuests || 1} Guests
            </p>
          </div>

          {roomOptions.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
              <div className="bg-[#d9d7eb] px-4 py-4 text-black">
                <div className="mb-3 text-sm font-bold">
                  {getRoomCountTitle()}
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="Search Room Type"
                    className="h-8 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none md:w-56"
                  />

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-8 rounded border border-gray-300 bg-white px-2 text-sm outline-none"
                  >
                    <option value="price">Price Low to High</option>
                    <option value="priceHigh">Price High to Low</option>
                  </select>

                  <label className="flex h-8 items-center gap-2 rounded bg-white px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={splitRoom}
                      onChange={(e) => setSplitRoom(e.target.checked)}
                    />
                    Split Room
                  </label>
                </div>
              </div>

              <div className="divide-y divide-gray-200 bg-white text-black">
                {filteredRoomOptions.map((roomItem, index) => {
                  const roomKey = roomItem.BookingCode || index;

                  const isSelected =
                    (room?.BookingCode || room?.booking_code) ===
                    (roomItem?.BookingCode || roomItem?.booking_code);

                  const policies = Array.isArray(roomItem.cancel_policies)
                    ? roomItem.cancel_policies
                    : [];

                  const itemBasePrice = Number(
                    roomItem?.price ||
                      roomItem?.baseFare ||
                      roomItem?.base_fare ||
                      0,
                  );

                  const itemTax = Number(
                    roomItem?.tax || roomItem?.TotalTax || 0,
                  );

                  const roomTotal = Number(
                    roomItem?.publishedFare ||
                      roomItem?.TotalFare ||
                      itemBasePrice + itemTax,
                  );

                  const roomDesc =
                    roomItem.room_description ||
                    "Layout - Bedroom\nInternet - Free WiFi\nEntertainment - LCD television with satellite channels\nFood and Drink - Room service\nBathroom - Free toiletries and shower\nComfort - Air conditioning and daily housekeeping\nNon-Smoking";

                  return (
                    <div
                      key={roomKey}
                      onClick={() => {
                        setActiveRoom(roomItem);
                        setSelectedRoom(roomItem);
                      }}
                      className={`cursor-pointer px-3 py-3 transition ${
                        isSelected
                          ? "bg-[#ffe7a6]"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_0.75fr_1fr_0.9fr] md:items-start">
                        <div>
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {
                                setActiveRoom(roomItem);
                                setSelectedRoom(roomItem);
                              }}
                              className="mt-1"
                            />

                            <div>
                              <p className="text-sm font-bold text-black">
                                {roomItem.room_name ||
                                  roomItem.Name ||
                                  "Standard Room"}
                              </p>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDescriptions((prev) => ({
                                    ...prev,
                                    [roomKey]: !prev[roomKey],
                                  }));
                                }}
                                className="text-sm font-medium text-blue-600 underline"
                              >
                                {openDescriptions[roomKey]
                                  ? "Hide Room Description"
                                  : "Show Room Description"}
                              </button>
                            </div>
                          </div>

                          {openDescriptions[roomKey] && (
                            <div className="mt-2 ml-5 max-w-xl whitespace-pre-line border border-gray-300 bg-white p-2 text-sm leading-6 text-gray-800">
                              {roomDesc}
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-black">
                          {roomItem.inclusion
                            ? roomItem.inclusion
                                .split(",")
                                .filter(Boolean)
                                .map((item, i) => <p key={i}>{item.trim()}</p>)
                            : "Room Only"}
                        </div>

                        <div>
                          {policies.length > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPolicies((prev) => ({
                                    ...prev,
                                    [roomKey]: !prev[roomKey],
                                  }));
                                }}
                                className="text-sm font-medium text-blue-600"
                              >
                                All Rooms Cancellation Policies.
                              </button>

                              {openPolicies[roomKey] && (
                                <div className="mt-2 rounded border border-gray-300 bg-white p-2 text-xs text-gray-800">
                                  {policies.map((policy, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between gap-3 border-b border-gray-100 py-1 last:border-0"
                                    >
                                      <span>
                                        From {policy.FromDate || "N/A"}
                                      </span>

                                      <span
                                        className={
                                          Number(
                                            policy.CancellationCharge || 0,
                                          ) === 0
                                            ? "font-semibold text-green-700"
                                            : "font-semibold text-red-700"
                                        }
                                      >
                                        {getCancellationText(policy, roomTotal)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Policy not available
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-right text-sm font-bold text-[#18558a]">
                          <p>Base: ₹ {formatPrice(itemBasePrice)}</p>
                          <p>Tax: ₹ {formatPrice(itemTax)}</p>
                          <p className="mt-1 text-base text-[#0f3d66]">
                            Total: ₹ {formatPrice(roomTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredRoomOptions.length === 0 && (
                  <div className="p-5 text-center text-sm text-gray-500">
                    No rooms found.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
            <h2 className="text-lg text-yellow-300 mb-3">Room Details</h2>

            <p className="text-sm mb-2">
              🛏 <strong>{roomName}</strong>
            </p>

            {mealPlan && (
              <p className="text-sm mb-2">
                🍽 {String(mealPlan).replaceAll("_", " ")}
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

          {selectedRoomPolicies.length > 0 && (
            <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800">
              <h2 className="text-lg text-yellow-300 mb-4">
                Cancellation Policy
              </h2>

              <div className="space-y-3">
                {selectedRoomPolicies.map((policy, index) => {
                  const calculatedCharge = getCancellationCharge(policy);
                  const rawCharge = Number(policy.CancellationCharge || 0);

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-800 bg-[#0B0B0F] p-4"
                    >
                      <p className="text-sm text-gray-300">
                        From:
                        <span className="text-white ml-2">
                          {policy.FromDate || "N/A"}
                        </span>
                      </p>

                      <p className="text-sm mt-2">
                        Charge:
                        <span
                          className={`ml-2 ${
                            rawCharge === 0 ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {rawCharge === 0
                            ? "Free cancellation"
                            : `₹ ${formatPrice(calculatedCharge)}`}
                        </span>
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {String(policy.ChargeType || "")
                          .toLowerCase()
                          .includes("percent")
                          ? `${policy.CancellationCharge || 0}% of total amount`
                          : "Fixed charge"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

        <div className="bg-[#15151C] p-5 rounded-2xl border border-gray-800 md:sticky md:top-24 h-fit">
          <h2 className="text-lg text-yellow-300 mb-4">Price Details</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span>Base Room Price</span>
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

          {selectedRoomPolicies.length > 0 && (
            <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
              <p className="text-xs text-yellow-300 font-semibold">
                Cancellation
              </p>

              <p className="mt-1 text-xs text-gray-300">
                {selectedRoomPolicies.some(
                  (policy) => Number(policy.CancellationCharge || 0) === 0,
                )
                  ? "Free cancellation available as per room policy."
                  : "Cancellation charges apply as per room policy."}
              </p>
            </div>
          )}

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
