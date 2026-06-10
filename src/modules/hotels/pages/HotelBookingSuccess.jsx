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

  const roomData = useMemo(() => {
    return getRoomData(savedData, booking);
  }, [savedData, booking]);

  const hotelResult = useMemo(() => {
    return getHotelResult(savedData);
  }, [savedData]);

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

  const leadGuest =
    guestDetails?.find((g) => g.LeadPassenger || g.IsLeadPax) ||
    guestDetails?.[0];

  const adultCount = guestDetails.filter(
    (g) => Number(g.PaxType) === 1 || Number(g.Age) >= 12,
  ).length;

  const childCount = guestDetails.filter(
    (g) => Number(g.PaxType) === 2 || Number(g.Age) < 12,
  ).length;

  const handleInvoiceClick = () => {
    if (booking?.InvoiceNumber) {
      alert(`Invoice No: ${booking.InvoiceNumber}`);
      return;
    }

    alert("Invoice number not available");
  };

  const handleVoucherClick = () => {
    navigate(`/booking-details/${booking.BookingId}`);
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-700">
        Loading booking...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Booking not found
        </h2>

        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-lg bg-blue-700 text-white font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f8] text-slate-900 py-6 px-3 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* TOP HEADER */}
        <div className="bg-white border border-slate-200 rounded-t-lg overflow-hidden">
          <div className="bg-[#e8edf7] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h1 className="text-xl font-bold text-[#2b5f93]">
              ☰ Booking Details
            </h1>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-[#21608f] text-white rounded font-semibold text-sm"
              >
                &lt;&lt; Back To Queue
              </button>

              <button
                onClick={handleVoucherClick}
                className="px-4 py-2 bg-[#21608f] text-white rounded font-semibold text-sm"
              >
                View Voucher
              </button>

              <button className="px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm">
                WhatsApp
              </button>
            </div>
          </div>

          <div className="px-4 py-5 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p className="inline-block bg-[#2b69aa] text-white px-2 py-1 font-bold rounded text-sm">
                FLYINGLYTE1 (Delhi)
              </p>
              <br />
              <p className="inline-block mt-1 bg-[#2b69aa] text-white px-2 py-1 font-bold rounded text-sm">
                Delhi
              </p>
            </div>

            <div className="text-sm md:text-right">
              <p>
                TBO Confirmation No :{" "}
                <span className="text-[#2b69aa] font-semibold">
                  {booking?.ConfirmationNo || "N/A"}
                </span>
              </p>
              <button className="mt-2 text-[#2b69aa] underline">
                Add Another Item
              </button>
            </div>
          </div>
        </div>

        {/* HOTEL SUMMARY */}
        <div className="bg-[#f5f7fb] border-x border-b border-slate-200 p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 flex gap-4">
            <div className="w-28 h-24 bg-slate-200 rounded flex items-center justify-center text-5xl text-slate-400 shrink-0">
              🛏️
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#2b5f93]">
                {hotel?.hotel_name ||
                  hotel?.HotelName ||
                  booking?.HotelName ||
                  "Hotel"}
                <span className="ml-2 text-yellow-500 text-sm">★★★</span>
              </h2>

              <p className="text-sm text-slate-700 mt-1">
                {hotel?.address ||
                  hotel?.Address ||
                  booking?.HotelAddress ||
                  hotelResult?.HotelAddress ||
                  "Hotel address not available"}
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 text-sm lg:text-right">
            <p>
              Check In :{" "}
              <span className="font-bold">{formatDate(checkIn)}</span>
            </p>
            <p>
              Check Out :{" "}
              <span className="font-bold">{formatDate(checkOut)}</span>
            </p>
            <p>
              No. of Nights: <span className="font-bold">{nights}</span>
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-center">
              <div className="bg-green-100 text-green-700 font-bold py-3">
                {booking?.HotelBookingStatus || "Vouchered"}
              </div>
              <div className="text-red-500 py-3 text-sm">
                {changeLoading
                  ? "Request Sending..."
                  : changeMsg
                    ? "Request Raised"
                    : "Booking Confirmed"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* LEFT CONTENT */}
          <div className="lg:col-span-9 space-y-4">
            {/* ROOM DETAILS */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="🛏️" title="Room Details" />

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-1 font-bold">Room 1</div>

                  <div className="md:col-span-8">
                    <p>{roomName}</p>
                    <p className="text-sm">Incl: {inclusion}</p>

                    {roomPromotion && (
                      <p className="text-red-500 mt-2">{roomPromotion}</p>
                    )}

                    {supplements.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-slate-700">
                          Supplements
                        </p>
                        <ul className="list-disc pl-5 text-sm text-slate-600">
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
                    <p className="font-semibold">
                      👤 {adultCount || 1} Adult(s)
                      {childCount > 0 ? `, ${childCount} Child` : ""}
                    </p>

                    <button className="mt-4 text-[#2b69aa] underline">
                      Show Room Description(+)
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* GUEST DETAILS */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="🪪" title="Guest Details" />

              <div className="p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-bold mb-2">Room 1</p>

                    {guestDetails.length > 0 ? (
                      guestDetails.map((g, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 md:grid-cols-12 gap-2 py-1 text-sm"
                        >
                          <p className="md:col-span-3 text-[#2b69aa] font-semibold">
                            {Number(g.PaxType) === 2 ||
                            String(g.Title).toLowerCase().includes("mstr") ||
                            String(g.Title).toLowerCase().includes("miss")
                              ? "Child"
                              : "Adult"}{" "}
                            {g.LeadPassenger || i === 0
                              ? "1 (Lead Guest)"
                              : i + 1}
                          </p>

                          <p className="md:col-span-9 font-bold">
                            {g.Title ? `${g.Title}. ` : ""}
                            {g.FirstName || g.firstName || ""}{" "}
                            {g.LastName || g.lastName || ""}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No guest details available
                      </p>
                    )}
                  </div>

                  <button className="text-[#2b69aa] underline text-sm h-fit">
                    Show Pax Details
                  </button>
                </div>
              </div>
            </section>

            {/* CANCELLATION CHARGES */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="🕘" title="Cancellation Charges" />

              <div className="p-4">
                <p className="font-bold mb-4">Room 1 : {roomName}</p>

                <div className="overflow-x-auto">
                  <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                    <thead className="bg-[#e8edf7] text-slate-700">
                      <tr>
                        <th className="text-left p-3 border border-slate-200">
                          Cancelled on or After
                        </th>
                        <th className="text-left p-3 border border-slate-200">
                          Cancelled on or Before
                        </th>
                        <th className="text-left p-3 border border-slate-200">
                          Cancellation Charges
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {cancelPolicies.length > 0 ? (
                        cancelPolicies.map((policy, index) => (
                          <tr key={index}>
                            <td className="p-3 border border-slate-200">
                              {formatDate(policy.FromDate || policy.fromDate)}
                            </td>
                            <td className="p-3 border border-slate-200">
                              {formatDate(
                                policy.ToDate ||
                                  policy.toDate ||
                                  checkOut ||
                                  policy.FromDate,
                              )}
                            </td>
                            <td className="p-3 border border-slate-200">
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
                          <td className="p-3 border border-slate-200">
                            {formatDate(checkIn)}
                          </td>
                          <td className="p-3 border border-slate-200">
                            {formatDate(checkOut)}
                          </td>
                          <td className="p-3 border border-slate-200">100%</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-6 text-sm">
                  <span className="text-red-500 font-semibold">Note:</span>{" "}
                  Early check out will attract full cancellation charges unless
                  otherwise specified.
                </p>
              </div>
            </section>

            {/* ROOM AMENITIES */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="☑️" title="Room Amenities" />

              <div className="p-4 overflow-x-auto">
                <table className="w-full border border-slate-200 text-sm">
                  <thead className="bg-[#e8edf7]">
                    <tr>
                      <th className="p-3 border border-slate-200 text-left w-28">
                        Room
                      </th>
                      <th className="p-3 border border-slate-200 text-left">
                        Amenities
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200 font-bold text-center">
                        Room 1
                      </td>
                      <td className="p-3 border border-slate-200">
                        {amenities}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* REMARK */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="📝" title="Remark" />

              <div className="p-4">
                {booking?.Remark || booking?.Remarks || "N.a."}
              </div>
            </section>

            {/* HOTEL NORMS */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <SectionTitle icon="📋" title="Hotel Norms" />

              <div className="p-4 text-sm space-y-2">
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
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-[#bfe3f7] p-4 font-bold">
                Need Modification in Booking?
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 text-sm text-slate-600">
                <button className="text-left hover:text-[#2b69aa]">
                  👤 Amendments
                </button>
                <button className="text-left hover:text-[#2b69aa]">
                  ★ Special Requests
                </button>
                <button
                  onClick={handleChangeRequest}
                  className="text-left hover:text-red-600"
                >
                  ✖ Cancel Booking
                </button>
                <button className="text-left hover:text-[#2b69aa]">
                  ? Other Queries
                </button>
              </div>

              <div className="border-t border-slate-200 p-4">
                <p className="font-bold text-sm mb-3">Raised Request</p>
                <p className="text-sm text-[#2b69aa]">
                  {changeMsg || "No tickets found for the given booking"}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 font-semibold">
              📞 Call us at: +919876543210
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-[#dce5f7] p-4 font-bold">Sale Summary</div>

              <div className="p-4 text-sm space-y-3">
                <p className="font-bold">{roomName}</p>

                <SummaryRow
                  label="Rate (Published)"
                  value={formatMoney(publishedRate)}
                />

                <SummaryRow
                  label="Rate (Offered)"
                  value={formatMoney(offeredRate)}
                />

                <button className="block ml-auto text-[#2b69aa] underline text-xs">
                  Rate Breakup
                </button>

                <SummaryRow label="No. of Rooms" value="1" />

                <div className="border-t pt-3">
                  <SummaryRow
                    label="Total"
                    value={formatMoney(offeredRate)}
                    bold
                  />

                  <p className="text-xs text-slate-500">
                    ({Math.round(Number(offeredRate || 0)).toLocaleString(
                      "en-IN",
                    )}{" "}
                    X 1)
                  </p>
                </div>

                <SummaryRow label="Comm. Earned" value={formatMoney(commission)} />
                <SummaryRow label="TDS" value={formatMoney(tds)} />

                {tax > 0 && <SummaryRow label="Tax" value={formatMoney(tax)} />}

                <div className="bg-[#e8edf7] -mx-4 px-4 py-3">
                  <SummaryRow
                    label="Total GST"
                    value={formatMoney(gst)}
                    bold
                  />
                </div>

                <div className="bg-[#d5def3] -mx-4 px-4 py-4">
                  <SummaryRow
                    label="Grand Total"
                    value={formatMoney(netAmount)}
                    bold
                    large
                  />
                </div>

                <button className="text-[#2b69aa] font-bold">
                  + Show Details
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* MESSAGES */}
        {changeMsg && (
          <div className="mt-5 bg-green-50 border border-green-300 p-4 rounded-lg text-green-700">
            {changeMsg}
          </div>
        )}

        {changeError && (
          <div className="mt-5 bg-red-50 border border-red-300 p-4 rounded-lg text-red-700">
            {changeError}
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="mt-8 flex flex-wrap justify-end gap-4">
          <button
            onClick={handleInvoiceClick}
            className="px-6 py-3 rounded bg-[#21608f] text-white font-bold"
          >
            View Invoice
          </button>

          <button
            onClick={() => {
              setViewLoading(true);
              navigate(`/booking-details/${booking.BookingId}`);
            }}
            className="px-6 py-3 rounded bg-[#21608f] text-white font-bold"
          >
            {viewLoading ? "Loading..." : "View Voucher"}
          </button>

          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded bg-[#21608f] text-white font-bold"
          >
            Add Another Item
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }) => {
  return (
    <div className="bg-[#e8edf7] px-4 py-3 font-bold text-[#2b5f93] flex items-center gap-2">
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  );
};

const SummaryRow = ({ label, value, bold = false, large = false }) => {
  return (
    <div
      className={`flex justify-between gap-4 ${
        bold ? "font-bold" : ""
      } ${large ? "text-base" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
};

export default HotelBookingSuccess;