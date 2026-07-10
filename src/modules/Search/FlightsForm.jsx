import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../services/api";
import airports from "../../data/airports";
import { useFlightStore } from "../../store/flightStore";

const FlightsForm = () => {
  const navigate = useNavigate();

  const { setFlights, setPassengerCount, setSearchTravellers } =
    useFlightStore();

  const [tripType, setTripType] = useState("oneway");
  const [travellersOpen, setTravellersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
  });

  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  const originRef = useRef();
  const destinationRef = useRef();
  const travellerRef = useRef();

  const [travellers, setTravellers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "Economy",
  });

  const cabinClassMap = {
    Economy: "2",
    "Premium Economy": "3",
    Business: "4",
    "First Class": "6",
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (originRef.current && !originRef.current.contains(e.target)) {
        setOriginSuggestions([]);
      }

      if (
        destinationRef.current &&
        !destinationRef.current.contains(e.target)
      ) {
        setDestinationSuggestions([]);
      }

      if (travellerRef.current && !travellerRef.current.contains(e.target)) {
        setTravellersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAirports = (query) => {
    if (!query) return [];

    const q = query.toLowerCase();

    return airports
      .filter(
        (airport) =>
          airport.city.toLowerCase().includes(q) ||
          airport.name.toLowerCase().includes(q) ||
          airport.country.toLowerCase().includes(q) ||
          airport.iata.toLowerCase().includes(q),
      )
      .slice(0, 8);
  };

  const swapAirports = () => {
    setFormData((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));

    setOriginInput(destinationInput);
    setDestinationInput(originInput);
  };

  const validateSearch = () => {
    const totalTravellers =
      travellers.adults + travellers.children + travellers.infants;

    if (!formData.origin || !formData.destination) {
      return "Please select airports";
    }

    if (formData.origin === formData.destination) {
      return "Origin and destination cannot be same";
    }

    if (!formData.departure_date) {
      return "Please select departure date";
    }

    if (formData.departure_date < today) {
      return "Departure date cannot be less than today's date";
    }

    if (tripType === "roundtrip" && !formData.return_date) {
      return "Please select return date";
    }

    if (
      tripType === "roundtrip" &&
      formData.return_date &&
      formData.return_date < formData.departure_date
    ) {
      return "Return date cannot be before departure date";
    }

    if (travellers.adults < 1) {
      return "At least 1 adult passenger is required";
    }

    if (travellers.infants > travellers.adults) {
      return "Infants cannot be more than adults";
    }

    if (totalTravellers > 9) {
      return "Total passengers cannot be more than 9";
    }

    return "";
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const validationError = validateSearch();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    const payload = {
      origin: formData.origin,
      destination: formData.destination,
      departure_date: formData.departure_date,
      return_date: tripType === "roundtrip" ? formData.return_date : null,
      adults: travellers.adults,
      children: travellers.children,
      infants: travellers.infants,
      flight_cabin_class: cabinClassMap[travellers.cabin],
    };

    console.log("PAYLOAD:", payload);
    try {
      const response = await publicApi.post("/api/airlines/search/", payload);

      const data = response?.data;

      console.log("SEARCH RAW RESPONSE:", data);

      const apiResponse =
        data?.data?.Response || data?.Response || data?.data || data;

      const errorCode = Number(apiResponse?.Error?.ErrorCode || 0);
      const errorMessage = apiResponse?.Error?.ErrorMessage || "";

      if (errorCode && errorCode !== 0) {
        setError(errorMessage || "Unable to search flights");
        return;
      }

      const rawResults =
        apiResponse?.Results ||
        data?.data?.Response?.Results ||
        data?.Response?.Results ||
        [];

      const results = Array.isArray(rawResults)
        ? rawResults.flat(Infinity).filter(Boolean)
        : [];

      console.log("PARSED FLIGHT RESULTS:", results);

      if (!results.length) {
        setError(errorMessage || "No flights found");
        return;
      }

      const traceId =
        apiResponse?.TraceId ||
        data?.data?.Response?.TraceId ||
        data?.Response?.TraceId ||
        null;

      setFlights({
        flights: results,
        traceId,
      });

      const totalTravellers =
        travellers.adults + travellers.children + travellers.infants;

      setPassengerCount(totalTravellers);

      if (typeof setSearchTravellers === "function") {
        setSearchTravellers(travellers);
      }

      navigate("/flights");
    } catch (err) {
      console.error("SEARCH ERROR:", err?.response?.data || err);

      const apiError =
        err?.response?.data?.data?.Response?.Error?.ErrorMessage ||
        err?.response?.data?.Response?.Error?.ErrorMessage ||
        err?.response?.data?.Error?.ErrorMessage ||
        err?.response?.data?.error ||
        err?.response?.data?.message;

      if (err.message === "Network Error") {
        setError("CORS error: Backend is blocking request");
      } else {
        setError(apiError || "Server error");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCount = (type, value) => {
    setTravellers((prev) => {
      const updated = { ...prev };

      updated[type] = Math.max(0, prev[type] + value);

      if (updated.adults < 1) updated.adults = 1;

      if (updated.infants > updated.adults) {
        updated.infants = updated.adults;
      }

      const total = updated.adults + updated.children + updated.infants;

      if (total > 9) {
        setError("Total passengers cannot be more than 9");
        return prev;
      }

      setError("");
      return updated;
    });
  };

  const totalTravellers =
    travellers.adults + travellers.children + travellers.infants;

  return (
    <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl shadow-2xl p-4 md:p-8 space-y-6 backdrop-blur-md">
      <div className="flex gap-2 text-xs md:text-sm font-semibold">
        {["oneway", "roundtrip"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTripType(type);

              if (type === "oneway") {
                setFormData((prev) => ({
                  ...prev,
                  return_date: "",
                }));
              }
            }}
            className={`px-4 py-2 rounded-full transition ${
              tripType === type
                ? "bg-linear-to-r from-start to-end text-black"
                : "bg-(--bg-secondary)"
            }`}
          >
            {type === "oneway" ? "One Way" : "Round Trip"}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 p-2 rounded-lg">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4"
      >
        <div className="relative md:col-span-5" ref={originRef}>
          <label className="text-xs text-(--text-muted)">From</label>

          <input
            type="text"
            placeholder="City or Airport"
            value={originInput}
            onChange={(e) => {
              const value = e.target.value;
              setOriginInput(value);
              setOriginSuggestions(searchAirports(value));

              if (!value.trim()) {
                setFormData((prev) => ({ ...prev, origin: "" }));
              }
            }}
            className="rounded-xl p-3 text-sm w-full transition-all outline-none"
            style={{
              background: "var(--bg-main)",
              color: "var(--text-main)",
              border: "1px solid var(--border-soft)",
            }}
            onFocus={(e) => {
              e.target.style.border = "1px solid var(--gold-main)";
              e.target.style.boxShadow = "0 0 0 2px rgba(234,168,42,0.2)";
            }}
            onBlur={(e) => {
              e.target.style.border = "1px solid var(--border-soft)";
              e.target.style.boxShadow = "none";
            }}
          />

          {originSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-(--bg-card) border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {originSuggestions.map((airport) => (
                <div
                  key={airport.iata}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      origin: airport.iata,
                    }));

                    setOriginInput(`${airport.city} (${airport.iata})`);
                    setOriginSuggestions([]);
                  }}
                  className="p-3 hover:bg-(--bg-secondary) cursor-pointer border-b border-(--border-soft)"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{airport.city}</span>
                    <span className="font-semibold text-(--gold-main)">
                      {airport.iata}
                    </span>
                  </div>

                  <div className="text-xs text-(--text-muted)">
                    {airport.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center items-end md:col-span-1">
          <button
            type="button"
            onClick={swapAirports}
            className="w-9 h-9 rounded-full border border-(--border-soft) flex items-center justify-center hover:bg-(--bg-secondary)"
          >
            ⇄
          </button>
        </div>

        <div className="relative md:col-span-5" ref={destinationRef}>
          <label className="text-xs text-(--text-muted)">To</label>

          <input
            type="text"
            placeholder="City or Airport"
            value={destinationInput}
            onChange={(e) => {
              const value = e.target.value;
              setDestinationInput(value);
              setDestinationSuggestions(searchAirports(value));

              if (!value.trim()) {
                setFormData((prev) => ({ ...prev, destination: "" }));
              }
            }}
            className="bg-(--bg-secondary) border border-(--border-soft) rounded-lg p-2.5 text-sm w-full"
          />

          {destinationSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-(--bg-card) border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {destinationSuggestions.map((airport) => (
                <div
                  key={airport.iata}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      destination: airport.iata,
                    }));

                    setDestinationInput(`${airport.city} (${airport.iata})`);
                    setDestinationSuggestions([]);
                  }}
                  className="p-3 hover:bg-(--bg-secondary) cursor-pointer border-b border-(--border-soft)"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{airport.city}</span>
                    <span className="font-semibold text-(--gold-main)">
                      {airport.iata}
                    </span>
                  </div>

                  <div className="text-xs text-(--text-muted)">
                    {airport.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-6">
          <div>
            <label className="text-xs text-(--text-muted)">Departure</label>
            <input
              type="date"
              min={today}
              value={formData.departure_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  departure_date: e.target.value,
                  return_date:
                    prev.return_date && prev.return_date < e.target.value
                      ? ""
                      : prev.return_date,
                }))
              }
              className="bg-(--bg-secondary) border border-(--border-soft) rounded-lg p-2.5 text-sm w-full text-white"
            />
          </div>

          <div>
            <label className="text-xs text-(--text-muted)">Return</label>
            <input
              type="date"
              disabled={tripType === "oneway"}
              min={formData.departure_date || today}
              value={formData.return_date}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  return_date: e.target.value,
                }))
              }
              className="bg-(--bg-secondary) border border-(--border-soft) rounded-lg p-2.5 text-sm w-full"
            />
          </div>
        </div>

        <div className="relative md:col-span-3" ref={travellerRef}>
          <label className="text-xs text-(--text-muted)">
            Travellers & Class
          </label>

          <button
            type="button"
            onClick={() => setTravellersOpen(!travellersOpen)}
            className="bg-(--bg-secondary) border border-(--border-soft) rounded-lg p-2.5 text-sm w-full text-left"
          >
            {totalTravellers} Traveller{totalTravellers > 1 ? "s" : ""} ·{" "}
            {travellers.cabin}
          </button>

          {travellersOpen && (
            <div
              className="
                absolute bottom-full mb-2
                md:top-full md:bottom-auto md:mt-2 md:mb-0
                left-0
                w-full md:w-95
                bg-(--bg-card)
                border border-(--border-soft)
                rounded-2xl
                shadow-2xl
                p-4
                z-50
                max-h-[70vh]
                overflow-y-auto
              "
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {[
                    {
                      key: "adults",
                      label: "Adults",
                      subLabel: "12+ years",
                    },
                    {
                      key: "children",
                      label: "Children",
                      subLabel: "2-11 years",
                    },
                    {
                      key: "infants",
                      label: "Infants",
                      subLabel: "Under 2 years",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-(--text-muted)">
                          {item.subLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateCount(item.key, -1)}
                          className="w-8 h-8 border border-(--border-soft) rounded-lg"
                        >
                          -
                        </button>

                        <span className="w-6 text-center">
                          {travellers[item.key]}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateCount(item.key, 1)}
                          className="w-8 h-8 border border-(--border-soft) rounded-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-(--text-muted)">
                    Cabin Class
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    {[
                      "Economy",
                      "Premium Economy",
                      "Business",
                      "First Class",
                    ].map((cabin) => (
                      <button
                        key={cabin}
                        type="button"
                        onClick={() =>
                          setTravellers((prev) => ({
                            ...prev,
                            cabin,
                          }))
                        }
                        className={`
                          text-sm px-3 py-2 rounded-lg border transition text-center
                          ${
                            travellers.cabin === cabin
                              ? "bg-linear-to-r from-start to-end text-black border-transparent"
                              : "border-(--border-soft) hover:bg-(--bg-secondary)"
                          }
                        `}
                      >
                        {cabin}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTravellersOpen(false)}
                className="w-full mt-4 bg-linear-to-r from-start to-end text-black rounded-lg py-2 font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="md:col-span-12 bg-linear-to-r from-start to-end text-black rounded-xl p-3 font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Searching Flights..." : "Search Flights"}
        </button>
      </form>
    </div>
  );
};

export default FlightsForm;
