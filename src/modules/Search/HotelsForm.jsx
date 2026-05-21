"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../services/api";
import { cityData } from "../hotels/HotelData";
import { countryData } from "../hotels/CountryData";
import { useHotelStore } from "../../store/hotelStore";

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
    search?.nationalityName || "India",
  );
  const [nationalitySuggestions, setNationalitySuggestions] = useState([]);
  const [guestOpen, setGuestOpen] = useState(false);

  const cityRef = useRef(null);
  const nationalityRef = useRef(null);
  const guestRef = useRef(null);

  const [formData, setFormData] = useState({
    city: search?.city || "",
    cityName: search?.cityName || "",
    nationality: search?.nationality || "IN",
    nationalityName: search?.nationalityName || "India",
    checkIn: search?.checkIn || "",
    checkOut: search?.checkOut || "",
  });

  const [guests, setGuests] = useState({
    adults: search?.guests?.adults || 1,
    children: search?.guests?.children || 0,
    rooms: search?.guests?.rooms || 1,
    childAges: search?.guests?.childAges || [],
  });

  /* ================= CLICK OUTSIDE ================= */
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
    setSearch({
      ...formData,
      guests,
    });
  }, [formData, guests, setSearch]);

  /* ================= SEARCH CITY ================= */
  const searchCities = (query) => {
    if (!query) return [];

    const q = query.toLowerCase();

    return cityData.cities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  };

  /* ================= SEARCH NATIONALITY ================= */
  const searchNationalities = (query) => {
    if (!query) return [];

    const q = query.toLowerCase();

    return countryData.CountryList.filter(
      (country) =>
        country.Name.toLowerCase().includes(q) ||
        country.Code.toLowerCase().includes(q),
    ).slice(0, 8);
  };

  /* ================= GUEST UPDATE ================= */
  const updateGuests = (type, value) => {
    setGuests((prev) => {
      const updated = { ...prev };

      updated[type] = Math.max(0, prev[type] + value);

      if (updated.adults < 1) updated.adults = 1;
      if (updated.rooms < 1) updated.rooms = 1;

      return updated;
    });
  };

  const totalGuests = guests.adults + guests.children;

  /* ================= SEARCH ================= */
  const handleSearch = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.city) {
      return setErrorMsg("Please select a city");
    }

    if (!formData.nationality) {
      return setErrorMsg("Please select nationality");
    }

    if (!formData.checkIn || !formData.checkOut) {
      return setErrorMsg("Select dates");
    }

    if (formData.checkOut <= formData.checkIn) {
      return setErrorMsg("Invalid dates");
    }

    try {
      resetFlow();
      setLocalLoading(true);
      setLoading(true);

      const res = await publicApi.get("/api/hotels/search-hotels/", {
        params: {
          city: formData.city,
          checkin: formData.checkIn,
          checkout: formData.checkOut,
          adults: guests.adults,
          children: guests.children,
          rooms: guests.rooms,

          // ✅ nationality selected by user
          nationality: formData.nationality,

          // ✅ optional fallback if backend expects this name
          GuestNationality: formData.nationality,
        },
      });

      const hotelsData =
        res.data?.data?.HotelResult ||
        res.data?.HotelResult ||
        res.data?.results ||
        [];

      if (!hotelsData.length) {
        setErrorMsg("No hotels found 😔");
        return;
      }

      setSearch({
        ...formData,
        guests,
      });

      setHotels(hotelsData);
      navigate("/hotels");
    } catch (err) {
      console.error(err);
      setError("API Error");
      setErrorMsg(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Something went wrong",
      );
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl shadow-2xl p-4 md:p-6 lg:p-8 space-y-6 backdrop-blur-md">
      {/* ERROR */}
      {errorMsg && (
        <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 p-2 rounded-lg">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end"
      >
        {/* ================= CITY ================= */}
        <div className="relative md:col-span-3 w-full" ref={cityRef}>
          <label className="text-xs text-(--text-muted)">City</label>

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
              }));
              setCitySuggestions(searchCities(value));
            }}
            className="w-full h-11 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main)"
          />

          {citySuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-(--bg-card) border border-(--border-soft) rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {citySuggestions.map((city) => (
                <div
                  key={city.code}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      city: city.code,
                      cityName: city.name,
                    }));
                    setCityInput(city.name);
                    setCitySuggestions([]);
                  }}
                  className="p-3 hover:bg-(--bg-secondary) cursor-pointer text-sm"
                >
                  {city.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= NATIONALITY ================= */}
        <div className="relative md:col-span-3 w-full" ref={nationalityRef}>
          <label className="text-xs text-(--text-muted)">Nationality</label>

          <input
            type="text"
            placeholder="Search nationality"
            value={nationalityInput}
            onChange={(e) => {
              const value = e.target.value;
              setNationalityInput(value);
              setFormData((prev) => ({
                ...prev,
                nationality: "",
                nationalityName: "",
              }));
              setNationalitySuggestions(searchNationalities(value));
            }}
            className="w-full h-11 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft) outline-none focus:border-(--gold-main)"
          />

          {nationalitySuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-(--bg-card) border border-(--border-soft) rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {nationalitySuggestions.map((country) => (
                <div
                  key={country.Code}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      nationality: country.Code,
                      nationalityName: country.Name,
                    }));
                    setNationalityInput(country.Name);
                    setNationalitySuggestions([]);
                  }}
                  className="p-3 hover:bg-(--bg-secondary) cursor-pointer text-sm flex items-center justify-between"
                >
                  <span>{country.Name}</span>
                  <span className="text-xs text-(--text-muted)">
                    {country.Code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= DATES ================= */}
        <div className="grid grid-cols-2 gap-3 md:col-span-4 w-full">
          <div>
            <label className="text-xs text-(--text-muted)">Check-in</label>
            <input
              type="date"
              min={today}
              value={formData.checkIn}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  checkIn: e.target.value,
                })
              }
              className="w-full h-11 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft)"
            />
          </div>

          <div>
            <label className="text-xs text-(--text-muted)">Check-out</label>
            <input
              type="date"
              min={formData.checkIn || today}
              value={formData.checkOut}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  checkOut: e.target.value,
                })
              }
              className="w-full h-11 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft)"
            />
          </div>
        </div>

        {/* ================= GUESTS ================= */}
        <div className="relative md:col-span-2 w-full" ref={guestRef}>
          <label className="text-xs text-(--text-muted)">Guests</label>

          <button
            type="button"
            onClick={() => setGuestOpen(!guestOpen)}
            className="w-full h-11 px-3 rounded-xl text-sm bg-(--bg-secondary) border border-(--border-soft) text-left"
          >
            {totalGuests} Guest{totalGuests > 1 && "s"} · {guests.rooms} Room
            {guests.rooms > 1 && "s"}
          </button>

          {guestOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-(--bg-card) border border-(--border-soft) rounded-xl shadow-xl p-4 z-50 space-y-4">
              {/* ADULTS */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Adults</span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateGuests("adults", -1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    -
                  </button>

                  <span>{guests.adults}</span>

                  <button
                    type="button"
                    onClick={() => updateGuests("adults", 1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CHILDREN */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Children</span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateGuests("children", -1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    -
                  </button>

                  <span>{guests.children}</span>

                  <button
                    type="button"
                    onClick={() => updateGuests("children", 1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ROOMS */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Rooms</span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateGuests("rooms", -1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    -
                  </button>

                  <span>{guests.rooms}</span>

                  <button
                    type="button"
                    onClick={() => updateGuests("rooms", 1)}
                    className="w-8 h-8 rounded-lg border"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuestOpen(false)}
                className="w-full mt-2 bg-linear-to-r from-start to-end text-black rounded-lg py-2 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* ================= BUTTON ================= */}
        <div className="md:col-span-12 flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-black bg-linear-to-r from-start to-end hover:scale-[1.02] active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Searching Hotels..." : "Search Hotels"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotelsForm;
