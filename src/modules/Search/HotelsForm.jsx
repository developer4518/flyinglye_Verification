"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../services/api";
import { cityData } from "../hotels/HotelData";
import { countryData } from "../hotels/CountryData";
import { useHotelStore } from "../../store/hotelStore";

const MAX_ROOMS = 6;
const MAX_ADULTS_PER_ROOM = 8;
const MAX_CHILDREN_PER_ROOM = 4;
const MIN_CHILD_AGE = 1;
const MAX_CHILD_AGE = 12;
const HOTEL_CODES_PER_REQUEST = 100;
const RESPONSE_TIME_SECONDS = 23;

const INDIA_NATIONALITY = {
  Code: "IN",
  Name: "India",
};

const INDIA_KEYWORDS = ["india", "in", "ind"];

const INTERNATIONAL_DESTINATION_KEYWORDS = [
  "dubai",
  "abu dhabi",
  "sharjah",
  "ras al khaimah",
  "ajman",
  "uae",
  "united arab emirates",
  "singapore",
  "bangkok",
  "phuket",
  "pattaya",
  "krabi",
  "thailand",
  "bali",
  "indonesia",
  "kuala lumpur",
  "malaysia",
  "maldives",
  "vietnam",
  "sri lanka",
  "london",
  "united kingdom",
  "uk",
  "paris",
  "france",
  "rome",
  "milan",
  "italy",
  "zurich",
  "switzerland",
  "new york",
  "usa",
  "united states",
  "australia",
];

const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const getCityName = (city = {}) =>
  city.name ||
  city.Name ||
  city.CityName ||
  city.cityName ||
  city.DestinationName ||
  "";

const getCityCode = (city = {}) =>
  city.code || city.Code || city.CityId || city.cityId || city.CityCode || "";

const getCityCountry = (city = {}) =>
  city.country ||
  city.Country ||
  city.countryName ||
  city.CountryName ||
  city.CountryCode ||
  city.countryCode ||
  "";

const isIndiaCountry = (country = "") => {
  const value = normalizeText(country);
  if (!value) return false;

  return INDIA_KEYWORDS.some((keyword) => value === keyword);
};

const isInternationalDestination = (cityName = "", countryName = "") => {
  const country = normalizeText(countryName);
  const city = normalizeText(cityName);

  if (country) {
    return !isIndiaCountry(country);
  }

  return INTERNATIONAL_DESTINATION_KEYWORDS.some((keyword) =>
    city.includes(keyword),
  );
};

const createRoom = () => ({
  adults: 1,
  children: 0,
  childAges: [],
});

const getInitialRooms = (search) => {
  if (
    Array.isArray(search?.guests?.roomGuests) &&
    search.guests.roomGuests.length
  ) {
    return search.guests.roomGuests.map((room) => {
      const ages = room.childAges || room.ChildAges || room.ChildrenAges || [];

      return {
        adults: Number(room.adults || room.Adults || 1),
        children: Number(room.children || room.Children || 0),
        childAges: Array.isArray(ages) ? ages.map(Number) : [],
      };
    });
  }

  const roomCount = Number(search?.guests?.rooms || 1);
  const totalAdults = Number(search?.guests?.adults || 1);
  const totalChildren = Number(search?.guests?.children || 0);
  const savedChildAges = Array.isArray(search?.guests?.childAges)
    ? search.guests.childAges
    : [];

  return Array.from({ length: roomCount }, (_, index) => {
    if (index === 0) {
      return {
        adults: totalAdults,
        children: totalChildren,
        childAges: savedChildAges.map(Number),
      };
    }

    return createRoom();
  });
};

const HotelsForm = () => {
  const navigate = useNavigate();

  const { search, setHotels, setSearch, setLoading, setError, resetFlow } =
    useHotelStore();

  const today = new Date().toLocaleDateString("en-CA");

  const [loading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [cityInput, setCityInput] = useState(search?.cityName || "");
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [nationalityInput, setNationalityInput] = useState(
    search?.nationalityName || INDIA_NATIONALITY.Name,
  );
  const [nationalitySuggestions, setNationalitySuggestions] = useState([]);
  const [guestOpen, setGuestOpen] = useState(false);

  const cityRef = useRef(null);
  const nationalityRef = useRef(null);
  const guestRef = useRef(null);

  const [formData, setFormData] = useState({
    city: search?.city || "",
    cityName: search?.cityName || "",
    cityCountry: search?.cityCountry || "",
    nationality: search?.nationality || INDIA_NATIONALITY.Code,
    nationalityName: search?.nationalityName || INDIA_NATIONALITY.Name,
    checkIn: search?.checkIn || "",
    checkOut: search?.checkOut || "",
  });

  const [rooms, setRooms] = useState(() => getInitialRooms(search));

  const isInternationalHotelSearch = useMemo(() => {
    return isInternationalDestination(
      formData.cityName || cityInput,
      formData.cityCountry,
    );
  }, [formData.cityName, formData.cityCountry, cityInput]);

  const guests = useMemo(() => {
    const adults = rooms.reduce(
      (sum, room) => sum + Number(room.adults || 0),
      0,
    );

    const children = rooms.reduce(
      (sum, room) => sum + Number(room.children || 0),
      0,
    );

    const childAges = rooms.flatMap((room) =>
      (room.childAges || [])
        .slice(0, Number(room.children || 0))
        .map((age) => Number(age)),
    );

    const roomGuests = rooms.map((room, index) => ({
      roomIndex: index + 1,
      adults: Number(room.adults || 1),
      children: Number(room.children || 0),
      childAges: (room.childAges || [])
        .slice(0, Number(room.children || 0))
        .map((age) => Number(age)),
    }));

    return {
      adults,
      children,
      rooms: rooms.length,
      childAges,
      roomGuests,
    };
  }, [rooms]);

  const totalGuests = guests.adults + guests.children;

  useEffect(() => {
    const handleClick = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setCitySuggestions([]);
      }

      if (
        nationalityRef.current &&
        !nationalityRef.current.contains(e.target)
      ) {
        setNationalitySuggestions([]);
      }

      if (guestRef.current && !guestRef.current.contains(e.target)) {
        setGuestOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isInternationalHotelSearch) return;

    setFormData((prev) => ({
      ...prev,
      nationality: INDIA_NATIONALITY.Code,
      nationalityName: INDIA_NATIONALITY.Name,
    }));

    setNationalityInput(INDIA_NATIONALITY.Name);
    setNationalitySuggestions([]);
  }, [isInternationalHotelSearch]);

  useEffect(() => {
    const finalNationality = isInternationalHotelSearch
      ? INDIA_NATIONALITY.Code
      : formData.nationality;

    const finalNationalityName = isInternationalHotelSearch
      ? INDIA_NATIONALITY.Name
      : formData.nationalityName;

    setSearch({
      ...formData,
      nationality: finalNationality,
      nationalityName: finalNationalityName,
      guests,
      currency: "INR",
      responseTime: RESPONSE_TIME_SECONDS,
      parallelSearch: true,
      hotelCodesPerRequest: HOTEL_CODES_PER_REQUEST,
      isInternationalHotelSearch,
    });
  }, [formData, guests, setSearch, isInternationalHotelSearch]);

  const searchCities = (query) => {
    if (!query) return [];

    const q = normalizeText(query);

    return cityData.cities
      .filter((city) => {
        const name = normalizeText(getCityName(city));
        const code = normalizeText(getCityCode(city));
        const country = normalizeText(getCityCountry(city));

        return name.includes(q) || code.includes(q) || country.includes(q);
      })
      .slice(0, 10);
  };

  const searchNationalities = (query) => {
    if (!query) return [];

    if (isInternationalHotelSearch) {
      return [INDIA_NATIONALITY];
    }

    const q = normalizeText(query);

    return countryData.CountryList.filter(
      (country) =>
        normalizeText(country.Name).includes(q) ||
        normalizeText(country.Code).includes(q),
    ).slice(0, 10);
  };

  const updateRoomValue = (roomIndex, field, action) => {
    setRooms((prev) => {
      const updatedRooms = [...prev];
      const currentRoom = { ...updatedRooms[roomIndex] };

      if (field === "adults") {
        const nextAdults =
          action === "inc" ? currentRoom.adults + 1 : currentRoom.adults - 1;

        currentRoom.adults = Math.min(
          MAX_ADULTS_PER_ROOM,
          Math.max(1, nextAdults),
        );
      }

      if (field === "children") {
        const nextChildren =
          action === "inc"
            ? currentRoom.children + 1
            : currentRoom.children - 1;

        const finalChildren = Math.min(
          MAX_CHILDREN_PER_ROOM,
          Math.max(0, nextChildren),
        );

        currentRoom.children = finalChildren;

        currentRoom.childAges = Array.from(
          { length: finalChildren },
          (_, index) => {
            const existingAge = Number(currentRoom.childAges?.[index]);

            return existingAge >= MIN_CHILD_AGE && existingAge <= MAX_CHILD_AGE
              ? existingAge
              : "";
          },
        );
      }

      updatedRooms[roomIndex] = currentRoom;
      return updatedRooms;
    });
  };

  const updateChildAge = (roomIndex, childIndex, value) => {
    const age = Number(value);

    setRooms((prev) => {
      const updatedRooms = [...prev];
      const currentRoom = { ...updatedRooms[roomIndex] };
      const childAges = [...(currentRoom.childAges || [])];

      childAges[childIndex] =
        age >= MIN_CHILD_AGE && age <= MAX_CHILD_AGE ? age : "";

      currentRoom.childAges = childAges;
      updatedRooms[roomIndex] = currentRoom;

      return updatedRooms;
    });
  };

  const addRoom = () => {
    setRooms((prev) => {
      if (prev.length >= MAX_ROOMS) return prev;
      return [...prev, createRoom()];
    });
  };

  const removeRoom = (roomIndex) => {
    setRooms((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, index) => index !== roomIndex);
    });
  };

  const validateSearch = (data = formData) => {
    if (!data.city || !data.cityName) {
      setErrorMsg("Please select a city from the dropdown");
      return false;
    }

    if (!data.nationality) {
      setErrorMsg("Please select nationality");
      return false;
    }

    if (isInternationalHotelSearch && data.nationality !== "IN") {
      setErrorMsg(
        "For international hotel search, only Indian nationality is allowed.",
      );
      return false;
    }

    if (!data.checkIn || !data.checkOut) {
      setErrorMsg("Select dates");
      return false;
    }

    if (data.checkOut <= data.checkIn) {
      setErrorMsg("Invalid dates");
      return false;
    }

    if (rooms.length > MAX_ROOMS) {
      setErrorMsg("Maximum 6 rooms allowed per search");
      return false;
    }

    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      const room = rooms[roomIndex];

      if (room.adults < 1 || room.adults > MAX_ADULTS_PER_ROOM) {
        setErrorMsg(`Room ${roomIndex + 1}: adults must be between 1 and 8`);
        return false;
      }

      if (room.children > MAX_CHILDREN_PER_ROOM) {
        setErrorMsg(`Room ${roomIndex + 1}: maximum 4 children allowed`);
        return false;
      }

      for (let childIndex = 0; childIndex < room.children; childIndex++) {
        const age = Number(room.childAges?.[childIndex]);

        if (!age || age < MIN_CHILD_AGE || age > MAX_CHILD_AGE) {
          setErrorMsg(
            `Room ${roomIndex + 1}: enter valid child ${
              childIndex + 1
            } age between 1 and 12`,
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const finalNationality = isInternationalHotelSearch
      ? INDIA_NATIONALITY.Code
      : formData.nationality;

    const finalNationalityName = isInternationalHotelSearch
      ? INDIA_NATIONALITY.Name
      : formData.nationalityName;

    const finalFormData = {
      ...formData,
      nationality: finalNationality,
      nationalityName: finalNationalityName,
    };

    if (!validateSearch(finalFormData)) return;

    const roomGuests = rooms.map((room, index) => {
      const childAges = (room.childAges || [])
        .slice(0, Number(room.children || 0))
        .map((age) => Number(age));

      return {
        RoomIndex: index + 1,
        Adults: Number(room.adults),
        Children: Number(room.children),
        ChildAges: childAges,
        ChildrenAges: childAges,
      };
    });

    const flatChildAges = roomGuests.flatMap((room) => room.ChildAges);

    const paxRooms = roomGuests.map((room) => ({
      Adults: room.Adults,
      Children: room.Children,
      ChildrenAges: room.ChildrenAges,
    }));

    const searchPayload = {
      ...finalFormData,
      guests: {
        adults: guests.adults,
        children: guests.children,
        rooms: guests.rooms,
        childAges: flatChildAges,
        roomGuests,
      },
      currency: "INR",
      nationality: finalNationality,
      nationalityName: finalNationalityName,
      isInternationalHotelSearch,
      parallelSearch: true,
      hotelCodesPerRequest: HOTEL_CODES_PER_REQUEST,
      maxRoomsAllowed: MAX_ROOMS,
      maxAdultsPerRoom: MAX_ADULTS_PER_ROOM,
      maxChildrenPerRoom: MAX_CHILDREN_PER_ROOM,
      childAgeAllowed: "1-12",
      responseTime: RESPONSE_TIME_SECONDS,
      useFilters: true,
      showAllHotelFeed: true,
      showAllRoomFeed: true,
      exactPriceOnly: true,
      showInclusion: true,
      showMealType: true,
      showCancellationPolicy: true,
      showRateConditions: true,
      showAmenities: true,
      showRoomPromotions: true,
      showSupplements: true,
    };

    const apiParams = {
      city: finalFormData.city,
      cityName: finalFormData.cityName,
      checkin: finalFormData.checkIn,
      checkout: finalFormData.checkOut,

      adults: guests.adults,
      children: guests.children,
      rooms: guests.rooms,

      roomGuests: JSON.stringify(roomGuests),

      PaxRooms: JSON.stringify(paxRooms),
      paxRooms: JSON.stringify(paxRooms),
      pax_rooms: JSON.stringify(paxRooms),

      childAges: flatChildAges.join(","),
      ChildAges: flatChildAges.join(","),
      ChildrenAges: flatChildAges.join(","),

      nationality: finalNationality,
      GuestNationality: finalNationality,

      currency: "INR",
      responseTime: RESPONSE_TIME_SECONDS,

      parallelSearch: true,
      hotelCodesPerRequest: HOTEL_CODES_PER_REQUEST,

      useFilters: true,
      showAllHotelFeed: true,
      showAllRoomFeed: true,
      exactPriceOnly: true,
      showInclusion: true,
      showMealType: true,
      showCancellationPolicy: true,
      showRateConditions: true,
      showAmenities: true,
      showRoomPromotions: true,
      showSupplements: true,
    };

    try {
      resetFlow();
      setLocalLoading(true);
      setLoading(true);
      setError("");

      setSearch(searchPayload);
      localStorage.setItem("hotelSearchPayload", JSON.stringify(searchPayload));

      console.log("FINAL HOTEL SEARCH PARAMS:", apiParams);

      const res = await publicApi.get("/api/hotels/search-hotels/", {
        params: apiParams,
      });

      console.log("HOTEL SEARCH RESPONSE:", res.data);

      const hotelsData =
        res.data?.data?.HotelResult ||
        res.data?.HotelResult ||
        res.data?.results ||
        res.data?.data?.results ||
        res.data?.hotels ||
        res.data?.data?.hotels ||
        [];

      if (!Array.isArray(hotelsData) || hotelsData.length === 0) {
        const tboMessage =
          res.data?.Error?.ErrorMessage ||
          res.data?.data?.Error?.ErrorMessage ||
          res.data?.message ||
          res.data?.error ||
          "No hotels found for this destination.";

        setErrorMsg(tboMessage);
        return;
      }

      setSearch(searchPayload);
      setHotels(res.data);

      navigate("/hotels");
    } catch (err) {
      console.error("HOTEL SEARCH ERROR:", err?.response?.data || err);

      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.Error?.ErrorMessage ||
        err?.response?.data?.data?.Error?.ErrorMessage ||
        err?.message ||
        "Hotel search failed. Please check selected city code and try again.";

      setError(err?.response?.data || apiMessage);
      setErrorMsg(apiMessage);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-(--bg-card) border border-(--border-soft) rounded-3xl shadow-2xl p-4 md:p-6 lg:p-8 space-y-6 backdrop-blur-md">
      {errorMsg && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-3 rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
      >
        <div className="relative md:col-span-3 w-full" ref={cityRef}>
          <label className="mb-1.5 block text-xs font-medium text-(--text-muted)">
            City
          </label>

          <input
            type="text"
            placeholder="Search city"
            value={cityInput}
            onChange={(e) => {
              const value = e.target.value;

              setCityInput(value);
              setFormData((prev) => ({
                ...prev,
                city: "",
                cityName: "",
                cityCountry: "",
              }));
              setCitySuggestions(searchCities(value));
            }}
            className="w-full h-12 px-4 rounded-2xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition"
          />

          {citySuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-(--bg-card) border border-(--border-soft) rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-1">
              {citySuggestions.map((city, index) => {
                const selectedCityName = getCityName(city);
                const selectedCityCode = getCityCode(city);
                const selectedCityCountry = getCityCountry(city);
                const selectedIsInternational = isInternationalDestination(
                  selectedCityName,
                  selectedCityCountry,
                );

                return (
                  <button
                    type="button"
                    key={`${selectedCityCode}-${index}`}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        city: selectedCityCode,
                        cityName: selectedCityName,
                        cityCountry: selectedCityCountry,
                        nationality: selectedIsInternational
                          ? INDIA_NATIONALITY.Code
                          : prev.nationality || INDIA_NATIONALITY.Code,
                        nationalityName: selectedIsInternational
                          ? INDIA_NATIONALITY.Name
                          : prev.nationalityName || INDIA_NATIONALITY.Name,
                      }));

                      setCityInput(selectedCityName);
                      setCitySuggestions([]);

                      if (selectedIsInternational) {
                        setNationalityInput(INDIA_NATIONALITY.Name);
                        setNationalitySuggestions([]);
                      }
                    }}
                    className="w-full p-3 rounded-xl hover:bg-(--bg-secondary) cursor-pointer text-sm flex items-center justify-between gap-3 text-left transition"
                  >
                    <span>
                      {selectedCityName}
                      {selectedCityCountry ? `, ${selectedCityCountry}` : ""}
                    </span>

                    <span className="text-xs text-(--text-muted)">
                      {selectedCityCode}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative md:col-span-3 w-full" ref={nationalityRef}>
          <label className="mb-1.5 block text-xs font-medium text-(--text-muted)">
            Nationality
          </label>

          <input
            type="text"
            placeholder="Search nationality"
            value={nationalityInput}
            readOnly={isInternationalHotelSearch}
            onFocus={() => {
              if (isInternationalHotelSearch) {
                setNationalityInput(INDIA_NATIONALITY.Name);
                setNationalitySuggestions([INDIA_NATIONALITY]);

                setFormData((prev) => ({
                  ...prev,
                  nationality: INDIA_NATIONALITY.Code,
                  nationalityName: INDIA_NATIONALITY.Name,
                }));

                return;
              }

              if (nationalityInput) {
                setNationalitySuggestions(
                  searchNationalities(nationalityInput),
                );
              }
            }}
            onChange={(e) => {
              if (isInternationalHotelSearch) {
                setNationalityInput(INDIA_NATIONALITY.Name);
                setNationalitySuggestions([INDIA_NATIONALITY]);

                setFormData((prev) => ({
                  ...prev,
                  nationality: INDIA_NATIONALITY.Code,
                  nationalityName: INDIA_NATIONALITY.Name,
                }));

                return;
              }

              const value = e.target.value;

              setNationalityInput(value);
              setFormData((prev) => ({
                ...prev,
                nationality: "",
                nationalityName: "",
              }));
              setNationalitySuggestions(searchNationalities(value));
            }}
            className={`w-full h-12 px-4 rounded-2xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition ${
              isInternationalHotelSearch ? "cursor-not-allowed opacity-80" : ""
            }`}
          />

          {isInternationalHotelSearch && (
            <p className="mt-1 text-[11px] text-(--gold-main) text-center">
              For international hotel search, only Indian nationality is
              allowed.
            </p>
          )}

          {nationalitySuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-(--bg-card) border border-(--border-soft) rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-1">
              {nationalitySuggestions.map((country) => (
                <button
                  type="button"
                  key={country.Code}
                  onClick={() => {
                    if (isInternationalHotelSearch) {
                      setFormData((prev) => ({
                        ...prev,
                        nationality: INDIA_NATIONALITY.Code,
                        nationalityName: INDIA_NATIONALITY.Name,
                      }));

                      setNationalityInput(INDIA_NATIONALITY.Name);
                      setNationalitySuggestions([]);
                      return;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      nationality: country.Code,
                      nationalityName: country.Name,
                    }));

                    setNationalityInput(country.Name);
                    setNationalitySuggestions([]);
                  }}
                  className="w-full p-3 rounded-xl hover:bg-(--bg-secondary) cursor-pointer text-sm flex items-center justify-between text-left transition"
                >
                  <span>{country.Name}</span>
                  <span className="text-xs text-(--text-muted)">
                    {country.Code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-4 w-full">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-(--text-muted)">
              Check-in
            </label>

            <input
              type="date"
              min={today}
              value={formData.checkIn}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  checkIn: e.target.value,
                }))
              }
              className="w-full h-12 px-4 rounded-2xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-(--text-muted)">
              Check-out
            </label>

            <input
              type="date"
              min={formData.checkIn || today}
              value={formData.checkOut}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  checkOut: e.target.value,
                }))
              }
              className="w-full h-12 px-4 rounded-2xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition"
            />
          </div>
        </div>

        <div className="relative md:col-span-2 w-full" ref={guestRef}>
          <label className="mb-1.5 block text-xs font-medium text-(--text-muted)">
            Guests
          </label>

          <button
            type="button"
            onClick={() => setGuestOpen(true)}
            className="w-full h-12 px-4 rounded-2xl text-sm bg-(--bg-secondary) border border-(--border-soft) text-left flex items-center justify-between gap-2 hover:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition"
          >
            <span className="truncate">
              {totalGuests} Guest{totalGuests > 1 && "s"} · {guests.rooms} Room
              {guests.rooms > 1 && "s"}
            </span>

            <span className="text-(--gold-main)">▾</span>
          </button>

          {guestOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setGuestOpen(false)}
              />

              <div
                className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] md:w-160 lg:w-180 h-[78vh] md:h-[62vh] rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-soft) shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 bg-(--bg-card) border-b border-(--border-soft) p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-(--text-main)">
                        Rooms & Guests
                      </h3>

                      <p className="mt-1 text-xs text-(--text-muted)">
                        Add rooms, adults, children and child age.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGuestOpen(false)}
                      className="w-9 h-9 rounded-full bg-(--bg-secondary) border border-(--border-soft) flex items-center justify-center text-sm hover:border-(--gold-main) hover:text-(--gold-main) transition"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-2xl bg-(--bg-secondary) border border-(--border-soft) p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                        Adults
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-(--gold-main)">
                        {guests.adults}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-(--bg-secondary) border border-(--border-soft) p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                        Children
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-(--gold-main)">
                        {guests.children}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-(--bg-secondary) border border-(--border-soft) p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-(--text-muted)">
                        Rooms
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-(--gold-main)">
                        {guests.rooms}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {rooms.map((room, roomIndex) => (
                    <div
                      key={roomIndex}
                      className="rounded-3xl border border-(--border-soft) bg-(--bg-secondary) p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-(--text-main)">
                            Room {roomIndex + 1}
                          </p>

                          <p className="text-xs text-(--text-muted)">
                            {room.adults} Adult{room.adults > 1 && "s"} ·{" "}
                            {room.children} Child
                            {room.children !== 1 && "ren"}
                          </p>
                        </div>

                        {rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoom(roomIndex)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-(--bg-card) border border-(--border-soft) p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-(--text-main)">
                                Adults
                              </p>
                              <p className="text-xs text-(--text-muted)">
                                Age 12+
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomValue(roomIndex, "adults", "dec")
                                }
                                disabled={room.adults <= 1}
                                className="w-9 h-9 rounded-full border border-(--border-soft) bg-(--bg-secondary) flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-(--gold-main) hover:text-(--gold-main) transition"
                              >
                                -
                              </button>

                              <span className="min-w-6 text-center font-bold">
                                {room.adults}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomValue(roomIndex, "adults", "inc")
                                }
                                disabled={room.adults >= MAX_ADULTS_PER_ROOM}
                                className="w-9 h-9 rounded-full border border-(--border-soft) bg-(--bg-secondary) flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-(--gold-main) hover:text-(--gold-main) transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-(--bg-card) border border-(--border-soft) p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-(--text-main)">
                                Children
                              </p>
                              <p className="text-xs text-(--text-muted)">
                                Age 1 - 12
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomValue(roomIndex, "children", "dec")
                                }
                                disabled={room.children <= 0}
                                className="w-9 h-9 rounded-full border border-(--border-soft) bg-(--bg-secondary) flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-(--gold-main) hover:text-(--gold-main) transition"
                              >
                                -
                              </button>

                              <span className="min-w-6 text-center font-bold">
                                {room.children}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomValue(roomIndex, "children", "inc")
                                }
                                disabled={
                                  room.children >= MAX_CHILDREN_PER_ROOM
                                }
                                className="w-9 h-9 rounded-full border border-(--border-soft) bg-(--bg-secondary) flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-(--gold-main) hover:text-(--gold-main) transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {room.children > 0 && (
                        <div className="rounded-2xl bg-(--bg-card) border border-(--border-soft) p-3">
                          <p className="text-xs font-semibold text-(--text-muted) mb-3">
                            Child age is required
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Array.from({ length: room.children }).map(
                              (_, childIndex) => (
                                <div key={childIndex}>
                                  <label className="text-[11px] text-(--text-muted)">
                                    Child {childIndex + 1}
                                  </label>

                                  <input
                                    type="number"
                                    min={MIN_CHILD_AGE}
                                    max={MAX_CHILD_AGE}
                                    value={room.childAges?.[childIndex] || ""}
                                    onChange={(e) =>
                                      updateChildAge(
                                        roomIndex,
                                        childIndex,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="1-12"
                                    className="w-full mt-1 h-10 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main) focus:ring-2 focus:ring-(--gold-main)/20 transition"
                                  />
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="shrink-0 bg-(--bg-card) border-t border-(--border-soft) p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={addRoom}
                      disabled={rooms.length >= MAX_ROOMS}
                      className="w-full py-3 rounded-2xl border border-(--border-soft) bg-(--bg-secondary) text-sm font-semibold hover:border-(--gold-main) hover:text-(--gold-main) disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      + Add Room
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuestOpen(false)}
                      className="w-full py-3 rounded-2xl bg-linear-to-r from-start to-end text-black text-sm font-bold hover:scale-[1.01] active:scale-[0.98] transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-12 flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-10 py-3.5 rounded-2xl font-bold text-black bg-linear-to-r from-start to-end hover:scale-[1.02] active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Searching Hotels..." : "Search Hotels"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelsForm;
