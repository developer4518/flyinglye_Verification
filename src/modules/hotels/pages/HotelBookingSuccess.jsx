"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { sendHotelChangeRequest } from "../../../services/sendHotelChangeRequest";

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `₹ ${Math.round(amount).toLocaleString("en-IN")}`;
};

const getNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
    return 1;
  }

  const diff = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

const getRoomData = (saved, bookingData) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.room ||
    saved?.selectedRoom ||
    saved?.room ||
    bookingData?.HotelRoomsDetails?.[0] ||
    {}
  );
};

const getHotelResult = (saved) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0] ||
    saved?.hotel?.hotel_raw ||
    {}
  );
};

const HotelBookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState(null);
  const [changeError, setChangeError] = useState(null);

  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [guestDetails, setGuestDetails] = useState([]);
  const [savedData, setSavedData] = useState({});

  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = safeJsonParse(localStorage.getItem("hotelBookingData"), {});

      let bookingData = location.state?.booking;

      if (!bookingData) {
        bookingData = saved.bookingResponse;
      }

      if (!bookingData) throw new Error("No booking data");

      const finalBooking =
        bookingData?.data ||
        bookingData?.Data ||
        bookingData?.Response ||
        bookingData;

      setBooking(finalBooking);
      setSavedData(saved);
      setHotel(saved.hotel || finalBooking?.HotelDetails || {});
      setGuestDetails(saved.guestList || finalBooking?.HotelPassenger || []);
    } catch (err) {
      console.error("BOOKING LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const hotelResult = useMemo(() => getHotelResult(savedData), [savedData]);

  const roomName = useMemo(() => {
    const name =
      roomData?.Name?.[0] ||
      roomData?.RoomName ||
      roomData?.RoomTypeName ||
      roomData?.RoomType ||
      roomData?.Name ||
      booking?.HotelRoomsDetails?.[0]?.RoomTypeName ||
      "Room";

    return Array.isArray(name) ? name[0] : name;
  }, [roomData, booking]);

  const inclusion =
    roomData?.Inclusion ||
    roomData?.MealType ||
    booking?.HotelRoomsDetails?.[0]?.MealType ||
    "Room Only";

  const roomPromotion =
    roomData?.RoomPromotion?.[0] ||
    roomData?.RoomPromotions?.[0] ||
    roomData?.Promotion ||
    "";

  const amenities = useMemo(() => {
    const list =
      roomData?.Amenities ||
      roomData?.RoomAmenities ||
      roomData?.amenities ||
      hotel?.amenities ||
      [];

    if (Array.isArray(list)) return list.join(", ");
    return list || "N.A.";
  }, [roomData, hotel]);

  const cancelPolicies = useMemo(() => {
    return (
      roomData?.CancelPolicies ||
      roomData?.CancellationPolicies ||
      booking?.HotelRoomsDetails?.[0]?.CancellationPolicies ||
      []
    );
  }, [roomData, booking]);

  const hotelNorms = useMemo(() => {
    const norms =
      hotelResult?.HotelNorms ||
      hotel?.HotelNorms ||
      hotel?.hotel_norms ||
      roomData?.HotelNorms ||
      [];

    if (Array.isArray(norms)) return norms;
    if (typeof norms === "string") return norms.split("|").filter(Boolean);
    return [];
  }, [hotelResult, hotel, roomData]);

  const supplements = useMemo(() => {
    const data = roomData?.Supplements || roomData?.Supplement || [];
    if (!Array.isArray(data)) return [];
    return data.flat?.() || data;
  }, [roomData]);

  const checkIn =
    savedData?.checkIn ||
    booking?.CheckInDate ||
    booking?.HotelCheckIn ||
    booking?.CheckIn;

  const checkOut =
    savedData?.checkOut ||
    booking?.CheckOutDate ||
    booking?.HotelCheckOut ||
    booking?.CheckOut;

  const nights = getNights(checkIn, checkOut);

  const netAmount =
    savedData?.net ||
    booking?.NetAmount ||
    booking?.TotalAmount ||
    booking?.InvoiceAmount ||
    roomData?.TotalFare ||
    0;

  const offeredRate = roomData?.TotalFare || netAmount;

  const publishedRate =
    roomData?.PublishedPrice ||
    roomData?.PublishedFare ||
    roomData?.Price?.PublishedPrice ||
    offeredRate;

  const tax = roomData?.TotalTax || booking?.TotalTax || 0;
  const tds = booking?.TDS || booking?.Tds || 0;
  const commission = booking?.Commission || booking?.CommEarned || 0;
  const gst = booking?.TotalGSTAmount || booking?.GST || 0;

  const adultCount = guestDetails.filter(
    (g) => Number(g.PaxType) === 1 || Number(g.Age) >= 12,
  ).length;

  const childCount = guestDetails.filter(
    (g) => Number(g.PaxType) === 2 || Number(g.Age) < 12,
  ).length;

  const handleInvoiceClick = () => {
    navigate(`/hotel-invoice/${booking.BookingId}`, {
      state: {
        booking,
        hotel,
        guestDetails,
        savedData,
        fullResponse: savedData?.bookingResponse || booking,
        prebookData: savedData?.prebookData,
      },
    });
  };

  const handleVoucherClick = () => {
    navigate(`/booking-details/${booking.BookingId}`, {
      state: {
        booking,
        hotel,
        guestDetails,
        savedData,
      },
    });
  };

  const handleChangeRequest = async () => {
    const remarks = window.prompt("Enter cancellation/change request reason");
    if (!remarks) return;

    try {
      setChangeLoading(true);
      setChangeMsg(null);
      setChangeError(null);

      const res = await sendHotelChangeRequest(booking.BookingId, remarks);

      if (res?.success) {
        setChangeMsg(
          `${res.message || "Change request raised successfully"}${
            res.data?.ChangeRequestId
              ? ` (Request ID: ${res.data.ChangeRequestId})`
              : ""
          }`,
        );
      } else {
        setChangeError(
          res?.message || res?.Error?.ErrorMessage || "Change request failed",
        );
      }
    } catch (err) {
      setChangeError(
        err?.response?.data?.message ||
          err?.response?.data?.Error?.ErrorMessage ||
          "Something went wrong",
      );
    } finally {
      setChangeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--gold-soft)] font-[var(--font-body)]">
        Loading booking...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 text-center font-[var(--font-body)]">
        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Booking not found
        </h2>

        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] text-black font-bold shadow-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-26 px-3 md:px-8 font-[var(--font-body)]">
      <div className="max-w-7xl mx-auto">
        {/* TOP HEADER */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[var(--border-soft)]">
            <h1 className="text-2xl font-bold text-[var(--gold-main)] font-[var(--font-heading)] tracking-wide">
              Booking Details
            </h1>

            <div className="flex flex-wrap gap-2">
              <GoldButton onClick={() => navigate(-1)}>
                &lt;&lt; Back To Queue
              </GoldButton>

              <GoldButton
                onClick={() => {
                  setViewLoading(true);
                  handleVoucherClick();
                }}
              >
                {viewLoading ? "Loading..." : "View Voucher"}
              </GoldButton>

              <button className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 transition">
                WhatsApp
              </button>
            </div>
          </div>

          <div className="px-5 py-6 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="inline-block bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] text-black px-3 py-1.5 font-bold rounded-xl text-sm shadow-lg">
                FLYINGLYTE (Delhi)
              </p>
              <br />
              <p className="inline-block mt-2 border border-[var(--gold-dark)] text-[var(--gold-soft)] px-3 py-1.5 font-bold rounded-xl text-sm">
                Delhi
              </p>
            </div>

            <div className="text-sm md:text-right text-[var(--text-muted)]">
              <p>
                Confirmation No :{" "}
                <span className="text-[var(--gold-soft)] font-bold">
                  {booking?.ConfirmationNo || "N/A"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* HOTEL SUMMARY */}
        <div className="mt-5 bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center shadow-xl shadow-black/20">
          <div className="lg:col-span-7 flex gap-4">
            <div className="w-28 h-24 bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl flex items-center justify-center text-5xl text-[var(--gold-dark)] shrink-0">
              🛏️
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--gold-main)] font-[var(--font-heading)]">
                {hotel?.hotel_name ||
                  hotel?.HotelName ||
                  booking?.HotelName ||
                  "Hotel"}
                <span className="ml-2 text-[var(--color-start)] text-sm">
                  ★★★
                </span>
              </h2>

              <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                {hotel?.address ||
                  hotel?.Address ||
                  booking?.HotelAddress ||
                  hotelResult?.HotelAddress ||
                  "Hotel address not available"}
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 text-sm lg:text-right text-[var(--text-muted)] space-y-1">
            <p>
              Check In :{" "}
              <span className="font-bold text-white">
                {formatDate(checkIn)}
              </span>
            </p>
            <p>
              Check Out :{" "}
              <span className="font-bold text-white">
                {formatDate(checkOut)}
              </span>
            </p>
            <p>
              No. of Nights:{" "}
              <span className="font-bold text-white">{nights}</span>
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-soft)] overflow-hidden text-center">
              <div className="bg-green-500/15 text-green-400 font-bold py-3 border-b border-green-500/20">
                {booking?.HotelBookingStatus || "Vouchered"}
              </div>

              <div className="text-[var(--gold-soft)] py-3 text-sm">
                {changeLoading
                  ? "Request Sending..."
                  : changeMsg
                    ? "Request Raised"
                    : "Booking Confirmed"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
          {/* LEFT CONTENT */}
          <div className="lg:col-span-9 space-y-5">
            {/* ROOM DETAILS */}
            <SectionCard>
              <SectionTitle icon="🛏️" title="Room Details" />

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-1 font-bold text-[var(--gold-soft)]">
                    Room 1
                  </div>

                  <div className="md:col-span-8 text-[var(--text-muted)]">
                    <p className="text-white font-semibold">{roomName}</p>
                    <p className="text-sm mt-1">Incl: {inclusion}</p>

                    {roomPromotion && (
                      <p className="text-[var(--color-start)] mt-2">
                        {roomPromotion}
                      </p>
                    )}

                    {supplements.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-[var(--gold-soft)]">
                          Supplements
                        </p>

                        <ul className="list-disc pl-5 text-sm text-[var(--text-muted)] mt-1">
                          {supplements.map((item, index) => (
                            <li key={index}>
                              {item?.Description ||
                                item?.Name ||
                                item?.SupplementDescription ||
                                JSON.stringify(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3 text-right text-sm">
                    <p className="font-semibold text-white">
                      👤 {adultCount || 1} Adult(s)
                      {childCount > 0 ? `, ${childCount} Child` : ""}
                    </p>

                    <button className="mt-4 text-[var(--gold-main)] underline underline-offset-4">
                      Show Room Description(+)
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* GUEST DETAILS */}
            <SectionCard>
              <SectionTitle icon="🪪" title="Guest Details" />

              <div className="p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold mb-2 text-[var(--gold-soft)]">
                      Room 1
                    </p>

                    {guestDetails.length > 0 ? (
                      guestDetails.map((g, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 py-1 text-sm"
                        >
                          <p className="md:col-span-3 text-[var(--gold-main)] font-semibold">
                            {Number(g.PaxType) === 2 ||
                            String(g.Title).toLowerCase().includes("mstr") ||
                            String(g.Title).toLowerCase().includes("miss")
                              ? "Child"
                              : "Adult"}{" "}
                            {g.LeadPassenger || i === 0
                              ? "1 (Lead Guest)"
                              : i + 1}
                          </p>

                          <p className="md:col-span-9 font-bold text-white">
                            {g.Title ? `${g.Title}. ` : ""}
                            {g.FirstName || g.firstName || ""}{" "}
                            {g.LastName || g.lastName || ""}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">
                        No guest details available
                      </p>
                    )}
                  </div>

                  <button className="text-[var(--gold-main)] underline underline-offset-4 text-sm h-fit">
                    Show Pax Details
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* CANCELLATION CHARGES */}
            <SectionCard>
              <SectionTitle icon="🕘" title="Cancellation Charges" />

              <div className="p-5">
                <p className="font-bold mb-4 text-white">Room 1 : {roomName}</p>

                <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--gold-soft)]">
                      <tr>
                        <th className="text-left p-3 border border-[var(--border-soft)]">
                          Cancelled on or After
                        </th>
                        <th className="text-left p-3 border border-[var(--border-soft)]">
                          Cancelled on or Before
                        </th>
                        <th className="text-left p-3 border border-[var(--border-soft)]">
                          Cancellation Charges
                        </th>
                      </tr>
                    </thead>

                    <tbody className="text-[var(--text-muted)]">
                      {cancelPolicies.length > 0 ? (
                        cancelPolicies.map((policy, index) => (
                          <tr key={index}>
                            <td className="p-3 border border-[var(--border-soft)]">
                              {formatDate(policy.FromDate || policy.fromDate)}
                            </td>

                            <td className="p-3 border border-[var(--border-soft)]">
                              {formatDate(
                                policy.ToDate ||
                                  policy.toDate ||
                                  checkOut ||
                                  policy.FromDate,
                              )}
                            </td>

                            <td className="p-3 border border-[var(--border-soft)] text-white font-semibold">
                              {policy.ChargeType === "Percentage"
                                ? `${policy.CancellationCharge}%`
                                : policy.CancellationCharge === 0
                                  ? "Free"
                                  : policy.CancellationCharge
                                    ? formatMoney(policy.CancellationCharge)
                                    : "100%"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-3 border border-[var(--border-soft)]">
                            {formatDate(checkIn)}
                          </td>
                          <td className="p-3 border border-[var(--border-soft)]">
                            {formatDate(checkOut)}
                          </td>
                          <td className="p-3 border border-[var(--border-soft)] text-white font-semibold">
                            100%
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-6 text-sm text-[var(--text-muted)]">
                  <span className="text-red-400 font-semibold">Note:</span>{" "}
                  Early check out will attract full cancellation charges unless
                  otherwise specified.
                </p>
              </div>
            </SectionCard>

            {/* ROOM AMENITIES */}
            <SectionCard>
              <SectionTitle icon="☑️" title="Room Amenities" />

              <div className="p-5 overflow-x-auto">
                <table className="w-full border border-[var(--border-soft)] text-sm rounded-2xl overflow-hidden">
                  <thead className="bg-[var(--bg-secondary)] text-[var(--gold-soft)]">
                    <tr>
                      <th className="p-3 border border-[var(--border-soft)] text-left w-28">
                        Room
                      </th>
                      <th className="p-3 border border-[var(--border-soft)] text-left">
                        Amenities
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td className="p-3 border border-[var(--border-soft)] font-bold text-center text-white">
                        Room 1
                      </td>
                      <td className="p-3 border border-[var(--border-soft)] text-[var(--text-muted)] leading-relaxed">
                        {amenities}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* REMARK */}
            <SectionCard>
              <SectionTitle icon="📝" title="Remark" />

              <div className="p-5 text-[var(--text-muted)]">
                {booking?.Remark || booking?.Remarks || "N.a."}
              </div>
            </SectionCard>

            {/* HOTEL NORMS */}
            <SectionCard>
              <SectionTitle icon="📋" title="Hotel Norms" />

              <div className="p-5 text-sm space-y-2 text-[var(--text-muted)]">
                {hotelNorms.length > 0 ? (
                  hotelNorms.map((norm, index) => (
                    <p key={index}>
                      {index + 1}. {norm}
                    </p>
                  ))
                ) : (
                  <>
                    <p>1. CheckIn Time-Begin: 12:00 PM</p>
                    <p>2. CheckIn Time-End: anytime</p>
                    <p>3. CheckOut Time: 12:00 PM</p>
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-5">
            <SectionCard>
              <div className="bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] text-black p-4 font-bold">
                Need Modification in Booking?
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 text-sm text-[var(--text-muted)]">
                <button className="text-left hover:text-[var(--gold-main)] transition">
                  👤 Amendments
                </button>

                <button className="text-left hover:text-[var(--gold-main)] transition">
                  ★ Special Requests
                </button>

                <button
                  onClick={handleChangeRequest}
                  className="text-left hover:text-red-400 transition"
                >
                  ✖ Cancel Booking
                </button>

                <button className="text-left hover:text-[var(--gold-main)] transition">
                  ? Other Queries
                </button>
              </div>

              <div className="border-t border-[var(--border-soft)] p-4">
                <p className="font-bold text-sm mb-3 text-white">
                  Raised Request
                </p>

                <p className="text-sm text-[var(--gold-main)]">
                  {changeMsg || "No tickets found for the given booking"}
                </p>
              </div>
            </SectionCard>

            <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl p-4 font-semibold text-white shadow-xl shadow-black/20">
              📞 Call us at:{" "}
              <a
                href="tel:+919667455591"
                className="text-[var(--gold-main)] hover:underline"
              >
                +919667455591
              </a>
            </div>

            <SectionCard>
              <div className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] p-4 font-bold text-[var(--gold-main)] border-b border-[var(--border-soft)]">
                Sale Summary
              </div>

              <div className="p-4 text-sm space-y-3">
                <p className="font-bold text-white">{roomName}</p>

                <SummaryRow
                  label="Rate (Published)"
                  value={formatMoney(publishedRate)}
                />

                <SummaryRow
                  label="Rate (Offered)"
                  value={formatMoney(offeredRate)}
                />

                <button className="block ml-auto text-[var(--gold-main)] underline underline-offset-4 text-xs">
                  Rate Breakup
                </button>

                <SummaryRow label="No. of Rooms" value="1" />

                <div className="border-t border-[var(--border-soft)] pt-3">
                  <SummaryRow
                    label="Total"
                    value={formatMoney(offeredRate)}
                    bold
                  />

                  <p className="text-xs text-[var(--text-muted)]">
                    (
                    {Math.round(Number(offeredRate || 0)).toLocaleString(
                      "en-IN",
                    )}{" "}
                    X 1)
                  </p>
                </div>

                <SummaryRow
                  label="Comm. Earned"
                  value={formatMoney(commission)}
                />
                <SummaryRow label="TDS" value={formatMoney(tds)} />

                {tax > 0 && <SummaryRow label="Tax" value={formatMoney(tax)} />}

                <div className="bg-(--bg-secondary) -mx-4 px-4 py-3 border-y border-(--border-soft)">
                  <SummaryRow label="Total GST" value={formatMoney(gst)} bold />
                </div>

                <div className="bg-linear-to-r from-start to-end -mx-4 px-4 py-4 text-black">
                  <SummaryRow
                    label="Grand Total"
                    value={formatMoney(netAmount)}
                    bold
                    large
                  />
                </div>

                <button className="text-(--gold-main) font-bold">
                  + Show Details
                </button>
              </div>
            </SectionCard>
          </aside>
        </div>

        {/* MESSAGES */}
        {changeMsg && (
          <div className="mt-5 bg-green-500/10 border border-green-500/30 p-4 rounded-2xl text-green-400">
            {changeMsg}
          </div>
        )}

        {changeError && (
          <div className="mt-5 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-400">
            {changeError}
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="mt-8 flex flex-wrap justify-end gap-4">
          <GoldButton onClick={handleInvoiceClick}>View Invoice</GoldButton>

          <GoldButton
            onClick={() => {
              setViewLoading(true);
              handleVoucherClick();
            }}
          >
            {viewLoading ? "Loading..." : "View Voucher"}
          </GoldButton>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ children }) => {
  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-xl shadow-black/20">
      {children}
    </section>
  );
};

const SectionTitle = ({ icon, title }) => {
  return (
    <div className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] px-5 py-4 font-bold text-[var(--gold-main)] flex items-center gap-2 border-b border-[var(--border-soft)]">
      <span>{icon}</span>
      <span className="font-[var(--font-heading)] tracking-wide">{title}</span>
    </div>
  );
};

const SummaryRow = ({ label, value, bold = false, large = false }) => {
  return (
    <div
      className={`flex justify-between gap-4 ${
        bold ? "font-bold text-white" : "text-[var(--text-muted)]"
      } ${large ? "text-base" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
};

const GoldButton = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-linear-to-r from-start to-end text-black font-bold text-sm shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition"
    >
      {children}
    </button>
  );
};

export default HotelBookingSuccess;
