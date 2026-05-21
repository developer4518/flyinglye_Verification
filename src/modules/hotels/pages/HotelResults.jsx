import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { useHotelStore } from "../../../store/hotelStore";

const HotelResults = () => {
  const navigate = useNavigate();
  const { hotels, search, setSelectedHotel, setSelectedRoom } = useHotelStore();

  const { city, cityName, checkIn, checkOut, guests } = search || {};

  const displayCity = cityName || city || "Destination";

  /* ================= NORMALIZE ================= */
  const hotelList = useMemo(() => {
    let list = [];

    if (Array.isArray(hotels)) list = hotels;
    else if (Array.isArray(hotels?.HotelResult)) list = hotels.HotelResult;
    else if (Array.isArray(hotels?.results)) list = hotels.results;
    else if (Array.isArray(hotels?.data)) list = hotels.data;

    return list.map((h) => ({
      hotel_code: h.hotel_code || h.HotelCode,
      hotel_name: h.hotel_name || h.HotelName,
      image: h.image || h.HotelPicture,
      rating: h.rating || h.StarRating || 4,
      room: h.room || h.RoomTypeName,
      meal: h.meal || h.MealType,
      refundable: h.refundable ?? h.IsRefundable,
      price: h.price || h.Price?.PublishedPrice || h.MinPrice || 0,
      tax: h.tax || h.Price?.Tax || 0,
      BookingCode: h.booking_code || h.BookingCode || h.Rooms?.[0]?.BookingCode,
      rawHotel: h,
    }));
  }, [hotels]);

  /* ================= FILTER ================= */
  const [sort, setSort] = useState("price");
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [minRating, setMinRating] = useState(0);
  const [onlyRefundable, setOnlyRefundable] = useState(false);
  const [mealType, setMealType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredHotels = useMemo(() => {
    let filtered = hotelList.filter((hotel) => {
      return (
        hotel.price <= priceRange[1] &&
        hotel.rating >= minRating &&
        (!onlyRefundable || hotel.refundable) &&
        (mealType === "all" ||
          (hotel.meal || "").toLowerCase().includes(mealType))
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [hotelList, sort, priceRange, minRating, onlyRefundable, mealType]);

  /* ================= VIEW ================= */
  const handleView = useCallback(
    (hotel) => {
      const selectedRoom = {
        BookingCode: hotel.BookingCode,
        Name: hotel.room,
      };

      setSelectedHotel({
        ...hotel.rawHotel,
        bookingCode: hotel.BookingCode,
      });

      setSelectedRoom(selectedRoom);

      navigate(`/hotels/${hotel.hotel_code}`, {
        state: {
          hotel: hotel.rawHotel,
          room: selectedRoom,
          checkIn,
          checkOut,
          guests,
        },
      });
    },
    [navigate, setSelectedHotel, setSelectedRoom, checkIn, checkOut, guests],
  );

  const totalGuests = (guests?.adults || 0) + (guests?.children || 0);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      {/* ================= HEADER ================= */}
      <div className="sticky top-0 z-40 bg-[#0B0B0F]/90 backdrop-blur border-b border-gray-800 px-4 md:px-10 py-24">
        <h1 className="text-xl md:text-2xl font-bold text-yellow-400">
          Hotels in {displayCity}
        </h1>
        <p className="text-xs md:text-sm text-gray-400 mt-1">
          {checkIn} → {checkOut} • {totalGuests} Guests
        </p>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="px-4 md:px-10 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* ================= FILTERS ================= */}
        <div className="hidden md:block bg-[#15151C] p-5 rounded-2xl sticky top-24 border border-gray-800 h-fit">
          <FiltersUI
            {...{
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
            }}
          />
        </div>

        {/* ================= HOTEL LIST ================= */}
        <div className="md:col-span-3 space-y-5">
          {filteredHotels.length === 0 ? (
            <div className="bg-[#15151C] p-10 rounded-2xl text-center border border-gray-800">
              <p className="text-lg text-gray-300">No hotels found</p>
            </div>
          ) : (
            filteredHotels.map((hotel, index) => (
              <div
                key={index}
                className="group bg-[#15151C] rounded-2xl border border-gray-800 hover:border-yellow-400/40 transition"
              >
                <div className="flex flex-col md:flex-row">
                  {/* IMAGE */}
                  <div className="relative md:w-70 h-52 md:h-auto">
                    <img
                      src={hotel.image || "https://via.placeholder.com/300"}
                      className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
                    />

                    <div className="absolute top-3 left-3 bg-yellow-400 text-black text-xs px-2 py-1 rounded">
                      ⭐ {hotel.rating}
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-yellow-300">
                        {hotel.hotel_name}
                      </h2>

                      <p className="text-xs text-gray-400 mt-1">
                        🛏 {hotel.room || "Standard Room"}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {hotel.meal && (
                          <span className="text-[10px] px-2 py-1 bg-gray-800 rounded-full">
                            🍽 {hotel.meal}
                          </span>
                        )}

                        {hotel.refundable && (
                          <span className="text-[10px] px-2 py-1 bg-green-600/20 text-green-400 rounded-full">
                            Refundable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PRICE */}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <p className="text-xl font-bold text-yellow-400">
                          ₹ {hotel.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          + ₹ {hotel.tax.toLocaleString()} taxes
                        </p>
                      </div>

                      <button
                        onClick={() => handleView(hotel)}
                        disabled={!hotel.BookingCode}
                        className="px-4 py-2 rounded-lg bg-linear-to-r from-yellow-400 to-orange-400 text-black text-sm font-semibold hover:scale-105 transition"
                      >
                        View →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= MOBILE FILTER ================= */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#15151C] border-t border-gray-800 flex">
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
          Sort
        </button>
      </div>
    </div>
  );
};

/* ================= FILTER UI ================= */
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
        className="w-full mt-1 p-2 rounded bg-[#0B0B0F]"
      >
        <option value="price">Price</option>
        <option value="rating">Rating</option>
      </select>
    </div>

    <div>
      <label className="text-sm text-gray-400">Max ₹{priceRange[1]}</label>
      <input
        type="range"
        min="0"
        max="20000"
        value={priceRange[1]}
        onChange={(e) => setPriceRange([0, Number(e.target.value)])}
        className="w-full"
      />
    </div>

    <div>
      <label className="text-sm text-gray-400">Rating</label>
      <select
        value={minRating}
        onChange={(e) => setMinRating(Number(e.target.value))}
        className="w-full mt-1 p-2 rounded bg-[#0B0B0F]"
      >
        <option value="0">All</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </select>
    </div>

    <div className="flex gap-2 items-center">
      <input
        type="checkbox"
        checked={onlyRefundable}
        onChange={() => setOnlyRefundable(!onlyRefundable)}
      />
      <label>Refundable</label>
    </div>
  </div>
);

export default HotelResults;
