import { useEffect, useMemo, useState } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

import { privateApi } from "../../../services/api";

/* =========================================================
   HELPERS
========================================================= */

const toArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const normalizeArray = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.flat(Infinity).filter(Boolean);
    }

    if (typeof value === "object") {
        return Object.values(value)
            .flat(Infinity)
            .filter(Boolean);
    }

    return [];
};

const getPrice = (value) =>
    Number(value || 0);

const getPassengerName = (passenger) =>
    `${passenger?.Title || ""} ${passenger?.FirstName || ""
        } ${passenger?.LastName || ""}`
        .replace(/\s+/g, " ")
        .trim();

const getRouteKey = ({
    Origin,
    Destination,
    AirlineCode,
    FlightNumber,
}) =>
    [
        Origin || "",
        Destination || "",
        AirlineCode || "",
        FlightNumber || "",
    ].join("-");

const getSegmentMeta = (segment) => ({
    Origin:
        segment?.Origin?.Airport?.AirportCode ||
        segment?.Origin ||
        "",

    Destination:
        segment?.Destination?.Airport?.AirportCode ||
        segment?.Destination ||
        "",

    AirlineCode:
        segment?.Airline?.AirlineCode ||
        segment?.AirlineCode ||
        "",

    FlightNumber:
        segment?.Airline?.FlightNumber ||
        segment?.FlightNumber ||
        "",
});

const getItemRouteMeta = (item) => ({
    Origin:
        item?.Origin ||
        item?.OriginCode ||
        item?.From ||
        "",

    Destination:
        item?.Destination ||
        item?.DestinationCode ||
        item?.To ||
        "",

    AirlineCode:
        item?.AirlineCode ||
        item?.Airline ||
        "",

    FlightNumber:
        item?.FlightNumber ||
        item?.FlightNo ||
        "",
});

const getMealName = (meal) =>
    meal?.AirlineDescription ||
    meal?.Description ||
    meal?.Code ||
    "Meal";

const getBaggageName = (bag) => {
    if (bag?.Weight) {
        return `${bag.Weight} KG`;
    }

    return (
        bag?.Code ||
        bag?.Description ||
        "Baggage"
    );
};

/* =========================================================
   COMPONENT
========================================================= */

const FlightAmendment = () => {
    const { bookingId } = useParams();

    const location = useLocation();
    const navigate = useNavigate();

    /* =======================================================
       PAGE STATE
    ======================================================= */

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [bookingRecord, setBookingRecord] =
        useState(null);

    const [itinerary, setItinerary] =
        useState(null);

    const [ssrData, setSsrData] =
        useState(null);

    const [amendmentTraceId, setAmendmentTraceId] =
        useState("");

    /* =======================================================
       SSR OPTIONS
    ======================================================= */

    const [meals, setMeals] =
        useState([]);

    const [baggage, setBaggage] =
        useState([]);

    const [seatGroups, setSeatGroups] =
        useState([]);

    /* =======================================================
       CURRENT UI SELECTION
    ======================================================= */

    const [activePassenger, setActivePassenger] =
        useState(0);

    const [activeSegment, setActiveSegment] =
        useState(0);

    const [activeTab, setActiveTab] =
        useState("meal");

    /*
     * Structure:
     *
     * {
     *   "paxId-routeKey": <SSR object>
     * }
     */

    const [selectedMeals, setSelectedMeals] =
        useState({});

    const [
        selectedBaggage,
        setSelectedBaggage,
    ] = useState({});

    const [selectedSeats, setSelectedSeats] =
        useState({});

    /* =======================================================
       CONFIRM MODAL
    ======================================================= */

    const [
        showConfirmModal,
        setShowConfirmModal,
    ] = useState(false);

    const [
        pendingPayload,
        setPendingPayload,
    ] = useState(null);

    const [
        submitResponse,
        setSubmitResponse,
    ] = useState(null);

    /* =======================================================
       GET BOOKING FROM MY BOOKINGS
    ======================================================= */

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError("");

                if (!bookingId) {
                    throw new Error(
                        "Booking ID is missing.",
                    );
                }

                /* ===============================================
                   1. FIND BOOKING RECORD
                =============================================== */

                let currentBooking =
                    location.state?.booking || null;

                if (!currentBooking) {
                    const { data } =
                        await privateApi.get(
                            "/api/airlines/my-bookings/",
                        );
                        

                    const bookings =
                        data?.data ||
                        data ||
                        [];

                    currentBooking =
                        toArray(bookings).find(
                            (item) =>
                                String(
                                    item?.ticket_booking_id ||
                                    item?.booking_id ||
                                    "",
                                ) === String(bookingId),
                        );
                }

                if (!currentBooking) {
                    throw new Error(
                        "Booking not found.",
                    );
                }

                if (!mounted) return;

                setBookingRecord(currentBooking);

                /* ===============================================
                   2. PNR
                =============================================== */

                const storedItinerary =
                    currentBooking?.flight_itinerary ||
                    currentBooking?.tbo_response
                        ?.Response?.Response
                        ?.FlightItinerary ||
                    currentBooking?.tbo_response
                        ?.Response?.FlightItinerary ||
                    {};

                const pnr =
                    location.state?.pnr ||
                    currentBooking?.ticket_pnr ||
                    currentBooking?.pnr ||
                    storedItinerary?.PNR;

                if (!pnr) {
                    throw new Error(
                        "PNR is missing for this booking.",
                    );
                }

                /* ===============================================
                   3. FRESH BOOKING DETAILS
                =============================================== */

                const {
                    data: bookingDetailsResponse,
                } = await privateApi.post(
                    "/api/airlines/booking-details/",
                    {
                        PNR: pnr,
                        BookingId:
                            Number(bookingId),
                    },
                );

                const freshItinerary =
                    bookingDetailsResponse?.data
                        ?.Response?.FlightItinerary ||
                    bookingDetailsResponse?.Response
                        ?.FlightItinerary ||
                    bookingDetailsResponse?.data
                        ?.Response?.Response
                        ?.FlightItinerary ||
                    null;

                if (!freshItinerary) {
                    throw new Error(
                        "Unable to load booking details.",
                    );
                }

                /* ===============================================
                   LCC ONLY VALIDATION
                =============================================== */

                const isLccFlight =
                    freshItinerary?.IsLCC === true ||
                    String(
                        freshItinerary?.IsLCC,
                    ).toLowerCase() === "true";

                if (!isLccFlight) {
                    throw new Error(
                        "Flight Amendment is available only for LCC flights.",
                    );
                }

                if (!mounted) return;

                setItinerary(freshItinerary);
                /* ===============================================
                   4. POST BOOKING SSR
                =============================================== */

                const {
                    data: postBookingSsr,
                } = await privateApi.post(
                    "/api/airlines/post-booking-ssr/",
                    {
                        BookingId:
                            Number(bookingId),
                    },
                );

                if (!postBookingSsr?.success) {
                    throw new Error(
                        postBookingSsr?.message ||
                        "Unable to load amendment SSR.",
                    );
                }

                const rawSsr =
                    postBookingSsr?.data || {};

                if (!mounted) return;

                setSsrData(rawSsr);

                setAmendmentTraceId(
                    postBookingSsr?.trace_id ||
                    rawSsr?.Response?.TraceId ||
                    rawSsr?.TraceId ||
                    "",
                );

                /* ===============================================
                   NORMALIZE TBO SSR RESPONSE
                =============================================== */

                const ssrResponse =
                    rawSsr?.Response?.Response ||
                    rawSsr?.Response ||
                    rawSsr ||
                    {};

                const mealList = normalizeArray(
                    ssrResponse?.MealDynamic,
                ).filter(
                    (item) =>
                        item?.Code &&
                        item?.Code !== "NoMeal",
                );

                const baggageList = normalizeArray(
                    ssrResponse?.Baggage,
                ).filter(
                    (item) =>
                        item?.Code &&
                        item?.Code !== "NoBaggage",
                );
                const seatDynamic = normalizeArray(
                    ssrResponse?.SeatDynamic,
                );

                const normalizedSeatGroups = [];

                seatDynamic.forEach((seatContainer) => {
                    const segmentSeats = normalizeArray(
                        seatContainer?.SegmentSeat,
                    );

                    segmentSeats.forEach((segmentSeat) => {
                        const rows = normalizeArray(
                            segmentSeat?.RowSeats,
                        );

                        const normalizedRows = rows.map((row) =>
                            normalizeArray(row?.Seats).filter(
                                (seat) =>
                                    seat?.Code &&
                                    seat?.Code !== "NoSeat",
                            ),
                        );

                        // Route information actual Seat object ke andar aa rahi hai.
                        const firstRealSeat = normalizedRows
                            .flat()
                            .find(
                                (seat) =>
                                    seat?.Origin ||
                                    seat?.Destination,
                            );

                        normalizedSeatGroups.push({
                            meta: {
                                Origin:
                                    firstRealSeat?.Origin || "",

                                Destination:
                                    firstRealSeat?.Destination || "",

                                AirlineCode:
                                    firstRealSeat?.AirlineCode || "",

                                FlightNumber:
                                    firstRealSeat?.FlightNumber || "",
                            },

                            rows: normalizedRows.filter(
                                (row) => row.length > 0,
                            ),
                        });
                    });
                });

                setMeals(mealList);
                setBaggage(baggageList);
                setSeatGroups(
                    normalizedSeatGroups,
                );
            } catch (err) {
                console.error(
                    "FLIGHT AMENDMENT LOAD ERROR 👉",
                    err,
                );

                if (mounted) {
                    setError(
                        err?.response?.data?.message ||
                        err?.message ||
                        "Unable to load flight amendment.",
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [
        bookingId,
        location.state,
    ]);

    /* =======================================================
       ITINERARY DATA
    ======================================================= */

    const passengers = useMemo(
        () =>
            toArray(
                itinerary?.Passenger,
            ),
        [itinerary],
    );

    const segments = useMemo(
        () =>
            toArray(
                itinerary?.Segments,
            ),
        [itinerary],
    );

    const currentPassenger =
        passengers?.[activePassenger] ||
        null;

    const currentSegment =
        segments?.[activeSegment] ||
        null;

    const currentSegmentMeta =
        getSegmentMeta(
            currentSegment,
        );

    const routeKey =
        getRouteKey(
            currentSegmentMeta,
        );

    const paxId =
        currentPassenger?.PaxId;

    const selectionKey =
        `${paxId || activePassenger}-${routeKey}`;

    /* =======================================================
       FILTER SSR OPTIONS BY CURRENT SEGMENT
    ======================================================= */

    const matchesSegment = (
        item,
        segmentMeta,
    ) => {
        const itemMeta =
            getItemRouteMeta(item);

        /*
         * TBO response me route metadata missing ho
         * to option hide nahi karenge.
         */

        if (
            !itemMeta.Origin &&
            !itemMeta.Destination
        ) {
            return true;
        }

        const originMatches =
            !itemMeta.Origin ||
            !segmentMeta.Origin ||
            String(
                itemMeta.Origin,
            ).toUpperCase() ===
            String(
                segmentMeta.Origin,
            ).toUpperCase();

        const destinationMatches =
            !itemMeta.Destination ||
            !segmentMeta.Destination ||
            String(
                itemMeta.Destination,
            ).toUpperCase() ===
            String(
                segmentMeta.Destination,
            ).toUpperCase();

        return (
            originMatches &&
            destinationMatches
        );
    };

    const currentMeals =
        useMemo(
            () =>
                meals.filter(
                    (item) =>
                        matchesSegment(
                            item,
                            currentSegmentMeta,
                        ),
                ),
            [
                meals,
                currentSegmentMeta.Origin,
                currentSegmentMeta.Destination,
            ],
        );

    const currentBaggage =
        useMemo(
            () =>
                baggage.filter(
                    (item) =>
                        matchesSegment(
                            item,
                            currentSegmentMeta,
                        ),
                ),
            [
                baggage,
                currentSegmentMeta.Origin,
                currentSegmentMeta.Destination,
            ],
        );

    const currentSeatGroup =
        useMemo(() => {
            if (!seatGroups.length) {
                return null;
            }

            const exact =
                seatGroups.find(
                    (group) =>
                        matchesSegment(
                            group?.meta || {},
                            currentSegmentMeta,
                        ),
                );

            return (
                exact ||
                seatGroups[
                Math.min(
                    activeSegment,
                    seatGroups.length - 1,
                )
                ]
            );
        }, [
            seatGroups,
            activeSegment,
            currentSegmentMeta.Origin,
            currentSegmentMeta.Destination,
        ]);

    /* =======================================================
       SELECTED CURRENT ITEMS
    ======================================================= */

    const currentMeal =
        selectedMeals[
        selectionKey
        ] || null;

    const currentBag =
        selectedBaggage[
        selectionKey
        ] || null;

    const currentSeat =
        selectedSeats[
        selectionKey
        ] || null;

    /* =======================================================
       MEAL
    ======================================================= */

    const handleMealChange = (
        event,
    ) => {
        const value =
            event.target.value;

        if (!value) {
            setSelectedMeals(
                (previous) => {
                    const next = {
                        ...previous,
                    };

                    delete next[
                        selectionKey
                    ];

                    return next;
                },
            );

            return;
        }

        const selected =
            currentMeals.find(
                (_, index) =>
                    String(index) ===
                    String(value),
            );

        if (!selected) return;

        setSelectedMeals(
            (previous) => ({
                ...previous,

                [selectionKey]: {
                    ...selected,

                    PaxId:
                        paxId,

                    PassengerIndex:
                        activePassenger,
                },
            }),
        );
    };

    /* =======================================================
       BAGGAGE
    ======================================================= */

    const handleBaggageChange = (
        event,
    ) => {
        const value =
            event.target.value;

        if (!value) {
            setSelectedBaggage(
                (previous) => {
                    const next = {
                        ...previous,
                    };

                    delete next[
                        selectionKey
                    ];

                    return next;
                },
            );

            return;
        }

        const selected =
            currentBaggage.find(
                (_, index) =>
                    String(index) ===
                    String(value),
            );

        if (!selected) return;

        setSelectedBaggage(
            (previous) => ({
                ...previous,

                [selectionKey]: {
                    ...selected,

                    PaxId:
                        paxId,

                    PassengerIndex:
                        activePassenger,
                },
            }),
        );
    };

    /* =======================================================
       SEAT
    ======================================================= */

    const getSeatKey = (
        seat,
    ) =>
        [
            seat?.Code || "",
            seat?.Origin || "",
            seat?.Destination || "",
            seat?.AirlineCode || "",
            seat?.FlightNumber || "",
        ].join("-");

    const handleSeatClick = (
        seat,
    ) => {
        const unavailable =
            Number(
                seat?.AvailablityType,
            ) !== 1;

        if (unavailable) {
            return;
        }

        const seatKey =
            getSeatKey(seat);

        /*
         * Same segment par same seat
         * another passenger ko na mile.
         */

        const alreadyTaken =
            Object.entries(
                selectedSeats,
            ).find(
                ([key, value]) =>
                    key !== selectionKey &&
                    key.endsWith(
                        routeKey,
                    ) &&
                    getSeatKey(value) ===
                    seatKey,
            );

        if (alreadyTaken) {
            alert(
                `Seat ${seat?.Code || ""
                } is already selected for another passenger.`,
            );

            return;
        }

        if (
            currentSeat &&
            getSeatKey(
                currentSeat,
            ) === seatKey
        ) {
            setSelectedSeats(
                (previous) => {
                    const next = {
                        ...previous,
                    };

                    delete next[
                        selectionKey
                    ];

                    return next;
                },
            );

            return;
        }

        setSelectedSeats(
            (previous) => ({
                ...previous,

                [selectionKey]: {
                    ...seat,

                    PaxId:
                        paxId,

                    PassengerIndex:
                        activePassenger,
                },
            }),
        );
    };

    /* =======================================================
       PRICE SUMMARY
    ======================================================= */

    const selectedMealValues =
        Object.values(
            selectedMeals,
        );

    const selectedBagValues =
        Object.values(
            selectedBaggage,
        );

    const selectedSeatValues =
        Object.values(
            selectedSeats,
        );

    const mealTotal =
        selectedMealValues.reduce(
            (total, item) =>
                total +
                getPrice(
                    item?.Price,
                ),
            0,
        );

    const baggageTotal =
        selectedBagValues.reduce(
            (total, item) =>
                total +
                getPrice(
                    item?.Price,
                ),
            0,
        );

    const seatTotal =
        selectedSeatValues.reduce(
            (total, item) =>
                total +
                getPrice(
                    item?.Price,
                ),
            0,
        );

    const amendmentTotal =
        mealTotal +
        baggageTotal +
        seatTotal;

    const hasAnySelection =
        selectedMealValues.length >
        0 ||
        selectedBagValues.length >
        0 ||
        selectedSeatValues.length >
        0;

    /* =======================================================
       BUILD TICKET REISSUE SSR PAYLOAD
    ======================================================= */

    const buildSSRPayload = () => {
        return passengers
            .map(
                (
                    passenger,
                    passengerIndex,
                ) => {
                    const passengerPaxId =
                        passenger?.PaxId;

                    const mealItems =
                        Object.values(
                            selectedMeals,
                        )
                            .filter(
                                (item) =>
                                    Number(
                                        item?.PaxId,
                                    ) ===
                                    Number(
                                        passengerPaxId,
                                    ) ||
                                    item?.PassengerIndex ===
                                    passengerIndex,
                            )
                            .map(
                                ({
                                    PaxId,
                                    PassengerIndex,
                                    ...item
                                }) => item,
                            );

                    const baggageItems =
                        Object.values(
                            selectedBaggage,
                        )
                            .filter(
                                (item) =>
                                    Number(
                                        item?.PaxId,
                                    ) ===
                                    Number(
                                        passengerPaxId,
                                    ) ||
                                    item?.PassengerIndex ===
                                    passengerIndex,
                            )
                            .map(
                                ({
                                    PaxId,
                                    PassengerIndex,
                                    ...item
                                }) => item,
                            );

                    const seatItems =
                        Object.values(
                            selectedSeats,
                        )
                            .filter(
                                (item) =>
                                    Number(
                                        item?.PaxId,
                                    ) ===
                                    Number(
                                        passengerPaxId,
                                    ) ||
                                    item?.PassengerIndex ===
                                    passengerIndex,
                            )
                            .map(
                                ({
                                    PaxId,
                                    PassengerIndex,
                                    ...item
                                }) => item,
                            );

                    if (
                        !mealItems.length &&
                        !baggageItems.length &&
                        !seatItems.length
                    ) {
                        return null;
                    }

                    return {
                        PaxId:
                            passengerPaxId,

                        MealDynamic:
                            mealItems,

                        Baggage:
                            baggageItems,

                        SeatDynamic:
                            seatItems,
                    };
                },
            )
            .filter(Boolean);
    };

    /* =======================================================
       SUBMIT → ONLY OPEN CONFIRMATION
    ======================================================= */

    const handleSubmitAmendment = () => {
        if (!hasAnySelection) {
            alert(
                "Please select at least one Meal, Baggage or Seat.",
            );

            return;
        }

        if (!amendmentTraceId) {
            alert(
                "Amendment TraceId is missing. Please reload the page.",
            );

            return;
        }

        const ssrPayload =
            buildSSRPayload();

        if (!ssrPayload.length) {
            alert(
                "No amendment SSR selected.",
            );

            return;
        }

        const payload = {
            TraceId:
                amendmentTraceId,

            BookingId:
                Number(
                    bookingId,
                ),

            SSR:
                ssrPayload,
        };

        console.log(
            "AMENDMENT CONFIRM PAYLOAD 👉",
            payload,
        );

        setPendingPayload(
            payload,
        );

        setShowConfirmModal(
            true,
        );
    };

    /* =======================================================
       CONFIRM → ACTUAL TICKET REISSUE API
    ======================================================= */

    const handleConfirmAmendment =
        async () => {
            if (
                !pendingPayload ||
                submitting
            ) {
                return;
            }

            try {
                setSubmitting(true);

                const { data } =
                    await privateApi.post(
                        "/api/airlines/ticket-reissue/",
                        pendingPayload,
                    );

                console.log(
                    "TICKET REISSUE RESPONSE 👉",
                    data,
                );

                if (!data?.success) {
                    throw new Error(
                        data?.message ||
                        "Flight amendment failed.",
                    );
                }

                setSubmitResponse(
                    data,
                );

                setShowConfirmModal(
                    false,
                );

                alert(
                    data?.message ||
                    "Flight amendment submitted successfully.",
                );

                navigate(
                    "/bookings",
                );
            } catch (err) {
                console.error(
                    "TICKET REISSUE ERROR 👉",
                    err,
                );

                alert(
                    err?.response?.data
                        ?.message ||
                    err?.message ||
                    "Unable to submit flight amendment.",
                );
            } finally {
                setSubmitting(false);
            }
        };

    /* =======================================================
       LOADING
    ======================================================= */

    if (loading) {
        return (
            <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex items-center justify-center">
                <div className="text-center">
                    <div className="text-(--gold-main) font-semibold text-lg">
                        Loading Flight Amendment...
                    </div>

                    <p className="text-sm text-(--text-muted) mt-2">
                        Fetching available meals,
                        baggage and seats.
                    </p>
                </div>
            </div>
        );
    }

    /* =======================================================
       ERROR
    ======================================================= */

    if (error) {
        return (
            <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex flex-col items-center justify-center px-4">
                <p className="text-red-400 font-semibold text-center">
                    {error}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/bookings",
                        )
                    }
                    className="mt-5 px-6 py-3 rounded-xl bg-linear-to-r from-start to-end text-black font-semibold"
                >
                    Back to My Bookings
                </button>
            </div>
        );
    }

    /* =======================================================
       UI
    ======================================================= */

    return (
        <>
            <div className="min-h-screen bg-(--bg-main) text-(--text-main)">
                <div className="max-w-6xl mx-auto px-4 py-24">

                    {/* ===============================================
              PAGE HEADER
          =============================================== */}

                    <div className="mb-8">
                        <p className="text-sm text-(--gold-soft) uppercase tracking-[0.2em]">
                            Post Booking Service
                        </p>

                        <h1 className="text-2xl md:text-3xl font-bold mt-2">
                            Flight Amendment
                        </h1>

                        <p className="text-(--text-muted) text-sm mt-2">
                            Add or modify Meal,
                            Baggage and Seat services
                            for your ticketed booking.
                        </p>
                    </div>

                    {/* ===============================================
              BOOKING SUMMARY
          =============================================== */}

                    <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-5 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

                            <div>
                                <p className="text-xs text-(--text-muted)">
                                    Booking ID
                                </p>

                                <p className="font-semibold mt-1">
                                    {bookingId}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-(--text-muted)">
                                    PNR
                                </p>

                                <p className="font-semibold mt-1">
                                    {itinerary?.PNR ||
                                        bookingRecord?.pnr ||
                                        bookingRecord
                                            ?.ticket_pnr ||
                                        "--"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-(--text-muted)">
                                    Origin
                                </p>

                                <p className="font-semibold mt-1">
                                    {itinerary?.Origin ||
                                        segments?.[0]?.Origin
                                            ?.Airport
                                            ?.AirportCode ||
                                        "--"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-(--text-muted)">
                                    Destination
                                </p>

                                <p className="font-semibold mt-1">
                                    {itinerary?.Destination ||
                                        segments[
                                            segments.length - 1
                                        ]?.Destination
                                            ?.Airport
                                            ?.AirportCode ||
                                        "--"}
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* ===============================================
              PASSENGERS
          =============================================== */}

                    <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-4 mb-6">

                        <p className="font-semibold text-(--gold-soft) mb-3">
                            Passenger
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {passengers.map(
                                (
                                    passenger,
                                    index,
                                ) => (
                                    <button
                                        key={
                                            passenger?.PaxId ||
                                            index
                                        }
                                        type="button"
                                        onClick={() =>
                                            setActivePassenger(
                                                index,
                                            )
                                        }
                                        className={`px-4 py-2.5 rounded-xl border text-sm transition ${activePassenger ===
                                            index
                                            ? "bg-linear-to-r from-start to-end text-black border-transparent"
                                            : "bg-(--bg-secondary) border-(--border-soft) hover:border-(--gold-soft)"
                                            }`}
                                    >
                                        {getPassengerName(
                                            passenger,
                                        ) ||
                                            `Passenger ${index + 1
                                            }`}
                                    </button>
                                ),
                            )}
                        </div>

                    </div>

                    {/* ===============================================
              SEGMENT
          =============================================== */}

                    {segments.length > 1 && (
                        <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-4 mb-6">

                            <p className="font-semibold text-(--gold-soft) mb-3">
                                Flight Sector
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {segments.map(
                                    (
                                        segment,
                                        index,
                                    ) => {
                                        const meta =
                                            getSegmentMeta(
                                                segment,
                                            );

                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() =>
                                                    setActiveSegment(
                                                        index,
                                                    )
                                                }
                                                className={`px-4 py-2.5 rounded-xl border text-sm ${activeSegment ===
                                                    index
                                                    ? "bg-(--gold-soft) text-black border-transparent"
                                                    : "bg-(--bg-secondary) border-(--border-soft)"
                                                    }`}
                                            >
                                                {meta.Origin ||
                                                    "--"}{" "}
                                                →{" "}
                                                {meta.Destination ||
                                                    "--"}
                                            </button>
                                        );
                                    },
                                )}
                            </div>

                        </div>
                    )}

                    {/* ===============================================
              SERVICE TABS
          =============================================== */}

                    <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl overflow-hidden">

                        <div className="grid grid-cols-3 border-b border-(--border-soft)">

                            {[
                                {
                                    key: "meal",
                                    label: "Meal",
                                },
                                {
                                    key: "baggage",
                                    label: "Baggage",
                                },
                                {
                                    key: "seat",
                                    label: "Select Seat",
                                },
                            ].map(
                                (tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() =>
                                            setActiveTab(
                                                tab.key,
                                            )
                                        }
                                        className={`py-4 text-sm md:text-base font-semibold transition ${activeTab ===
                                            tab.key
                                            ? "bg-linear-to-r from-start to-end text-black"
                                            : "text-(--text-muted) hover:text-(--gold-soft)"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ),
                            )}

                        </div>

                        <div className="p-5 md:p-7">

                            {/* ===========================================
                  ROUTE INFO
              =========================================== */}

                            <div className="mb-6">
                                <p className="font-semibold">
                                    {getPassengerName(
                                        currentPassenger,
                                    ) ||
                                        `Passenger ${activePassenger +
                                        1
                                        }`}
                                </p>

                                <p className="text-sm text-(--text-muted) mt-1">
                                    {currentSegmentMeta.Origin ||
                                        "--"}{" "}
                                    →{" "}
                                    {currentSegmentMeta.Destination ||
                                        "--"}

                                    {currentSegmentMeta.AirlineCode
                                        ? ` • ${currentSegmentMeta.AirlineCode}${currentSegmentMeta.FlightNumber}`
                                        : ""}
                                </p>
                            </div>

                            {/* ===========================================
                  MEAL
              =========================================== */}

                            {activeTab ===
                                "meal" && (
                                    <div className="max-w-2xl">

                                        <label className="block text-sm font-semibold mb-2 text-(--gold-soft)">
                                            Meal Preference
                                        </label>

                                        <select
                                            value={
                                                currentMeal
                                                    ? String(
                                                        currentMeals.findIndex(
                                                            (item) =>
                                                                item ===
                                                                currentMeal ||
                                                                item?.Code ===
                                                                currentMeal?.Code,
                                                        ),
                                                    )
                                                    : ""
                                            }
                                            onChange={
                                                handleMealChange
                                            }
                                            className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3.5 outline-none focus:border-(--gold-soft)"
                                        >
                                            <option value="">
                                                No Meal
                                            </option>

                                            {currentMeals.map(
                                                (
                                                    meal,
                                                    index,
                                                ) => (
                                                    <option
                                                        key={`${meal?.Code || "meal"}-${index}`}
                                                        value={index}
                                                    >
                                                        {getMealName(
                                                            meal,
                                                        )}{" "}
                                                        - ₹
                                                        {getPrice(
                                                            meal?.Price,
                                                        )}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {currentMeal && (
                                            <div className="mt-4 bg-(--bg-secondary) border border-(--border-soft) rounded-xl p-4">
                                                <p className="text-xs text-(--text-muted)">
                                                    Selected Meal
                                                </p>

                                                <p className="font-semibold mt-1">
                                                    {getMealName(
                                                        currentMeal,
                                                    )}
                                                </p>

                                                <p className="text-(--gold-soft) font-semibold mt-1">
                                                    ₹
                                                    {getPrice(
                                                        currentMeal
                                                            ?.Price,
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {!currentMeals.length && (
                                            <p className="mt-4 text-sm text-(--text-muted)">
                                                No meal options
                                                available for this
                                                sector.
                                            </p>
                                        )}

                                    </div>
                                )}

                            {/* ===========================================
                  BAGGAGE
              =========================================== */}

                            {activeTab ===
                                "baggage" && (
                                    <div className="max-w-2xl">

                                        <label className="block text-sm font-semibold mb-2 text-(--gold-soft)">
                                            Extra Baggage
                                        </label>

                                        <select
                                            value={
                                                currentBag
                                                    ? String(
                                                        currentBaggage.findIndex(
                                                            (item) =>
                                                                item ===
                                                                currentBag ||
                                                                item?.Code ===
                                                                currentBag?.Code,
                                                        ),
                                                    )
                                                    : ""
                                            }
                                            onChange={
                                                handleBaggageChange
                                            }
                                            className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3.5 outline-none focus:border-(--gold-soft)"
                                        >
                                            <option value="">
                                                No Extra Baggage
                                            </option>

                                            {currentBaggage.map(
                                                (
                                                    bag,
                                                    index,
                                                ) => (
                                                    <option
                                                        key={`${bag?.Code || "bag"}-${index}`}
                                                        value={index}
                                                    >
                                                        {getBaggageName(
                                                            bag,
                                                        )}{" "}
                                                        - ₹
                                                        {getPrice(
                                                            bag?.Price,
                                                        )}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {currentBag && (
                                            <div className="mt-4 bg-(--bg-secondary) border border-(--border-soft) rounded-xl p-4">

                                                <p className="text-xs text-(--text-muted)">
                                                    Selected Baggage
                                                </p>

                                                <p className="font-semibold mt-1">
                                                    {getBaggageName(
                                                        currentBag,
                                                    )}
                                                </p>

                                                <p className="text-(--gold-soft) font-semibold mt-1">
                                                    ₹
                                                    {getPrice(
                                                        currentBag?.Price,
                                                    )}
                                                </p>

                                            </div>
                                        )}

                                        {!currentBaggage.length && (
                                            <p className="mt-4 text-sm text-(--text-muted)">
                                                No baggage options
                                                available for this
                                                sector.
                                            </p>
                                        )}

                                    </div>
                                )}

                            {/* ===========================================
                  SEAT
              =========================================== */}

                            {activeTab ===
                                "seat" && (
                                    <div>

                                        {currentSeat && (
                                            <div className="mb-5 flex items-center justify-between gap-4 bg-(--bg-secondary) border border-(--border-soft) rounded-xl p-4">

                                                <div>
                                                    <p className="text-xs text-(--text-muted)">
                                                        Selected Seat
                                                    </p>

                                                    <p className="font-semibold mt-1">
                                                        {
                                                            currentSeat?.Code
                                                        }
                                                    </p>

                                                    <p className="text-(--gold-soft) text-sm">
                                                        ₹
                                                        {getPrice(
                                                            currentSeat
                                                                ?.Price,
                                                        )}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedSeats(
                                                            (
                                                                previous,
                                                            ) => {
                                                                const next = {
                                                                    ...previous,
                                                                };

                                                                delete next[
                                                                    selectionKey
                                                                ];

                                                                return next;
                                                            },
                                                        )
                                                    }
                                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                                                >
                                                    Remove
                                                </button>

                                            </div>
                                        )}

                                        <div className="flex gap-4 flex-wrap text-xs mb-5">
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-(--bg-secondary) border border-(--border-soft)" />
                                                Available
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-(--gold-soft)" />
                                                Paid
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-green-600" />
                                                Selected
                                            </span>

                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-gray-600" />
                                                Unavailable
                                            </span>
                                        </div>

                                        {currentSeatGroup
                                            ?.rows?.length >
                                            0 ? (
                                            <div className="overflow-x-auto">
                                                <div className="min-w-max mx-auto space-y-2">

                                                    {currentSeatGroup.rows.map(
                                                        (
                                                            row,
                                                            rowIndex,
                                                        ) => (
                                                            <div
                                                                key={
                                                                    rowIndex
                                                                }
                                                                className="flex justify-center gap-2"
                                                            >
                                                                {row.map(
                                                                    (
                                                                        seat,
                                                                        seatIndex,
                                                                    ) => {
                                                                        const unavailable =
                                                                            Number(
                                                                                seat?.AvailablityType,
                                                                            ) !== 1;

                                                                        const selected =
                                                                            currentSeat &&
                                                                            getSeatKey(
                                                                                currentSeat,
                                                                            ) ===
                                                                            getSeatKey(
                                                                                seat,
                                                                            );

                                                                        const price =
                                                                            getPrice(
                                                                                seat?.Price,
                                                                            );

                                                                        return (
                                                                            <button
                                                                                key={`${seat?.Code || "seat"}-${seatIndex}`}
                                                                                type="button"
                                                                                disabled={
                                                                                    unavailable
                                                                                }
                                                                                onClick={() =>
                                                                                    handleSeatClick(
                                                                                        seat,
                                                                                    )
                                                                                }
                                                                                className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center text-[10px] transition ${unavailable
                                                                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed border-gray-700"
                                                                                    : selected
                                                                                        ? "bg-green-600 text-white border-green-500"
                                                                                        : price >
                                                                                            0
                                                                                            ? "bg-(--gold-soft) text-black border-transparent hover:opacity-90"
                                                                                            : "bg-(--bg-secondary) border-(--border-soft) hover:border-(--gold-soft)"
                                                                                    }`}
                                                                            >
                                                                                <span className="font-semibold">
                                                                                    {seat?.Code ||
                                                                                        "-"}
                                                                                </span>

                                                                                {price >
                                                                                    0 && (
                                                                                        <span>
                                                                                            ₹
                                                                                            {
                                                                                                price
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                            </button>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        ),
                                                    )}

                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-(--text-muted)">
                                                No seat map
                                                available for this
                                                sector.
                                            </p>
                                        )}

                                    </div>
                                )}

                        </div>
                    </div>

                    {/* ===============================================
              PRICE SUMMARY
          =============================================== */}

                    <div className="mt-6 grid md:grid-cols-[1fr_360px] gap-5">

                        <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-5">
                            <h3 className="font-semibold text-(--gold-soft)">
                                Amendment Information
                            </h3>

                            <p className="text-sm text-(--text-muted) mt-2 leading-6">
                                Review your meal,
                                baggage and seat
                                selections carefully.
                                Charges are subject to
                                airline confirmation.
                            </p>
                        </div>

                        <div className="bg-(--bg-card) border border-(--border-soft) rounded-2xl p-5">

                            <h3 className="font-semibold mb-4">
                                Amendment Charges
                            </h3>

                            <div className="space-y-3 text-sm">

                                <div className="flex justify-between">
                                    <span className="text-(--text-muted)">
                                        Meal
                                    </span>

                                    <span>
                                        ₹
                                        {mealTotal.toFixed(
                                            2,
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-(--text-muted)">
                                        Baggage
                                    </span>

                                    <span>
                                        ₹
                                        {baggageTotal.toFixed(
                                            2,
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-(--text-muted)">
                                        Seat
                                    </span>

                                    <span>
                                        ₹
                                        {seatTotal.toFixed(
                                            2,
                                        )}
                                    </span>
                                </div>

                                <div className="border-t border-(--border-soft) pt-3 flex justify-between font-bold text-lg">
                                    <span>
                                        Total
                                    </span>

                                    <span className="text-(--gold-soft)">
                                        ₹
                                        {amendmentTotal.toFixed(
                                            2,
                                        )}
                                    </span>
                                </div>

                            </div>

                        </div>

                    </div>

                    {/* ===============================================
              ACTIONS
          =============================================== */}

                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-7">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/bookings",
                                )
                            }
                            className="px-6 py-3 rounded-xl bg-(--bg-card) border border-(--border-soft) hover:border-(--gold-soft)"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleSubmitAmendment
                            }
                            disabled={
                                !hasAnySelection
                            }
                            className={`px-6 py-3 rounded-xl font-semibold ${hasAnySelection
                                ? "bg-linear-to-r from-start to-end text-black hover:opacity-90"
                                : "bg-gray-600 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            Submit Amendment
                        </button>

                    </div>

                </div>
            </div>

            {/* ===================================================
          CONFIRMATION MODAL
      =================================================== */}

            {showConfirmModal && (
                <div className="fixed inset-0 z-[300] bg-black/75 flex items-center justify-center p-4">

                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-(--bg-card) text-(--text-main) border border-(--border-soft) rounded-2xl shadow-2xl">

                        {/* HEADER */}

                        <div className="px-5 py-4 border-b border-(--border-soft) flex justify-between items-center">

                            <div>
                                <h2 className="text-xl font-bold">
                                    Confirm Flight Amendment
                                </h2>

                                <p className="text-xs text-(--text-muted) mt-1">
                                    Please verify all
                                    selected services before
                                    submitting.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    submitting
                                }
                                onClick={() =>
                                    setShowConfirmModal(
                                        false,
                                    )
                                }
                                className="text-xl"
                            >
                                ✕
                            </button>

                        </div>

                        {/* BODY */}

                        <div className="p-5 space-y-5">

                            <div className="grid grid-cols-2 gap-4 text-sm">

                                <div>
                                    <p className="text-(--text-muted)">
                                        Booking ID
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {bookingId}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-(--text-muted)">
                                        PNR
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {itinerary?.PNR ||
                                            "--"}
                                    </p>
                                </div>

                            </div>

                            {/* SELECTED ITEMS */}

                            {passengers.map(
                                (
                                    passenger,
                                    passengerIndex,
                                ) => {
                                    const paxItems = [
                                        ...Object.values(
                                            selectedMeals,
                                        )
                                            .filter(
                                                (item) =>
                                                    item?.PassengerIndex ===
                                                    passengerIndex,
                                            )
                                            .map(
                                                (item) => ({
                                                    type:
                                                        "Meal",
                                                    name:
                                                        getMealName(
                                                            item,
                                                        ),
                                                    price:
                                                        getPrice(
                                                            item?.Price,
                                                        ),
                                                }),
                                            ),

                                        ...Object.values(
                                            selectedBaggage,
                                        )
                                            .filter(
                                                (item) =>
                                                    item?.PassengerIndex ===
                                                    passengerIndex,
                                            )
                                            .map(
                                                (item) => ({
                                                    type:
                                                        "Baggage",
                                                    name:
                                                        getBaggageName(
                                                            item,
                                                        ),
                                                    price:
                                                        getPrice(
                                                            item?.Price,
                                                        ),
                                                }),
                                            ),

                                        ...Object.values(
                                            selectedSeats,
                                        )
                                            .filter(
                                                (item) =>
                                                    item?.PassengerIndex ===
                                                    passengerIndex,
                                            )
                                            .map(
                                                (item) => ({
                                                    type:
                                                        "Seat",
                                                    name:
                                                        item?.Code ||
                                                        "Seat",
                                                    price:
                                                        getPrice(
                                                            item?.Price,
                                                        ),
                                                }),
                                            ),
                                    ];

                                    if (
                                        !paxItems.length
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={
                                                passenger?.PaxId ||
                                                passengerIndex
                                            }
                                            className="border border-(--border-soft) rounded-xl p-4"
                                        >

                                            <p className="font-semibold text-(--gold-soft) mb-3">
                                                {getPassengerName(
                                                    passenger,
                                                )}
                                            </p>

                                            <div className="space-y-2">

                                                {paxItems.map(
                                                    (
                                                        item,
                                                        index,
                                                    ) => (
                                                        <div
                                                            key={
                                                                index
                                                            }
                                                            className="flex justify-between gap-4 text-sm"
                                                        >
                                                            <div>
                                                                <span className="text-(--text-muted)">
                                                                    {
                                                                        item.type
                                                                    }
                                                                    :
                                                                </span>{" "}

                                                                <span>
                                                                    {
                                                                        item.name
                                                                    }
                                                                </span>
                                                            </div>

                                                            <span className="font-semibold">
                                                                ₹
                                                                {
                                                                    item.price
                                                                }
                                                            </span>
                                                        </div>
                                                    ),
                                                )}

                                            </div>

                                        </div>
                                    );
                                },
                            )}

                            {/* TOTAL */}

                            <div className="border-t border-(--border-soft) pt-4 flex justify-between text-lg font-bold">

                                <span>
                                    Total Amendment Charges
                                </span>

                                <span className="text-(--gold-soft)">
                                    ₹
                                    {amendmentTotal.toFixed(
                                        2,
                                    )}
                                </span>

                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl p-3 text-sm">
                                Once submitted, the
                                amendment request will be
                                sent to the airline. Please
                                confirm all details carefully.
                            </div>

                        </div>

                        {/* FOOTER */}

                        <div className="border-t border-(--border-soft) p-4 flex flex-col sm:flex-row justify-end gap-3">

                            <button
                                type="button"
                                disabled={
                                    submitting
                                }
                                onClick={() =>
                                    setShowConfirmModal(
                                        false,
                                    )
                                }
                                className="px-5 py-3 rounded-xl border border-(--border-soft)"
                            >
                                Back / Edit
                            </button>

                            <button
                                type="button"
                                disabled={
                                    submitting
                                }
                                onClick={
                                    handleConfirmAmendment
                                }
                                className="px-5 py-3 rounded-xl bg-linear-to-r from-start to-end text-black font-semibold disabled:opacity-60"
                            >
                                {submitting
                                    ? "Submitting..."
                                    : "Confirm & Submit"}
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default FlightAmendment;