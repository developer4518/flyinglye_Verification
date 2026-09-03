import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFlightStore } from "../../../store/flightStore";

const FlightsResults = () => {
  const navigate = useNavigate();

  const { flights, setFlight, selectedFlight } = useFlightStore();
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const [selectedStops, setSelectedStops] = useState([]);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [sortType, setSortType] = useState("cheapest");
  const [fareType, setFareType] = useState("all");

  /* ---------------- REDIRECT ---------------- */

  useEffect(() => {
    if ((!flights || flights.length === 0) && !selectedFlight) {
      navigate("/");
    }
  }, [flights, selectedFlight, navigate]);

  /* ---------------- HELPERS ---------------- */

  const getTimeCategory = (iso) => {
    const hour = new Date(iso).getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  /* ---------------- DATA ---------------- */

  const allAirlines = useMemo(
    () =>
      [
        ...new Set(
          flights.map((f) => f?.Segments?.[0]?.[0]?.Airline?.AirlineName),
        ),
      ].filter(Boolean),
    [flights],
  );

  const prices = flights.map((f) => f?.Fare?.PublishedFare || 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 100000;

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice]);

  /* ---------------- FILTER ---------------- */

  const lccFlights = flights.filter((f) => f.IsLCC);
  const nonLccFlights = flights.filter((f) => !f.IsLCC);

  const filteredFlights = useMemo(() => {
    let result = flights.filter((flight) => {
      const segments = flight?.Segments?.[0] || [];
      const first = segments?.[0];

      const stops = segments.length - 1;
      const airline = first?.Airline?.AirlineName;
      const price = flight?.Fare?.PublishedFare || 0;
      const time = getTimeCategory(first?.Origin?.DepTime);

      return (
        (selectedStops.length === 0 || selectedStops.includes(stops)) &&
        (selectedAirlines.length === 0 || selectedAirlines.includes(airline)) &&
        (selectedTimes.length === 0 || selectedTimes.includes(time)) &&
        price >= priceRange[0] &&
        price <= priceRange[1] &&
        (fareType === "all" ||
          (fareType === "lcc" && flight.IsLCC) ||
          (fareType === "nonlcc" && !flight.IsLCC))
      );
    });

    if (sortType === "cheapest") {
      result.sort((a, b) => a.Fare.PublishedFare - b.Fare.PublishedFare);
    }

    if (sortType === "fastest") {
      result.sort((a, b) => {
        const aSeg = a.Segments[0];
        const bSeg = b.Segments[0];

        const aDur =
          aSeg[aSeg.length - 1].AccumulatedDuration || aSeg[0].Duration;

        const bDur =
          bSeg[bSeg.length - 1].AccumulatedDuration || bSeg[0].Duration;

        return aDur - bDur;
      });
    }

    return result;
  }, [
    flights,
    selectedStops,
    selectedAirlines,
    selectedTimes,
    priceRange,
    sortType,
    fareType,
  ]);

  if (!flights || (!flights.length && !selectedFlight)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg-main) text-(--text-main)">
        No Flights Found
      </div>
    );
  }

  /* ---------------- FILTER UI ---------------- */

  const FilterContent = () => (
    <div className="space-y-6 text-(--text-main)">
      {/* Stops */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-(--gold-main)">Stops</h4>
        {[0, 1].map((stop) => (
          <label key={stop} className="flex items-center gap-2 mb-2 text-sm">
            <input
              type="checkbox"
              checked={selectedStops.includes(stop)}
              onChange={() =>
                setSelectedStops((prev) =>
                  prev.includes(stop)
                    ? prev.filter((s) => s !== stop)
                    : [...prev, stop],
                )
              }
            />
            {stop === 0 ? "Non Stop" : "1 Stop"}
          </label>
        ))}
      </div>

      {/* Airlines */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-(--gold-main)">
          Airlines
        </h4>
        {allAirlines.map((airline) => (
          <label key={airline} className="flex items-center gap-2 mb-2 text-sm">
            <input
              type="checkbox"
              checked={selectedAirlines.includes(airline)}
              onChange={() =>
                setSelectedAirlines((prev) =>
                  prev.includes(airline)
                    ? prev.filter((a) => a !== airline)
                    : [...prev, airline],
                )
              }
            />
            {airline}
          </label>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3 text-(--gold-main)">
          Fare Type
        </h4>

        {[
          { label: "All", value: "all" },
          { label: "Low Cost (LCC)", value: "lcc" },
          { label: "Full Service", value: "nonlcc" },
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => setFareType(type.value)}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-2 ${
              fareType === type.value
                ? "bg-(--gold-main) text-black"
                : "border border-(--border-soft)"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Time Chips */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-(--gold-main)">
          Departure Time
        </h4>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "🌅 Morning", value: "morning" },
            { label: "🌞 Afternoon", value: "afternoon" },
            { label: "🌇 Evening", value: "evening" },
            { label: "🌙 Night", value: "night" },
          ].map((t) => {
            const active = selectedTimes.includes(t.value);

            return (
              <button
                key={t.value}
                onClick={() =>
                  setSelectedTimes((prev) =>
                    prev.includes(t.value)
                      ? prev.filter((v) => v !== t.value)
                      : [...prev, t.value],
                  )
                }
                className={`text-xs rounded-lg px-3 py-2 border transition ${
                  active
                    ? "bg-(--gold-main) text-black border-(--gold-main)"
                    : "border-(--border-soft)"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-(--bg-main) pt-20 pb-24 text-(--text-main)">
      <div className="max-w-6xl mx-auto px-3 lg:px-4 py-6 grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Desktop Filters */}
        {/* Desktop Filters */}
        <aside
          className="
    hidden lg:block
    bg-(--bg-card)
    p-6
    rounded-xl
    border border-(--border-soft)
    sticky top-24
    max-h-[calc(100vh-7rem)]
    overflow-y-auto
  "
        >
          <h3 className="font-semibold text-lg mb-4 text-(--gold-main)">
            Filters
          </h3>

          <FilterContent />
        </aside>

        <main className="space-y-4">
          {/* Sticky Top Bar */}
          <div className="lg:hidden sticky top-16 z-40 bg-(--bg-main)/90 backdrop-blur border-b border-(--border-soft) py-3 flex gap-3">
            <button
              onClick={() => setShowFilters(true)}
              className="flex-1 bg-(--bg-card) border border-(--border-soft) py-2 rounded-lg text-sm"
            >
              Filters
            </button>

            <button
              onClick={() => setShowSort(!showSort)}
              className="flex-1 bg-(--bg-card) border border-(--border-soft) py-2 rounded-lg text-sm"
            >
              Sort
            </button>
          </div>

          {/* Sort Dropdown */}
          {showSort && (
            <div className="bg-(--bg-card) border border-(--border-soft) rounded-lg p-3">
              {["cheapest", "fastest"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSortType(type);
                    setShowSort(false);
                  }}
                  className="block w-full text-left py-2 text-sm hover:text-(--gold-main)"
                >
                  {type === "cheapest" ? "Cheapest First" : "Fastest First"}
                </button>
              ))}
            </div>
          )}

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2">
            {selectedTimes.map((t) => (
              <span
                key={t}
                className="bg-(--gold-soft) text-black px-3 py-1 rounded-full text-xs"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Flights */}
          {filteredFlights.map((flight, index) => {
            const segments = flight?.Segments?.[0] || [];
            const first = segments?.[0];
            const last = segments?.[segments.length - 1];

            const stops = segments.length - 1;
            const duration = last.AccumulatedDuration || first.Duration;

            const isExpanded = expandedCard === index;

            return (
              <div
                key={index}
                className="bg-(--bg-card) rounded-xl border border-(--border-soft) p-5 hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={`/airlines/${first?.Airline?.AirlineCode}.png`}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      alt=""
                      className="h-6"
                    />
                    <div>
                      <p className="font-semibold text-(--gold-main)">
                        {first.Airline.AirlineName}
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        {first.Airline.AirlineCode}-{first.Airline.FlightNumber}
                      </p>

                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          flight.IsLCC
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {flight.IsLCC ? "LCC" : "Full Service"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xl font-bold text-(--gold-soft)">
                    ₹{flight.Fare.PublishedFare.toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Time Row */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xl font-bold">
                      {formatTime(first.Origin.DepTime)}
                    </p>
                    <p className="text-xs text-(--text-muted)">
                      {first.Origin.Airport.AirportCode}
                    </p>
                  </div>

                  <div className="text-center text-xs text-(--text-muted)">
                    <span>{formatDuration(duration)}</span>
                    <div className="flex items-center w-24 mx-auto my-1">
                      <div className="flex-1 h-px bg-(--border-soft)" />
                      ✈
                      <div className="flex-1 h-px bg-(--border-soft)" />
                    </div>
                    <span>{stops === 0 ? "Non Stop" : `${stops} Stop`}</span>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatTime(last.Destination.ArrTime)}
                    </p>
                    <p className="text-xs text-(--text-muted)">
                      {last.Destination.Airport.AirportCode}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : index)}
                    className="text-xs text-(--text-muted)"
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  <button
                    onClick={() => {
                      setFlight(flight);
                      navigate("/fare-rule");
                    }}
                    className="bg-linear-to-r from-start to-end text-black text-sm px-5 py-2 rounded-lg hover:opacity-90"
                  >
                    Book Now
                  </button>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="mt-4 border-t border-(--border-soft) pt-4 space-y-2 text-sm">
                    {segments.map((seg, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {seg.Origin.Airport.AirportCode} →{" "}
                          {seg.Destination.Airport.AirportCode}
                        </span>
                        <span>
                          {formatTime(seg.Origin.DepTime)} -{" "}
                          {formatTime(seg.Destination.ArrTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      {/* Mobile Bottom Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:hidden">
          <div className="bg-(--bg-card) w-full rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-(--gold-main)">Filters</h3>
              <button onClick={() => setShowFilters(false)}>Close</button>
            </div>

            <FilterContent />

            <button
              onClick={() => setShowFilters(false)}
              className="mt-4 w-full bg-linear-to-r from-start to-end text-black py-3 rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightsResults;
