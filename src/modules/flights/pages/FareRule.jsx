import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../../../services/api";
import { useFlightStore } from "../../../store/flightStore";

const hasValidResultIndex = (value) => {
  return value !== null && value !== undefined && value !== "";
};

const getFareRulesFromResponse = (data) => {
  const rules =
    data?.data?.Response?.FareRules ||
    data?.Response?.FareRules ||
    data?.data?.FareRules ||
    data?.FareRules ||
    [];

  return Array.isArray(rules) ? rules : [];
};

const sanitizeFareRuleHtml = (html) => {
  if (!html) return "No details available";

  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
};

const FareRule = () => {
  const navigate = useNavigate();

  const { traceId, resultIndex, selectedFlight, isTraceExpired } =
    useFlightStore();

  const [fareRules, setFareRules] = useState([]);
  const [openRule, setOpenRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sessionMissing = !traceId || !hasValidResultIndex(resultIndex);

  const sessionExpired =
    typeof isTraceExpired === "function" && isTraceExpired();

  const segments = useMemo(() => {
    const list = selectedFlight?.Segments?.[0];
    return Array.isArray(list) ? list : [];
  }, [selectedFlight]);

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment?.Airline;
  const fare = selectedFlight?.Fare;

  useEffect(() => {
    if (sessionMissing) {
      setLoading(false);
      return;
    }

    if (sessionExpired) {
      setLoading(false);
      setError("Your flight search session is older than 15 minutes.");
      return;
    }

    let isMounted = true;

    const fetchFareRules = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await publicApi.post("/api/airlines/fare-rule/", {
          TraceId: traceId,
          ResultIndex: resultIndex,
        });

        const data = response?.data;

        const errorCode =
          data?.data?.Response?.Error?.ErrorCode ||
          data?.Response?.Error?.ErrorCode ||
          data?.Error?.ErrorCode;

        const errorMessage =
          data?.data?.Response?.Error?.ErrorMessage ||
          data?.Response?.Error?.ErrorMessage ||
          data?.error ||
          data?.message;

        if (Number(errorCode) === 6) {
          throw new Error("Invalid token. Please search again.");
        }

        if (errorMessage && errorCode && Number(errorCode) !== 0) {
          throw new Error(errorMessage);
        }

        const rules = getFareRulesFromResponse(data);

        if (isMounted) {
          setFareRules(rules);
        }
      } catch (err) {
        console.error("FARE RULE ERROR:", err);

        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Unable to load fare rules.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFareRules();

    return () => {
      isMounted = false;
    };
  }, [traceId, resultIndex, sessionMissing, sessionExpired]);

  const handleSearchAgain = () => {
    navigate("/");
  };

  const handleContinueBooking = () => {
    if (sessionMissing) {
      setError("Flight session expired. Please search flights again.");
      return;
    }

    if (sessionExpired) {
      setError(
        "Your flight search session is older than 15 minutes. Please search again before booking.",
      );
      return;
    }

    if (!selectedFlight) {
      setError("Selected flight missing. Please select flight again.");
      return;
    }

    navigate("/fare-quote");
  };

  if (sessionMissing) {
    return (
      <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg text-center">Flight session expired.</p>

        <button
          type="button"
          onClick={handleSearchAgain}
          className="px-6 py-3 rounded-xl bg-linear-to-r from-start to-end text-black font-semibold"
        >
          Search Flights Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex flex-col items-center justify-center gap-4 text-(--text-main)">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-(--gold-main) rounded-full animate-spin" />
        <p className="text-sm text-(--text-muted)">Fetching Fare Rules...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-main) text-(--text-main)">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-24 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-(--gold-main)">
            Fare Rules
          </h1>

          <p className="text-sm text-(--text-muted) mt-1">
            Review the fare conditions before continuing your booking.
          </p>
        </div>

        {selectedFlight && firstSegment && lastSegment && (
          <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center justify-between md:justify-start gap-6 w-full md:w-auto">
                <div className="text-center">
                  <p className="text-xl font-bold text-(--gold-soft)">
                    {firstSegment?.Origin?.Airport?.AirportCode || "-"}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {firstSegment?.Origin?.Airport?.CityName || "-"}
                  </p>
                </div>

                <div className="text-(--gold-main) text-xl">✈</div>

                <div className="text-center">
                  <p className="text-xl font-bold text-(--gold-soft)">
                    {lastSegment?.Destination?.Airport?.AirportCode || "-"}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {lastSegment?.Destination?.Airport?.CityName || "-"}
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm font-semibold text-(--gold-main)">
                  {airline?.AirlineName || "Airline"}
                </p>

                <p className="text-xs text-(--text-muted)">
                  {airline?.AirlineCode || ""}
                  {airline?.AirlineCode && airline?.FlightNumber ? "-" : ""}
                  {airline?.FlightNumber || ""}
                </p>

                <p className="mt-2 text-xl font-bold text-(--gold-soft)">
                  ₹
                  {Number(
                    fare?.PublishedFare || fare?.OfferedFare || 0,
                  ).toLocaleString("en-IN")}
                </p>

                <span
                  className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                    selectedFlight?.IsLCC
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {selectedFlight?.IsLCC ? "LCC" : "Full Service"}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span>{error}</span>

            <button
              type="button"
              onClick={handleSearchAgain}
              className="text-(--gold-main) underline text-left md:text-right"
            >
              Search again
            </button>
          </div>
        )}

        <div className="space-y-4">
          {fareRules.length === 0 ? (
            <div className="bg-(--bg-card) border border-(--border-soft) rounded-xl p-5">
              <p className="text-sm text-(--text-muted)">
                No fare rules available for this flight.
              </p>
            </div>
          ) : (
            fareRules.map((rule, index) => {
              const origin = rule?.Origin || rule?.FromAirportCode;
              const destination = rule?.Destination || rule?.ToAirportCode;
              const airlineCode = rule?.Airline || rule?.AirlineCode;

              return (
                <div
                  key={`${origin || "rule"}-${destination || index}-${index}`}
                  className="bg-(--bg-card) border border-(--border-soft) rounded-xl shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRule(openRule === index ? null : index)
                    }
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-(--gold-soft)">
                      {origin && destination
                        ? `${origin} → ${destination}`
                        : `Fare Rule ${index + 1}`}

                      {airlineCode ? (
                        <span className="ml-2 text-xs text-(--text-muted)">
                          {airlineCode}
                        </span>
                      ) : null}
                    </span>

                    <span className="text-lg font-bold text-(--gold-main)">
                      {openRule === index ? "−" : "+"}
                    </span>
                  </button>

                  {openRule === index && (
                    <div className="px-5 pb-5 pt-3 text-sm text-(--text-muted) leading-relaxed border-t border-(--border-soft)">
                      <div
                        className="prose prose-sm max-w-none prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeFareRuleHtml(rule?.FareRuleDetail),
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-(--bg-card) border-t border-(--border-soft)">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/flights")}
            className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold border border-(--border-soft) text-(--text-main)"
          >
            Back to Results
          </button>

          <button
            type="button"
            onClick={handleContinueBooking}
            disabled={Boolean(error && sessionExpired)}
            className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-black
            bg-linear-to-r from-start to-end
            hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Continue Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default FareRule;
