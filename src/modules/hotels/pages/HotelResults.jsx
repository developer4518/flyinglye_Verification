import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { useHotelStore } from "../../../store/hotelStore";

const FALLBACK_IMAGE = "https://api.flyinglyte.com/media/hotels/default.jpg";

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const getRoomName = (room = {}) => {
  if (room.room_name) return room.room_name;
  if (room.RoomTypeName) return room.RoomTypeName;

  const name = room.Name || room.name;

  if (Array.isArray(name)) return name[0] || "Standard Room";
  if (typeof name === "string") return name;

  return "Standard Room";
};

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const isValidImage = (url) => {
  if (!url || typeof url !== "string") return false;

  const cleanUrl = url.trim();

  return (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("/")
  );
};

const getImageUrl = (img) => {
  if (!img) return "";

  if (typeof img === "string") {
    return isValidImage(img) ? img.trim() : "";
  }

  if (typeof img === "object") {
    const url =
      img.url ||
      img.Url ||
      img.image ||
      img.Image ||
      img.ImageUrl ||
      img.ImageURL ||
      img.HotelPicture ||
      img.HotelPictureUrl ||
      img.HotelPictureURL ||
      img.ThumbImage ||
      img.MainImage ||
      img.path ||
      img.Path ||
      "";

    return isValidImage(url) ? url.trim() : "";
  }

  return "";
};

const getHotelImages = (hotel = {}, rawHotel = {}) => {
  const directImages = [
    hotel.image,
    hotel.Image,
    hotel.hotel_image,
    hotel.HotelImage,
    hotel.HotelPicture,
    hotel.HotelPictureUrl,
    hotel.HotelPictureURL,
    hotel.ThumbImage,
    hotel.thumbnail,
    hotel.Thumbnail,
    hotel.MainImage,
    hotel.main_image,

    rawHotel.image,
    rawHotel.Image,
    rawHotel.hotel_image,
    rawHotel.HotelImage,
    rawHotel.HotelPicture,
    rawHotel.HotelPictureUrl,
    rawHotel.HotelPictureURL,
    rawHotel.ThumbImage,
    rawHotel.thumbnail,
    rawHotel.Thumbnail,
    rawHotel.MainImage,
    rawHotel.main_image,
  ]
    .map(getImageUrl)
    .filter(Boolean);

  const imageArrays = [
    hotel.images,
    hotel.Images,
    hotel.HotelImages,
    hotel.HotelPictures,
    hotel.hotel_images,
    hotel.Pictures,
    hotel.Gallery,

    rawHotel.images,
    rawHotel.Images,
    rawHotel.HotelImages,
    rawHotel.HotelPictures,
    rawHotel.hotel_images,
    rawHotel.Pictures,
    rawHotel.Gallery,
  ];

  const arrayImages = imageArrays
    .flatMap((arr) => (Array.isArray(arr) ? arr : []))
    .map(getImageUrl)
    .filter(Boolean);

  const finalImages = Array.from(
    new Set([...directImages, ...arrayImages]),
  ).filter(Boolean);

  return {
    image: finalImages[0] || FALLBACK_IMAGE,
    images: finalImages.length > 0 ? finalImages : [FALLBACK_IMAGE],
    has_image: finalImages.length > 0,
  };
};

const normalizeRoom = (room = {}, index = 0) => {
  const rawRoom = room.room_raw || room;

  const bookingCode =
    room.booking_code || room.BookingCode || rawRoom?.BookingCode || null;

  const price = Number(
    room.price ?? room.TotalFare ?? room.MinPrice ?? rawRoom?.TotalFare ?? 0,
  );

  const tax = Number(
    room.tax ?? room.TotalTax ?? room.Price?.Tax ?? rawRoom?.TotalTax ?? 0,
  );

  return {
    id: `${bookingCode || index}`,
    room_name: getRoomName(room),

    price: Number.isFinite(price) ? price : 0,
    tax: Number.isFinite(tax) ? tax : 0,

    published_price:
      room.published_price ??
      room.PublishedPrice ??
      room.Price?.PublishedPrice ??
      rawRoom?.PublishedPrice ??
      null,

    offered_price:
      room.offered_price ??
      room.OfferedPrice ??
      room.Price?.OfferedPrice ??
      rawRoom?.OfferedPrice ??
      null,

    currency: room.currency || room.Currency || rawRoom?.Currency || "INR",

    meal:
      room.meal ||
      room.MealType ||
      room.MealPlan ||
      rawRoom?.MealType ||
      rawRoom?.MealPlan ||
      "",

    refundable:
      room.refundable ?? room.IsRefundable ?? rawRoom?.IsRefundable ?? false,

    inclusion: room.inclusion || room.Inclusion || rawRoom?.Inclusion || "",

    room_promotion:
      room.room_promotion || room.RoomPromotion || rawRoom?.RoomPromotion || [],

    cancel_policies:
      room.cancel_policies ||
      room.CancelPolicies ||
      rawRoom?.CancelPolicies ||
      [],

    rate_conditions:
      room.rate_conditions ||
      room.RateConditions ||
      rawRoom?.RateConditions ||
      [],

    supplements:
      room.supplements || room.Supplements || rawRoom?.Supplements || [],

    amenities: room.amenities || room.Amenities || rawRoom?.Amenities || [],

    booking_code: bookingCode,
    BookingCode: bookingCode,

    room_raw: rawRoom,
  };
};

const normalizeHotel = (hotel = {}) => {
  const rawHotel = hotel.rawHotel || hotel.hotel_raw || hotel;

  const rooms = getFirstArray(
    hotel.rooms,
    hotel.Rooms,
    hotel.hotel_raw?.Rooms,
    hotel.rawHotel?.Rooms,
    rawHotel?.Rooms,
    hotel.HotelRooms,
  ).map(normalizeRoom);

  const fallbackRoom = normalizeRoom(
    {
      BookingCode:
        hotel.booking_code || hotel.BookingCode || rawHotel?.BookingCode || "",
      Name:
        hotel.room ||
        hotel.RoomTypeName ||
        rawHotel?.RoomTypeName ||
        "Standard Room",
      TotalFare:
        hotel.price || hotel.Price?.PublishedPrice || hotel.MinPrice || 0,
      TotalTax: hotel.tax || hotel.Price?.Tax || 0,
      MealType: hotel.meal || hotel.MealType || "",
      IsRefundable: hotel.refundable ?? hotel.IsRefundable ?? false,
      Inclusion: hotel.inclusion || hotel.Inclusion || "",
    },
    0,
  );

  const cheapestRoom =
    rooms.length > 0
      ? [...rooms].sort((a, b) => Number(a.price) - Number(b.price))[0]
      : fallbackRoom;

  const hotelImages = getHotelImages(hotel, rawHotel);

  return {
    hotel_code:
      hotel.hotel_code ||
      hotel.HotelCode ||
      rawHotel?.HotelCode ||
      hotel.code ||
      "",

    HotelCode:
      hotel.hotel_code ||
      hotel.HotelCode ||
      rawHotel?.HotelCode ||
      hotel.code ||
      "",

    hotel_name:
      hotel.hotel_name ||
      hotel.HotelName ||
      rawHotel?.HotelName ||
      hotel.name ||
      "Hotel",

    HotelName:
      hotel.hotel_name ||
      hotel.HotelName ||
      rawHotel?.HotelName ||
      hotel.name ||
      "Hotel",

    ...hotelImages,

    rating: Number(
      hotel.rating ||
        hotel.StarRating ||
        rawHotel?.StarRating ||
        hotel.star_rating ||
        4,
    ),

    rooms,
    room_count: Number(hotel.room_count || rooms.length || 0),
    raw_room_count: Number(hotel.raw_room_count || rooms.length || 0),

    api_child_ages: Array.isArray(hotel.child_ages)
      ? hotel.child_ages
      : Array.isArray(rawHotel?.child_ages)
        ? rawHotel.child_ages
        : [],

    pax_rooms: Array.isArray(hotel.pax_rooms)
      ? hotel.pax_rooms
      : Array.isArray(rawHotel?.pax_rooms)
        ? rawHotel.pax_rooms
        : [],

    selected_room: cheapestRoom,

    price: cheapestRoom?.price || 0,
    tax: cheapestRoom?.tax || 0,
    meal: cheapestRoom?.meal || "",
    refundable: cheapestRoom?.refundable || false,
    inclusion: cheapestRoom?.inclusion || "",
    booking_code: cheapestRoom?.booking_code || null,
    BookingCode: cheapestRoom?.booking_code || null,

    currency:
      hotel.currency ||
      hotel.Currency ||
      rawHotel?.Currency ||
      cheapestRoom?.currency ||
      "INR",

    rawHotel,
    hotel_raw: rawHotel,
  };
};

const getRoomBadges = (room) => {
  if (!room) return [];

  const badges = [];

  if (room.meal) {
    badges.push({
      label: String(room.meal).replaceAll("_", " "),
      className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    });
  }

  badges.push({
    label: room.refundable ? "Refundable" : "Non-refundable",
    className: room.refundable
      ? "bg-green-500/10 text-green-300 border-green-500/20"
      : "bg-red-500/10 text-red-300 border-red-500/20",
  });

  if (room.inclusion) {
    badges.push({
      label: room.inclusion,
      className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    });
  }

  if (Array.isArray(room.cancel_policies) && room.cancel_policies.length > 0) {
    badges.push({
      label: "Cancellation policy",
      className: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    });
  }

  if (Array.isArray(room.rate_conditions) && room.rate_conditions.length > 0) {
    badges.push({
      label: "Rate conditions",
      className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    });
  }

  if (Array.isArray(room.room_promotion) && room.room_promotion.length > 0) {
    badges.push({
      label: "Promotion",
      className: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    });
  }

  return badges;
};

const HotelResults = () => {
  const navigate = useNavigate();

  const { hotels, search, setSelectedHotel, setSelectedRoom, selectHotelRoom } =
    useHotelStore();

  const { city, cityName, checkIn, checkOut, guests } = search || {};

  const displayCity = cityName || city || "Destination";

  const totalGuests =
    Number(guests?.adults || 0) + Number(guests?.children || 0);

  const childAges = Array.isArray(guests?.childAges) ? guests.childAges : [];

  const hotelList = useMemo(() => {
    let list = [];

    if (Array.isArray(hotels)) list = hotels;
    else if (Array.isArray(hotels?.HotelResult)) list = hotels.HotelResult;
    else if (Array.isArray(hotels?.results)) list = hotels.results;
    else if (Array.isArray(hotels?.data)) list = hotels.data;

    return list.map(normalizeHotel);
  }, [hotels]);

  const [sort, setSort] = useState("price");
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [minRating, setMinRating] = useState(0);
  const [onlyRefundable, setOnlyRefundable] = useState(false);
  const [mealType, setMealType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredHotels = useMemo(() => {
    const filtered = hotelList.filter((hotel) => {
      const room = hotel.selected_room;
      const meal = String(room?.meal || hotel.meal || "").toLowerCase();

      return (
        Number(hotel.price || 0) <= Number(priceRange[1]) &&
        Number(hotel.rating || 0) >= Number(minRating || 0) &&
        (!onlyRefundable || Boolean(room?.refundable || hotel.refundable)) &&
        (mealType === "all" || meal.includes(mealType.toLowerCase()))
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "price") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sort === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      return 0;
    });
  }, [hotelList, sort, priceRange, minRating, onlyRefundable, mealType]);

  const handleView = useCallback(
    (hotel, room) => {
      const selectedRoom = room || hotel.selected_room || hotel.rooms?.[0];

      if (!selectedRoom) {
        alert("Room data not available for this hotel");
        return;
      }

      const bookingCode =
        selectedRoom.booking_code ||
        selectedRoom.BookingCode ||
        selectedRoom.room_raw?.BookingCode ||
        hotel.booking_code ||
        hotel.BookingCode;

      if (!bookingCode) {
        alert("Booking code not available for this room");
        return;
      }

      const finalRoom = {
        ...selectedRoom,
        booking_code: bookingCode,
        BookingCode: bookingCode,
        Name:
          selectedRoom.room_name ||
          selectedRoom.Name ||
          selectedRoom.RoomTypeName ||
          selectedRoom.room_raw?.Name?.[0] ||
          "Standard Room",
        room_raw: selectedRoom.room_raw || selectedRoom,
      };

      const finalHotel = {
        ...hotel,
        image: hotel.image || hotel.images?.[0] || FALLBACK_IMAGE,
        images:
          Array.isArray(hotel.images) && hotel.images.length > 0
            ? hotel.images
            : [hotel.image || FALLBACK_IMAGE],
        selected_room: finalRoom,
        booking_code: bookingCode,
        BookingCode: bookingCode,
        hotel_raw: hotel.hotel_raw || hotel.rawHotel || hotel,
        rawHotel: hotel.rawHotel || hotel.hotel_raw || hotel,
      };

      if (typeof selectHotelRoom === "function") {
        selectHotelRoom(finalHotel, finalRoom);
      } else {
        setSelectedHotel(finalHotel);
        setSelectedRoom(finalRoom);
      }

      const safeRoomGuests = Array.isArray(search?.guests?.roomGuests)
        ? search.guests.roomGuests.map((room, index) => {
            const children = Number(room.Children ?? room.children ?? 0);

            const ages =
              room.ChildrenAges || room.ChildAges || room.childAges || [];

            const cleanAges = ages
              .slice(0, children)
              .map((age) => Number(age))
              .filter((age) => age >= 1 && age <= 12);

            return {
              roomIndex: room.roomIndex ?? room.RoomIndex ?? index + 1,
              RoomIndex: room.RoomIndex ?? room.roomIndex ?? index + 1,
              adults: Number(room.adults ?? room.Adults ?? 1),
              Adults: Number(room.Adults ?? room.adults ?? 1),
              children,
              Children: children,
              childAges: cleanAges,
              ChildAges: cleanAges,
              ChildrenAges: cleanAges,
            };
          })
        : [];

      const safeChildAges = safeRoomGuests.flatMap((room) => room.ChildrenAges);

      navigate(`/hotels/${hotel.hotel_code || hotel.HotelCode}`, {
        state: {
          hotel: finalHotel,
          room: finalRoom,
          checkIn,
          checkOut,
          guests: {
            ...guests,
            childAges: safeChildAges,
            roomGuests: safeRoomGuests,
          },

          childAges: safeChildAges,
          roomGuests: safeRoomGuests,

          bookingCode,
          cancellationPolicies: finalRoom.cancel_policies || [],
          rateConditions: finalRoom.rate_conditions || [],
          supplements: finalRoom.supplements || [],
          amenities: finalRoom.amenities || [],
          inclusions: finalRoom.inclusion || "",
          roomPromotions: finalRoom.room_promotion || [],
          mealType: finalRoom.meal || "",
          refundable: finalRoom.refundable,
          exactPrice: {
            price: finalRoom.price || 0,
            tax: finalRoom.tax || 0,
            total: Number(finalRoom.price || 0) + Number(finalRoom.tax || 0),
            currency: finalRoom.currency || hotel.currency || "INR",
          },
        },
      });
    },
    [
      navigate,
      selectHotelRoom,
      setSelectedHotel,
      setSelectedRoom,
      checkIn,
      checkOut,
      guests,
      search,
    ],
  );

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20 md:pb-0 pt-20">
      <div className="sticky top-0 z-40 bg-[#0B0B0F]/95 backdrop-blur border-b border-gray-800 px-4 md:px-10 py-10 md:py-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300">
              Hotel Search Results
            </p>

            <h1 className="mt-1 text-xl md:text-3xl font-bold text-yellow-400">
              Hotels in {displayCity}
            </h1>

            <p className="text-xs md:text-sm text-gray-400 mt-1">
              {checkIn || "Check-in"} → {checkOut || "Check-out"} •{" "}
              {totalGuests || 1} Guest{totalGuests > 1 ? "s" : ""} •{" "}
              {guests?.rooms || 1} Room
              {Number(guests?.rooms || 1) > 1 ? "s" : ""}
            </p>

            {childAges.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Child age{childAges.length > 1 ? "s" : ""}:{" "}
                {childAges.join(", ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">
              All Hotel Feed
            </span>

            <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
              INR Exact Price
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="hidden md:block bg-[#15151C] p-5 rounded-2xl sticky top-28 border border-gray-800 h-fit">
          <FiltersUI
            sort={sort}
            setSort={setSort}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            minRating={minRating}
            setMinRating={setMinRating}
            onlyRefundable={onlyRefundable}
            setOnlyRefundable={setOnlyRefundable}
            mealType={mealType}
            setMealType={setMealType}
          />
        </div>

        <div className="md:col-span-3 space-y-5">
          {filteredHotels.length === 0 ? (
            <div className="bg-[#15151C] p-10 rounded-2xl text-center border border-gray-800">
              <p className="text-lg text-gray-300">No hotels found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try changing price, rating or refundable filters.
              </p>
            </div>
          ) : (
            filteredHotels.map((hotel, index) => {
              const defaultRoom = hotel.selected_room || hotel.rooms?.[0];
              const hotelImage =
                hotel.image ||
                hotel.images?.[0] ||
                hotel.rawHotel?.image ||
                hotel.rawHotel?.images?.[0] ||
                FALLBACK_IMAGE;

              return (
                <div
                  key={`${hotel.hotel_code || hotel.HotelCode || index}-${index}`}
                  className="group bg-[#15151C] rounded-2xl border border-gray-800 hover:border-yellow-400/40 transition overflow-hidden shadow-lg shadow-black/20"
                >
                  <div className="flex flex-col lg:flex-row">
                    <div className="relative w-full lg:w-60 h-44 sm:h-48 lg:h-52 shrink-0 bg-[#0B0B0F]">
                      <img
                        src={hotelImage}
                        alt={hotel.hotel_name || "Hotel"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />

                      {hotel.has_image && (
                        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full border border-white/10">
                          Real Image
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                        ⭐ {hotel.rating || 4}
                      </div>
                    </div>

                    <div className="flex-1 p-4">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="text-base md:text-lg font-semibold text-yellow-300 line-clamp-2">
                            {hotel.hotel_name || "Hotel"}
                          </h2>

                          <p className="text-xs text-gray-400 mt-1 wrap-break-word line-clamp-2">
                            🛏{" "}
                            {defaultRoom?.room_name ||
                              hotel.room ||
                              "Standard Room"}
                          </p>

                          {defaultRoom?.inclusion && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {defaultRoom.inclusion
                                .split(",")
                                .filter(Boolean)
                                .map((item, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded-full text-[11px]
          bg-emerald-500/10 border border-emerald-500/20
          text-emerald-300"
                                  >
                                    ✓ {item.trim()}
                                  </span>
                                ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-3">
                            {getRoomBadges(defaultRoom)
                              .slice(0, 3)
                              .map((badge, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-2 py-1 rounded-full border ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="xl:text-right shrink-0">
                          <p className="text-xs text-gray-500">Starting from</p>

                          <p className="text-xl md:text-2xl font-bold text-yellow-400">
                            ₹ {formatPrice(hotel.price)}
                          </p>

                          <p className="text-xs text-gray-400">
                            inclusive of all taxes
                          </p>

                          <button
                            onClick={() => handleView(hotel, defaultRoom)}
                            disabled={
                              !(
                                defaultRoom?.booking_code ||
                                defaultRoom?.BookingCode ||
                                defaultRoom?.room_raw?.BookingCode ||
                                hotel.booking_code ||
                                hotel.BookingCode
                              )
                            }
                            className="mt-3 px-4 py-2 rounded-lg bg-linear-to-r from-yellow-400 to-orange-400 text-black text-xs md:text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#15151C] border-t border-gray-800 flex z-40">
        <button
          onClick={() => setShowFilters(true)}
          className="flex-1 py-3 text-sm border-r border-gray-800"
        >
          Filters
        </button>

        <button
          onClick={() => setSort(sort === "price" ? "rating" : "price")}
          className="flex-1 py-3 text-sm"
        >
          Sort: {sort === "price" ? "Price" : "Rating"}
        </button>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-[#15151C] border-t border-gray-800 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-yellow-300">Filters</h3>

              <button
                onClick={() => setShowFilters(false)}
                className="w-9 h-9 rounded-full bg-[#0B0B0F] border border-gray-800"
              >
                ✕
              </button>
            </div>

            <FiltersUI
              sort={sort}
              setSort={setSort}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              minRating={minRating}
              setMinRating={setMinRating}
              onlyRefundable={onlyRefundable}
              setOnlyRefundable={setOnlyRefundable}
              mealType={mealType}
              setMealType={setMealType}
            />

            <button
              onClick={() => setShowFilters(false)}
              className="w-full mt-5 py-3 rounded-xl bg-yellow-400 text-black font-bold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FiltersUI = ({
  sort,
  setSort,
  priceRange,
  setPriceRange,
  minRating,
  setMinRating,
  onlyRefundable,
  setOnlyRefundable,
  mealType,
  setMealType,
}) => (
  <div className="space-y-5">
    <div>
      <label className="text-sm text-gray-400">Sort</label>

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="w-full mt-1 p-2 rounded-xl bg-[#0B0B0F] border border-gray-800 outline-none"
      >
        <option value="price">Price: Low to High</option>
        <option value="rating">Rating: High to Low</option>
      </select>
    </div>

    <div>
      <label className="text-sm text-gray-400">
        Max ₹{formatPrice(priceRange[1])}
      </label>

      <input
        type="range"
        min="0"
        max="200000"
        step="500"
        value={priceRange[1]}
        onChange={(e) => setPriceRange([0, Number(e.target.value)])}
        className="w-full mt-2"
      />
    </div>

    <div>
      <label className="text-sm text-gray-400">Rating</label>

      <select
        value={minRating}
        onChange={(e) => setMinRating(Number(e.target.value))}
        className="w-full mt-1 p-2 rounded-xl bg-[#0B0B0F] border border-gray-800 outline-none"
      >
        <option value="0">All</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5 only</option>
      </select>
    </div>

    <div>
      <label className="text-sm text-gray-400">Meal Type</label>

      <select
        value={mealType}
        onChange={(e) => setMealType(e.target.value)}
        className="w-full mt-1 p-2 rounded-xl bg-[#0B0B0F] border border-gray-800 outline-none"
      >
        <option value="all">All</option>
        <option value="room_only">Room Only</option>
        <option value="breakfast">Breakfast</option>
        <option value="half_board">Half Board</option>
        <option value="full_board">Full Board</option>
      </select>
    </div>

    <label className="flex gap-3 items-center text-sm text-gray-300 cursor-pointer">
      <input
        type="checkbox"
        checked={onlyRefundable}
        onChange={() => setOnlyRefundable(!onlyRefundable)}
      />
      Refundable only
    </label>
  </div>
);

export default HotelResults;
