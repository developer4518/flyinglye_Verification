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

const formatPriceValue = (val) => {
  const num = Number(val) || 0;

  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const cleanText = (value) => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
};

const uniqueTextArray = (items = []) => {
  const seen = new Set();

  return items
    .map(cleanText)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
};

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getFirstNonEmptyArray = (...values) => {
  return values.find((value) => Array.isArray(value) && value.length > 0) || [];
};

const findDeepValueByKeys = (source, keys = []) => {
  if (!source || typeof source !== "object") return null;

  const targetKeys = keys.map((key) => key.toLowerCase());
  const visited = new WeakSet();
  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;

    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => {
        if (item && typeof item === "object") queue.push(item);
      });
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const parsedValue = parseMaybeJson(value);

      if (targetKeys.includes(key.toLowerCase())) {
        if (Array.isArray(parsedValue) && parsedValue.length > 0) {
          return parsedValue;
        }

        if (
          parsedValue &&
          typeof parsedValue === "object" &&
          Object.keys(parsedValue).length > 0
        ) {
          return parsedValue;
        }

        if (typeof parsedValue === "string" && parsedValue.trim()) {
          return parsedValue;
        }
      }

      if (parsedValue && typeof parsedValue === "object") {
        queue.push(parsedValue);
      }
    }
  }

  return null;
};

const normalizeFacilities = (value) => {
  const parsedValue = parseMaybeJson(value);

  if (!parsedValue) return [];

  if (Array.isArray(parsedValue)) {
    return uniqueTextArray(
      parsedValue.map((item) => {
        if (typeof item === "string") return item;

        if (typeof item === "object") {
          return (
            item.name ||
            item.Name ||
            item.title ||
            item.Title ||
            item.FacilityName ||
            item.facilityName ||
            item.Facility ||
            item.facility ||
            ""
          );
        }

        return "";
      }),
    );
  }

  if (typeof parsedValue === "object") {
    return uniqueTextArray(Object.values(parsedValue));
  }

  if (typeof parsedValue === "string") {
    return uniqueTextArray(parsedValue.split(","));
  }

  return [];
};

const normalizeAttractions = (value) => {
  const parsedValue = parseMaybeJson(value);

  if (!parsedValue) return [];

  if (Array.isArray(parsedValue)) {
    return uniqueTextArray(
      parsedValue.map((item) => {
        if (typeof item === "string") return item;

        if (typeof item === "object") {
          return (
            item.name ||
            item.Name ||
            item.title ||
            item.Title ||
            item.AttractionName ||
            item.attractionName ||
            item.PlaceName ||
            item.placeName ||
            ""
          );
        }

        return "";
      }),
    );
  }

  if (typeof parsedValue === "object") {
    return uniqueTextArray(Object.values(parsedValue));
  }

  if (typeof parsedValue === "string") {
    return uniqueTextArray(parsedValue.split(","));
  }

  return [];
};

const getHotelFacilities = (payload = {}, hotel = {}) => {
  const rawHotel = hotel?.hotel_raw || hotel?.rawHotel || hotel;

  const directFacilities = getFirstNonEmptyArray(
    payload?.hotelFacilities,
    payload?.HotelFacilities,
    payload?.facilities,

    payload?.hotel?.HotelFacilities,
    payload?.hotel?.hotel_facilities,
    payload?.hotel?.facilities,
    payload?.hotel?.Facilities,

    hotel?.HotelFacilities,
    hotel?.hotel_facilities,
    hotel?.facilities,
    hotel?.Facilities,

    rawHotel?.HotelFacilities,
    rawHotel?.hotel_facilities,
    rawHotel?.facilities,
    rawHotel?.Facilities,

    rawHotel?.Response?.HotelResult?.[0]?.HotelFacilities,
    rawHotel?.HotelResult?.[0]?.HotelFacilities,
    rawHotel?.Response?.HotelDetails?.HotelFacilities,
    rawHotel?.HotelDetails?.HotelFacilities,
  );

  if (directFacilities.length > 0) {
    return normalizeFacilities(directFacilities);
  }

  const deepFacilities = findDeepValueByKeys(
    {
      payload,
      hotel,
      rawHotel,
    },
    ["HotelFacilities", "hotel_facilities", "Facilities", "facilities"],
  );

  return normalizeFacilities(deepFacilities);
};

const getHotelAttractions = (payload = {}, hotel = {}) => {
  const rawHotel = hotel?.hotel_raw || hotel?.rawHotel || hotel;

  const directAttractions =
    payload?.attractions ||
    payload?.Attractions ||
    payload?.hotel?.Attractions ||
    payload?.hotel?.attractions ||
    hotel?.Attractions ||
    hotel?.attractions ||
    rawHotel?.Attractions ||
    rawHotel?.attractions ||
    rawHotel?.Response?.HotelResult?.[0]?.Attractions ||
    rawHotel?.HotelResult?.[0]?.Attractions ||
    rawHotel?.Response?.HotelDetails?.Attractions ||
    rawHotel?.HotelDetails?.Attractions;

  const normalizedDirectAttractions = normalizeAttractions(directAttractions);

  if (normalizedDirectAttractions.length > 0) {
    return normalizedDirectAttractions;
  }

  const deepAttractions = findDeepValueByKeys(
    {
      payload,
      hotel,
      rawHotel,
    },
    ["Attractions", "attractions"],
  );

  return normalizeAttractions(deepAttractions);
};

const getFacilityIcon = (facility = "") => {
  const text = facility.toLowerCase();

  if (text.includes("wifi") || text.includes("internet")) return "📶";
  if (text.includes("parking") || text.includes("valet")) return "🅿️";
  if (text.includes("pool") || text.includes("swimming")) return "🏊";

  if (
    text.includes("spa") ||
    text.includes("massage") ||
    text.includes("sauna") ||
    text.includes("wellness")
  )
    return "💆";

  if (text.includes("fitness") || text.includes("gym") || text.includes("yoga"))
    return "🏋️";

  if (text.includes("airport") || text.includes("shuttle")) return "🚕";

  if (
    text.includes("restaurant") ||
    text.includes("breakfast") ||
    text.includes("bar") ||
    text.includes("coffee") ||
    text.includes("food") ||
    text.includes("meals")
  )
    return "🍽️";

  if (
    text.includes("business") ||
    text.includes("meeting") ||
    text.includes("conference") ||
    text.includes("banquet")
  )
    return "💼";

  if (text.includes("wheelchair") || text.includes("accessible")) return "♿";
  if (text.includes("laundry") || text.includes("dry cleaning")) return "🧺";

  if (
    text.includes("security") ||
    text.includes("cctv") ||
    text.includes("safe") ||
    text.includes("fire")
  )
    return "🛡️";

  if (text.includes("garden") || text.includes("terrace")) return "🌿";
  if (text.includes("room service") || text.includes("front desk")) return "🛎️";

  if (
    text.includes("beauty") ||
    text.includes("hair") ||
    text.includes("salon") ||
    text.includes("barber")
  )
    return "💇";

  if (
    text.includes("child") ||
    text.includes("kids") ||
    text.includes("babysitting")
  )
    return "👶";

  if (
    text.includes("currency") ||
    text.includes("atm") ||
    text.includes("cash")
  )
    return "💳";

  if (text.includes("smoking")) return "🚬";
  if (text.includes("housekeeping") || text.includes("cleaning")) return "🧹";

  return "✨";
};

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

  const hotelFacilities = useMemo(
    () => getHotelFacilities(payload, hotel),
    [payload, hotel],
  );

  const hotelAttractions = useMemo(
    () => getHotelAttractions(payload, hotel),
    [payload, hotel],
  );

  const availableRooms =
    hotel?.rooms ||
    hotel?.Rooms ||
    hotel?.hotel_raw?.Rooms ||
    hotel?.rawHotel?.Rooms ||
    hotel?.HotelResult?.[0]?.Rooms ||
    hotel?.raw?.HotelResult?.[0]?.Rooms ||
    hotel?.raw?.Response?.HotelResult?.[0]?.Rooms ||
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
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [showAllAttractions, setShowAllAttractions] = useState(false);
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

  const totalAmount = Number(room?.TotalFare || roomPrice + tax || 0);

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

  const visibleFacilities = showAllFacilities
    ? hotelFacilities
    : hotelFacilities.slice(0, 18);

  const visibleAttractions = showAllAttractions
    ? hotelAttractions
    : hotelAttractions.slice(0, 12);

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

    const finalHotel = {
      ...hotel,
      HotelFacilities: hotelFacilities,
      hotel_facilities: hotelFacilities,
      Attractions: hotelAttractions,
      attractions: hotelAttractions,
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
        hotel: finalHotel,
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
        hotelFacilities,
        attractions: hotelAttractions,
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

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="text-yellow-300 text-sm">
                ⭐ {hotel?.rating || hotel?.Rating || "4.2"}
              </span>

              {hotelFacilities.length > 0 && (
                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-300">
                  {hotelFacilities.length} facilities
                </span>
              )}

              {hotelAttractions.length > 0 && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                  {hotelAttractions.length} nearby places
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-gray-400">
              📅 {checkIn || "Check-in"} → {checkOut || "Check-out"} • 👤{" "}
              {totalGuests || 1} Guests
            </p>
          </div>

          {roomOptions.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-yellow-400/20 bg-[#15151C] shadow-xl shadow-black/30">
              <div className="relative overflow-hidden bg-linear-to-r from-[#fff7cc] via-[#e8e5ff] to-[#d8f5ff] px-4 py-5 text-black">
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-yellow-400/30 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />

                <div className="relative flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-600">
                        Select Room
                      </p>

                      <h2 className="mt-1 text-xl font-black text-[#111827]">
                        {getRoomCountTitle()}
                      </h2>
                    </div>

                    <div className="rounded-2xl bg-white/70 px-4 py-2 text-right shadow-sm ring-1 ring-black/5">
                      <p className="text-lg font-black text-[#111827]">
                        {filteredRoomOptions.length}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-500">
                        Available Rooms
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_170px]">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        🔍
                      </span>

                      <input
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        placeholder="Search room type..."
                        className="h-12 w-full rounded-2xl border border-white/70 bg-white/90 pl-10 pr-4 text-sm font-medium text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                      />
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-12 rounded-2xl border border-white/70 bg-white/90 px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                    >
                      <option value="price">Price Low to High</option>
                      <option value="priceHigh">Price High to Low</option>
                    </select>

                    <label className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 text-sm font-bold text-gray-900 shadow-sm">
                      <input
                        type="checkbox"
                        checked={splitRoom}
                        onChange={(e) => setSplitRoom(e.target.checked)}
                        className="h-4 w-4 accent-yellow-500"
                      />
                      Split Room
                    </label>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-800 bg-[#0B0B0F]">
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

                  const inclusions = roomItem.inclusion
                    ? roomItem.inclusion.split(",").filter(Boolean)
                    : [];

                  return (
                    <div
                      key={roomKey}
                      onClick={() => {
                        setActiveRoom(roomItem);
                        setSelectedRoom(roomItem);
                      }}
                      className={`group cursor-pointer px-4 py-4 transition ${
                        isSelected
                          ? "bg-linear-to-r from-yellow-400/20 via-yellow-300/10 to-transparent"
                          : "bg-[#0B0B0F] hover:bg-white/3"
                      }`}
                    >
                      <div
                        className={`rounded-3xl border p-4 transition ${
                          isSelected
                            ? "border-yellow-400/50 bg-yellow-400/10 shadow-lg shadow-yellow-400/10"
                            : "border-gray-800 bg-[#15151C] hover:border-yellow-400/25"
                        }`}
                      >
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.8fr_0.85fr_0.75fr] lg:items-start">
                          <div>
                            <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => {
                                    setActiveRoom(roomItem);
                                    setSelectedRoom(roomItem);
                                  }}
                                  className="h-5 w-5 accent-yellow-400"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-black leading-6 text-white">
                                    {roomItem.room_name ||
                                      roomItem.Name ||
                                      "Standard Room"}
                                  </h3>

                                  {isSelected && (
                                    <span className="rounded-full border border-yellow-400/30 bg-yellow-400/15 px-2.5 py-1 text-[11px] font-bold text-yellow-300">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                {/* 
                                <p className="mt-2 text-xs text-gray-500 break-all">
                                  Code:{" "}
                                  {roomItem.BookingCode ||
                                    roomItem.booking_code ||
                                    "N/A"}
                                </p> */}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDescriptions((prev) => ({
                                      ...prev,
                                      [roomKey]: !prev[roomKey],
                                    }));
                                  }}
                                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-300 transition hover:bg-blue-400 hover:text-black"
                                >
                                  {openDescriptions[roomKey]
                                    ? "Hide Room Description"
                                    : "Show Room Description"}
                                  <span>
                                    {openDescriptions[roomKey] ? "↑" : "↓"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {openDescriptions[roomKey] && (
                              <div className="mt-4 rounded-2xl border border-gray-800 bg-black/30 p-4 text-sm leading-6 text-gray-300 whitespace-pre-line">
                                {roomDesc}
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                              Inclusions
                            </p>

                            {inclusions.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {inclusions.map((item, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                                  >
                                    ✓ {item.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-semibold text-gray-300">
                                Room Only
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                              Cancellation
                            </p>

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
                                  className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1.5 text-xs font-bold text-purple-300 transition hover:bg-purple-400 hover:text-black"
                                >
                                  View Policies
                                  <span>
                                    {openPolicies[roomKey] ? "↑" : "↓"}
                                  </span>
                                </button>

                                {openPolicies[roomKey] && (
                                  <div className="mt-3 space-y-2 rounded-2xl border border-gray-800 bg-black/30 p-3 text-xs text-gray-300">
                                    {policies.map((policy, i) => (
                                      <div
                                        key={i}
                                        className="flex justify-between gap-3 rounded-xl border border-white/5 bg-white/3 px-3 py-2"
                                      >
                                        <span>
                                          From {policy.FromDate || "N/A"}
                                        </span>

                                        <span
                                          className={
                                            Number(
                                              policy.CancellationCharge || 0,
                                            ) === 0
                                              ? "font-bold text-green-300"
                                              : "font-bold text-red-300"
                                          }
                                        >
                                          {getCancellationText(
                                            policy,
                                            roomTotal,
                                          )}
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

                          <div className="rounded-3xl border border-yellow-400/20 bg-linear-to-br from-yellow-400/15 to-orange-400/10 p-4 text-right">
                            <p className="text-xs font-semibold text-gray-400">
                              Base Fare
                            </p>
                            <p className="text-lg font-black text-white">
                              ₹ {formatPrice(itemBasePrice)}
                            </p>

                            <p className="mt-2 text-xs font-semibold text-gray-400">
                              Taxes
                            </p>
                            <p className="text-sm font-bold text-gray-200">
                              ₹ {formatPrice(itemTax)}
                            </p>

                            <div className="my-3 border-t border-yellow-400/20" />

                            <p className="text-xs font-semibold text-yellow-300">
                              Total Price
                            </p>
                            <p className="text-2xl font-black text-yellow-300">
                              ₹ {formatPrice(roomTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredRoomOptions.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                      🔍
                    </div>

                    <p className="mt-3 text-base font-bold text-gray-300">
                      No rooms found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Try another room name or clear your search.
                    </p>
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

          {hotelFacilities.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-linear-to-br from-[#17171f] via-[#12121a] to-[#0B0B0F] p-5 shadow-xl shadow-black/30">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-400/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  {/* <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/80">
                    Amenities
                  </p> */}

                  <h2 className="mt-1 text-xl font-bold text-yellow-300">
                    Hotel Facilities
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Popular Facilities and services available at this property.
                  </p>
                </div>

                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-right">
                  <p className="text-xl font-bold text-yellow-300">
                    {hotelFacilities.length}
                  </p>
                  <p className="text-[11px] text-gray-400">Facilities</p>
                </div>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleFacilities.map((facility, index) => (
                  <div
                    key={`${facility}-${index}`}
                    className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 transition hover:-translate-y-0.5 hover:border-yellow-400/30 hover:bg-yellow-400/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30 text-lg ring-1 ring-white/10 group-hover:bg-yellow-400/20">
                      {getFacilityIcon(facility)}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-gray-200">
                        {facility}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {hotelFacilities.length > 18 && (
                <button
                  onClick={() => setShowAllFacilities(!showAllFacilities)}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-5 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                >
                  {showAllFacilities
                    ? "Show Less Facilities"
                    : `Show All ${hotelFacilities.length} Facilities`}
                  <span>{showAllFacilities ? "↑" : "↓"}</span>
                </button>
              )}
            </div>
          )}

          {hotelAttractions.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-linear-to-br from-[#151923] via-[#111820] to-[#0B0B0F] p-5 shadow-xl shadow-black/30">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                    Around the hotel
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-cyan-300">
                    Nearby Attractions
                  </h2>

                  <p className="mt-1 text-sm text-gray-400">
                    Important places and landmarks close to this hotel.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-right">
                  <p className="text-xl font-bold text-cyan-300">
                    {hotelAttractions.length}
                  </p>
                  <p className="text-[11px] text-gray-400">Places</p>
                </div>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleAttractions.map((attraction, index) => (
                  <div
                    key={`${attraction}-${index}`}
                    className="group flex items-center gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/6 px-4 py-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-400/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-200 ring-1 ring-cyan-300/20">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-cyan-100">
                        {attraction}
                      </p>
                    </div>

                    <span className="text-lg opacity-80 transition group-hover:scale-110">
                      📍
                    </span>
                  </div>
                ))}
              </div>

              {hotelAttractions.length > 12 && (
                <button
                  onClick={() => setShowAllAttractions(!showAllAttractions)}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  {showAllAttractions
                    ? "Show Less Attractions"
                    : `Show All ${hotelAttractions.length} Attractions`}
                  <span>{showAllAttractions ? "↑" : "↓"}</span>
                </button>
              )}
            </div>
          )}
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

          {hotelFacilities.length > 0 && (
            <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
              <p className="text-xs text-yellow-300 font-semibold">
                Facilities
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {hotelFacilities.length} amenities available
              </p>
            </div>
          )}

          {hotelAttractions.length > 0 && (
            <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
              <p className="text-xs text-cyan-300 font-semibold">
                Nearby Attractions
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {hotelAttractions.length} places nearby
              </p>
            </div>
          )}

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
