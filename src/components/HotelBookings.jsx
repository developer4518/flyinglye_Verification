"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHotelBookings } from "../services/bookingApi";
import { sendHotelChangeRequest } from "../services/sendHotelChangeRequest";
import { privateApi } from "../services/api";

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `₹ ${Math.round(amount).toLocaleString("en-IN")}`;
};

const stripHtml = (value = "") => {
  return String(value).replace(/<[^>]+>/g, "");
};

const DetailItem = ({ label, value, className = "" }) => (
  <div
    className={`rounded-xl bg-white/5 border border-white/10 p-3 ${className}`}
  >
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-white wrap-break-word">
      {value !== null && value !== undefined && value !== ""
        ? String(value)
        : "N/A"}
    </p>
  </div>
);

const DetailSection = ({ title, children }) => (
  <div className="bg-[#15151C] p-5 sm:p-6 rounded-2xl border border-gray-800">
    <h3 className="text-yellow-300 mb-4 font-semibold">{title}</h3>
    {children}
  </div>
);

const boolText = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "N/A";
};

const decodeHtml = (value = "") => {
  if (typeof window === "undefined") return String(value || "");
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
};

const chargeTypeText = (value) => {
  if (value === 1 || value === "1" || value === "Fixed") return "Fixed";
  if (value === 2 || value === "2" || value === "Percentage")
    return "Percentage";
  return value || "N/A";
};

const HotelBookings = () => {
  const queryClient = useQueryClient();

  const [activeBookingId, setActiveBookingId] = useState(null);

  // Store request result per booking card
  const [changeRequests, setChangeRequests] = useState({});

  // Hotel detail modal states
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [hotelDetail, setHotelDetail] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["hotelBookings"],
    queryFn: getHotelBookings,
  });

  const changeRequestMutation = useMutation({
    mutationFn: (bookingId) => sendHotelChangeRequest(bookingId),

    onMutate: (bookingId) => {
      setActiveBookingId(bookingId);

      setChangeRequests((prev) => ({
        ...prev,
        [bookingId]: {
          ...prev[bookingId],
          loading: true,
          error: "",
          message: "",
        },
      }));
    },

    onSuccess: (res, bookingId) => {
      const changeRequestId = res?.data?.ChangeRequestId || "N/A";

      setChangeRequests((prev) => ({
        ...prev,
        [bookingId]: {
          loading: false,
          sent: true,
          changeRequestId,
          message: `Change request submitted successfully. Request ID: ${changeRequestId}`,
          error: "",
        },
      }));

      queryClient.invalidateQueries({
        queryKey: ["hotelBookings"],
      });
    },

    onError: (error, bookingId) => {
      setChangeRequests((prev) => ({
        ...prev,
        [bookingId]: {
          ...prev[bookingId],
          loading: false,
          sent: false,
          changeRequestId: "",
          message: "",
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to submit change request",
        },
      }));
    },

    onSettled: () => {
      setActiveBookingId(null);
    },
  });

  const handleSendChangeRequest = (bookingId) => {
    if (!bookingId) return;

    const existingRequest = changeRequests[bookingId];

    if (existingRequest?.sent) {
      setChangeRequests((prev) => ({
        ...prev,
        [bookingId]: {
          ...prev[bookingId],
          message: `You already sent a change request. Request ID: ${
            existingRequest.changeRequestId || "N/A"
          }`,
          error: "",
        },
      }));

      return;
    }

    const confirmRequest = window.confirm(
      "Are you sure you want to send a hotel change/cancellation request?",
    );

    if (!confirmRequest) return;

    changeRequestMutation.mutate(bookingId);
  };

  const handleGetHotelDetail = async (bookingId) => {
    if (!bookingId) return;

    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError("");
      setHotelDetail(null);

      const res = await privateApi.post("/hotels/hotel/get-booking-detail/", {
        BookingId: bookingId,
      });

      if (res.data?.success) {
        setHotelDetail(res.data.data);
      } else {
        throw new Error(res.data?.message || "Failed to get hotel detail");
      }
    } catch (error) {
      console.error("HOTEL DETAIL ERROR:", error);

      setDetailError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load hotel detail",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError("");
    setHotelDetail(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-10 text-gray-400">Loading bookings...</div>
    );
  }

  const confirmedBookings = data.filter((b) => b.status === "CONFIRMED");

  if (!confirmedBookings.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        No confirmed bookings found
      </div>
    );
  }

  const net = Number(hotelDetail?.net_amount || hotelDetail?.NetAmount || 0);
  const fee = Number(hotelDetail?.convenience_fee || 0);
  const total = Number(hotelDetail?.total_amount || net + fee);

  return (
    <>
      <div className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6">
          My Bookings
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {confirmedBookings.map((b) => {
            const bookingId = b.booking_id;
            const requestInfo = changeRequests[bookingId];

            const isSubmitting = activeBookingId === bookingId;
            const alreadySent = requestInfo?.sent;

            return (
              <div
                key={b.id}
                className="bg-linear-to-br from-[#111] to-[#1a1a1a] 
                border border-white/10 rounded-2xl p-5 
                shadow-lg hover:shadow-xl hover:scale-[1.02] 
                transition-all duration-300 space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    Booking ID: {bookingId || "N/A"}
                  </span>

                  <span className="text-green-400 text-xs font-semibold bg-green-400/10 px-2 py-1 rounded-full">
                    CONFIRMED
                  </span>
                </div>

                {/* Booking Code */}
                {/* <p className="text-xs text-gray-500 break-all">
                  {b.booking_code}
                </p> */}

                {/* Guests Section */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Guests ({b.passengers?.length || 0})
                  </p>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {b.passengers?.map((p, index) => (
                      <div
                        key={index}
                        className={`flex justify-between items-center text-sm p-2 rounded-lg ${
                          p.LeadPassenger
                            ? "bg-green-400/10 border border-green-400/20"
                            : "bg-white/5"
                        }`}
                      >
                        <div>
                          <p className="text-white">
                            {[p.Title, p.FirstName, p.LastName]
                              .filter(Boolean)
                              .join(" ")}
                          </p>

                          {p.Age && (
                            <p className="text-xs text-gray-400">
                              Age: {p.Age}
                            </p>
                          )}
                        </div>

                        {p.LeadPassenger && (
                          <span className="text-xs text-green-400">Lead</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Row */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Nationality</p>
                    <p className="text-white font-medium">
                      {b.guest_nationality || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-400">Booked On</p>
                    <p className="text-white font-medium">
                      {b.created_at ? formatDate(b.created_at) : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Booking Details */}
                <div className="text-sm space-y-1">
                  {b.confirmation_no && (
                    <p>
                      <span className="text-gray-400">Confirmation:</span>{" "}
                      <span className="text-white">{b.confirmation_no}</span>
                    </p>
                  )}

                  {b.booking_ref_no && (
                    <p>
                      <span className="text-gray-400">Ref No:</span>{" "}
                      <span className="text-white">{b.booking_ref_no}</span>
                    </p>
                  )}

                  {b.invoice_number && (
                    <p>
                      <span className="text-gray-400">Invoice:</span>{" "}
                      <span className="text-white">{b.invoice_number}</span>
                    </p>
                  )}

                  {b.hotel_booking_status && (
                    <p>
                      <span className="text-gray-400">Hotel Status:</span>{" "}
                      <span className="text-green-400">
                        {b.hotel_booking_status}
                      </span>
                    </p>
                  )}
                </div>

                {/* Card Message */}
                {(requestInfo?.message || requestInfo?.error) && (
                  <div
                    className={`rounded-xl px-3 py-2 text-xs border ${
                      requestInfo?.error
                        ? "bg-red-500/10 text-red-300 border-red-500/20"
                        : alreadySent
                          ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                          : "bg-green-500/10 text-green-300 border-green-500/20"
                    }`}
                  >
                    {requestInfo?.error || requestInfo?.message}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => handleGetHotelDetail(bookingId)}
                    disabled={!bookingId}
                    className="w-full rounded-xl bg-blue-500/90 hover:bg-blue-500 
                    disabled:opacity-60 disabled:cursor-not-allowed 
                    text-white text-sm font-semibold px-4 py-3 
                    transition-all duration-300 shadow-lg shadow-blue-500/10"
                  >
                    Get Booking Detail
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendChangeRequest(bookingId)}
                    disabled={isSubmitting || !bookingId}
                    className={`w-full rounded-xl 
                    disabled:opacity-60 disabled:cursor-not-allowed 
                    text-white text-sm font-semibold px-4 py-3 
                    transition-all duration-300 shadow-lg ${
                      alreadySent
                        ? "bg-yellow-500/90 hover:bg-yellow-500 shadow-yellow-500/10"
                        : "bg-red-500/90 hover:bg-red-500 shadow-red-500/10"
                    }`}
                  >
                    {isSubmitting
                      ? "Sending Request..."
                      : alreadySent
                        ? "Request Already Sent"
                        : "Send Change Request"}
                  </button>

                  <p className="text-[11px] text-gray-500 mt-2 text-center">
                    {alreadySent
                      ? `Change Request ID: ${
                          requestInfo?.changeRequestId || "N/A"
                        }`
                      : "This will submit a hotel change/cancellation request."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hotel Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B0B0F]/90 p-3 backdrop-blur">
              <div>
                <p className="text-xs text-gray-400">Hotel Booking Details</p>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  {hotelDetail?.HotelName || "Loading..."}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm border border-white/10"
              >
                Close
              </button>
            </div>

            {detailLoading && (
              <div className="bg-[#15151C] border border-white/10 rounded-2xl p-10 text-center text-gray-300">
                Loading hotel detail...
              </div>
            )}

            {detailError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-300 text-sm">
                {detailError}
              </div>
            )}

            {!detailLoading && !detailError && hotelDetail && (
              <div className="space-y-6 text-white">
                {/* Top Header */}
                <div className="bg-linear-to-br from-[#15151C] to-[#101015] p-6 rounded-2xl border border-gray-800">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-semibold text-yellow-400">
                        {hotelDetail.HotelName || "Hotel Booking"}
                      </h2>

                      <p className="mt-2 text-sm text-gray-400">
                        {[
                          hotelDetail.AddressLine1,
                          hotelDetail.AddressLine2,
                          hotelDetail.City,
                        ]
                          .filter(Boolean)
                          .join(", ") || "N/A"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${
                            hotelDetail.HotelBookingStatus === "Cancelled"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {hotelDetail.HotelBookingStatus || "N/A"}
                        </span>

                        <span className="w-fit px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                          {hotelDetail.IsDomestic
                            ? "Domestic"
                            : "International"}
                        </span>

                        <span className="w-fit px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
                          {hotelDetail.StarRating || "N/A"} Star
                        </span>

                        {hotelDetail.VoucherStatus && (
                          <span className="w-fit px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300">
                            Voucher Available
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 min-w-full lg:min-w-105">
                      <DetailItem
                        label="Booking ID"
                        value={hotelDetail.BookingId}
                      />
                      <DetailItem
                        label="TBO Ref No"
                        value={hotelDetail.TBOReferenceNo}
                      />
                      <DetailItem
                        label="Trace ID"
                        value={hotelDetail.TraceId}
                        className="col-span-2"
                      />
                      <DetailItem
                        label="Confirmation No"
                        value={hotelDetail.ConfirmationNo}
                      />
                      <DetailItem
                        label="Booking Ref No"
                        value={hotelDetail.BookingRefNo}
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Main Details */}
                <DetailSection title="Booking Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Booking Status"
                      value={hotelDetail.BookingStatus}
                    />
                    <DetailItem
                      label="Hotel Booking Status"
                      value={hotelDetail.HotelBookingStatus}
                    />
                    <DetailItem label="Status" value={hotelDetail.Status} />
                    <DetailItem
                      label="Response Status"
                      value={hotelDetail.ResponseStatus}
                    />
                    <DetailItem
                      label="Booking Source"
                      value={hotelDetail.BookingSource}
                    />
                    <DetailItem
                      label="Guest Nationality"
                      value={hotelDetail.GuestNationality}
                    />
                    <DetailItem
                      label="Booked On"
                      value={formatDateTime(hotelDetail.BookingDate)}
                    />
                    <DetailItem
                      label="Special Request"
                      value={hotelDetail.SpecialRequest}
                    />
                    <DetailItem
                      label="Price Changed"
                      value={boolText(hotelDetail.IsPriceChanged)}
                    />
                    <DetailItem
                      label="Cancellation Policy Changed"
                      value={boolText(hotelDetail.IsCancellationPolicyChanged)}
                    />
                    <DetailItem
                      label="Corporate Booking"
                      value={boolText(hotelDetail.IsCorporate)}
                    />
                    <DetailItem
                      label="Zendesk Ticket Created"
                      value={boolText(hotelDetail.IsZendeskTicketCreated)}
                    />
                  </div>
                </DetailSection>

                {/* Invoice Details */}
                <DetailSection title="Invoice & Payment Summary">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Invoice No"
                      value={hotelDetail.InvoiceNo}
                    />
                    <DetailItem
                      label="Invoice Amount"
                      value={formatMoney(hotelDetail.InvoiceAmount)}
                    />
                    <DetailItem
                      label="Invoice Created On"
                      value={formatDateTime(hotelDetail.InvoiceCreatedOn)}
                    />
                    <DetailItem label="GSTIN" value={hotelDetail.GSTIN} />
                    <DetailItem
                      label="Credit Note GSTIN"
                      value={hotelDetail.CreditNoteGSTIN}
                    />
                    <DetailItem label="Net Amount" value={formatMoney(net)} />
                    <DetailItem
                      label="Net Tax"
                      value={formatMoney(hotelDetail.NetTax)}
                    />
                    <DetailItem
                      label="Convenience Fee"
                      value={formatMoney(fee)}
                    />
                    <DetailItem
                      label="Total Amount"
                      value={formatMoney(total)}
                      className="sm:col-span-2 lg:col-span-1"
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-yellow-400/10 p-5 border border-yellow-400/20">
                    <h4 className="text-yellow-300 mb-3 font-semibold">
                      Final Price
                    </h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-300">Net Amount</span>
                        <span>{formatMoney(net)}</span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-300">Convenience Fee</span>
                        <span>{formatMoney(fee)}</span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-gray-300">Net Tax</span>
                        <span>{formatMoney(hotelDetail.NetTax)}</span>
                      </div>

                      <hr className="border-gray-700" />

                      <div className="flex justify-between gap-4 text-lg font-bold">
                        <span>Total</span>
                        <span className="text-yellow-400">
                          {formatMoney(total)}
                        </span>
                      </div>

                      {hotelDetail?.HotelBookingStatus === "Cancelled" && (
                        <div className="flex justify-between gap-4 text-green-400 font-semibold pt-2">
                          <span>Refund</span>
                          <span>
                            {formatMoney(
                              hotelDetail?.CancellationStatus?.[0]
                                ?.RefundAmount || 0,
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </DetailSection>

                {/* Hotel Info */}
                <DetailSection title="Hotel Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Hotel Code"
                      value={hotelDetail.HotelCode}
                    />
                    <DetailItem label="Hotel ID" value={hotelDetail.HotelId} />
                    <DetailItem
                      label="TBO Hotel Code"
                      value={hotelDetail.TBOHotelCode}
                    />
                    <DetailItem
                      label="Hotel Confirmation No"
                      value={hotelDetail.HotelConfirmationNo}
                    />
                    <DetailItem
                      label="Hotel Name"
                      value={hotelDetail.HotelName}
                    />
                    <DetailItem
                      label="Star Rating"
                      value={hotelDetail.StarRating}
                    />
                    <DetailItem
                      label="Country Code"
                      value={hotelDetail.CountryCode}
                    />
                    <DetailItem label="City" value={hotelDetail.City} />
                    <DetailItem label="City ID" value={hotelDetail.CityId} />
                    <DetailItem label="Latitude" value={hotelDetail.Latitude} />
                    <DetailItem
                      label="Longitude"
                      value={hotelDetail.Longitude}
                    />
                    <DetailItem
                      label="No. of Rooms"
                      value={hotelDetail.NoOfRooms}
                    />
                    <DetailItem
                      label="Address Line 1"
                      value={hotelDetail.AddressLine1}
                      className="sm:col-span-2"
                    />
                    <DetailItem
                      label="Address Line 2"
                      value={hotelDetail.AddressLine2}
                      className="sm:col-span-2"
                    />
                  </div>

                  {hotelDetail.Latitude && hotelDetail.Longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${hotelDetail.Latitude},${hotelDetail.Longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-xl bg-blue-500/90 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-3 transition"
                    >
                      Open Location in Google Maps
                    </a>
                  )}
                </DetailSection>

                {/* Dates */}
                <DetailSection title="Stay & Deadline Dates">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Check-In Date"
                      value={formatDate(hotelDetail.CheckInDate)}
                    />
                    <DetailItem
                      label="Check-Out Date"
                      value={formatDate(hotelDetail.CheckOutDate)}
                    />
                    <DetailItem
                      label="Initial Check-In Date"
                      value={formatDate(hotelDetail.InitialCheckInDate)}
                    />
                    <DetailItem
                      label="Initial Check-Out Date"
                      value={formatDate(hotelDetail.InitialCheckOutDate)}
                    />
                    <DetailItem
                      label="Last Cancellation Date"
                      value={formatDateTime(hotelDetail.LastCancellationDate)}
                    />
                    <DetailItem
                      label="Last Cancellation Deadline"
                      value={formatDateTime(
                        hotelDetail.LastCancellationDeadline,
                      )}
                    />
                    <DetailItem
                      label="Last Voucher Date"
                      value={formatDateTime(hotelDetail.LastVoucherDate)}
                    />
                    <DetailItem
                      label="Voucher Status"
                      value={boolText(hotelDetail.VoucherStatus)}
                    />
                  </div>
                </DetailSection>

                {/* Error */}
                <DetailSection title="TBO Response / Error">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Error Code"
                      value={hotelDetail.Error?.ErrorCode}
                    />
                    <DetailItem
                      label="Error Message"
                      value={hotelDetail.Error?.ErrorMessage}
                    />
                    <DetailItem
                      label="Response Status"
                      value={hotelDetail.ResponseStatus}
                    />
                    <DetailItem label="Trace ID" value={hotelDetail.TraceId} />
                  </div>
                </DetailSection>

                {/* Rooms */}
                {hotelDetail.Rooms?.map((room, idx) => (
                  <DetailSection
                    key={idx}
                    title={`Room ${idx + 1} - ${room.RoomTypeName || "Room"}`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <DetailItem label="Room ID" value={room.RoomId} />
                      <DetailItem label="Room Index" value={room.RoomIndex} />
                      <DetailItem label="Room Status" value={room.RoomStatus} />
                      <DetailItem
                        label="Availability Type"
                        value={room.AvailabilityType}
                      />
                      <DetailItem
                        label="Room Type Code"
                        value={room.RoomTypeCode}
                      />
                      <DetailItem
                        label="Room Type Name"
                        value={room.RoomTypeName}
                      />
                      <DetailItem
                        label="Rate Plan Code"
                        value={room.RatePlanCode}
                      />
                      <DetailItem label="Rate Plan" value={room.RatePlan} />
                      <DetailItem
                        label="Is Per Stay"
                        value={boolText(room.IsPerStay)}
                      />
                      <DetailItem label="Adult Count" value={room.AdultCount} />
                      <DetailItem label="Child Count" value={room.ChildCount} />
                      <DetailItem
                        label="Child Age"
                        value={room.ChildAge?.join(", ")}
                      />
                      <DetailItem
                        label="Require All Pax Details"
                        value={boolText(room.RequireAllPaxDetails)}
                      />
                      <DetailItem
                        label="Smoking Preference"
                        value={room.SmokingPreference}
                      />
                      <DetailItem label="Inclusion" value={room.Inclusion} />
                      <DetailItem
                        label="Room Promotion"
                        value={room.RoomPromotion}
                      />
                      <DetailItem
                        label="Last Cancellation Date"
                        value={formatDateTime(room.LastCancellationDate)}
                      />
                      <DetailItem
                        label="Last Voucher Date"
                        value={formatDateTime(room.LastVoucherDate)}
                      />
                    </div>

                    {room.RoomDescription && (
                      <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-yellow-200 text-sm mb-3">
                          Room Description
                        </h4>
                        <div
                          className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: room.RoomDescription,
                          }}
                        />
                      </div>
                    )}

                    {/* Price Breakup */}
                    <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <h4 className="text-yellow-200 text-sm mb-3">
                        Room Price Breakup
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <DetailItem
                          label="Currency"
                          value={room.PriceBreakUp?.CurrencyCode}
                        />
                        <DetailItem
                          label="Room Rate"
                          value={formatMoney(room.PriceBreakUp?.RoomRate)}
                        />
                        <DetailItem
                          label="Room Tax"
                          value={formatMoney(room.PriceBreakUp?.RoomTax)}
                        />
                        <DetailItem
                          label="Extra Guest Charges"
                          value={formatMoney(
                            room.PriceBreakUp?.RoomExtraGuestCharges,
                          )}
                        />
                        <DetailItem
                          label="Child Charges"
                          value={formatMoney(
                            room.PriceBreakUp?.RoomChildCharges,
                          )}
                        />
                        <DetailItem
                          label="Service Fee"
                          value={formatMoney(room.PriceBreakUp?.ServiceFee)}
                        />
                        <DetailItem
                          label="Agent Commission"
                          value={formatMoney(
                            room.PriceBreakUp?.AgentCommission,
                          )}
                        />
                      </div>

                      {!!room.PriceBreakUp?.TaxBreakup?.length && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-130 text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-left text-gray-400">
                                <th className="py-2 pr-3">Tax Type</th>
                                <th className="py-2 pr-3">Tax Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {room.PriceBreakUp.TaxBreakup.map((tax, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-3 text-white">
                                    {tax.TaxType || "N/A"}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-300">
                                    {formatMoney(tax.TaxAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Passengers */}
                    {!!room.HotelPassenger?.length && (
                      <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-yellow-200 text-sm mb-3">
                          Passengers
                        </h4>

                        <div className="space-y-4">
                          {room.HotelPassenger.map((p, i) => (
                            <div
                              key={i}
                              className={`rounded-2xl p-4 border ${
                                p.LeadPassenger
                                  ? "bg-green-400/10 border-green-400/20"
                                  : "bg-[#15151C] border-white/10"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                                <div>
                                  <p className="font-semibold text-white">
                                    {[
                                      p.Title,
                                      p.FirstName,
                                      p.MiddleName,
                                      p.LastName,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {p.LeadPassenger
                                      ? "Lead Passenger"
                                      : "Passenger"}{" "}
                                    •{" "}
                                    {p.PaxType === 1
                                      ? "Adult"
                                      : p.PaxType === 2
                                        ? "Child"
                                        : "Pax"}
                                  </p>
                                </div>

                                <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                                  Pax ID: {p.PaxId || "N/A"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <DetailItem label="Title" value={p.Title} />
                                <DetailItem
                                  label="First Name"
                                  value={p.FirstName}
                                />
                                <DetailItem
                                  label="Middle Name"
                                  value={p.MiddleName}
                                />
                                <DetailItem
                                  label="Last Name"
                                  value={p.LastName}
                                />
                                <DetailItem label="Age" value={p.Age} />
                                <DetailItem
                                  label="Pax Type"
                                  value={p.PaxType}
                                />
                                <DetailItem
                                  label="Lead Passenger"
                                  value={boolText(p.LeadPassenger)}
                                />
                                <DetailItem
                                  label="Phone No"
                                  value={p.Phoneno}
                                />
                                <DetailItem label="Email" value={p.Email} />
                                <DetailItem label="PAN" value={p.PAN} />
                                <DetailItem
                                  label="Passport No"
                                  value={p.PassportNo}
                                />
                                <DetailItem
                                  label="Passport Issue Date"
                                  value={p.PassportIssueDate}
                                />
                                <DetailItem
                                  label="Passport Exp Date"
                                  value={p.PassportExpDate}
                                />
                                <DetailItem
                                  label="File Document"
                                  value={p.FileDocument}
                                />
                                <DetailItem
                                  label="Guardian Detail"
                                  value={p.GuardianDetail}
                                />
                                <DetailItem
                                  label="GST Number"
                                  value={p.GSTNumber}
                                />
                                <DetailItem
                                  label="GST Company Name"
                                  value={p.GSTCompanyName}
                                />
                                <DetailItem
                                  label="GST Company Email"
                                  value={p.GSTCompanyEmail}
                                />
                                <DetailItem
                                  label="GST Company Contact"
                                  value={p.GSTCompanyContactNumber}
                                />
                                <DetailItem
                                  label="GST Company Address"
                                  value={p.GSTCompanyAddress}
                                  className="sm:col-span-2"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Amenities */}
                    {!!room.Amenities?.length && (
                      <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-yellow-200 text-sm mb-3">
                          Amenities ({room.Amenities.length})
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-300">
                          {room.Amenities.map((a, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-black/20 px-3 py-2"
                            >
                              • {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bed Types */}
                    <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <h4 className="text-yellow-200 text-sm mb-3">
                        Bed Types
                      </h4>

                      {!!room.BedTypes?.length ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-300">
                          {room.BedTypes.map((bed, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-black/20 px-3 py-2"
                            >
                              {typeof bed === "string"
                                ? bed
                                : JSON.stringify(bed)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No bed type data available.
                        </p>
                      )}
                    </div>

                    {/* Supplements */}
                    <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                      <h4 className="text-yellow-200 text-sm mb-3">
                        Supplements
                      </h4>

                      {!!room.Supplements?.length ? (
                        <div className="space-y-2 text-sm text-gray-300">
                          {room.Supplements.map((supplement, i) => (
                            <pre
                              key={i}
                              className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-gray-300"
                            >
                              {JSON.stringify(supplement, null, 2)}
                            </pre>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No supplements available.
                        </p>
                      )}
                    </div>

                    {/* Cancellation Policies */}
                    {!!room.CancelPolicies?.length && (
                      <div className="mt-5 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
                        <h4 className="text-red-300 text-sm mb-3">
                          Cancel Policies
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-170 text-sm">
                            <thead>
                              <tr className="border-b border-white/10 text-left text-gray-400">
                                <th className="py-2 pr-3">From Date</th>
                                <th className="py-2 pr-3">To Date</th>
                                <th className="py-2 pr-3">Charge Type</th>
                                <th className="py-2 pr-3">Charge</th>
                                <th className="py-2 pr-3">Currency</th>
                              </tr>
                            </thead>
                            <tbody>
                              {room.CancelPolicies.map((policy, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2 pr-3 text-white">
                                    {policy.FromDate || "N/A"}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-300">
                                    {policy.ToDate || "N/A"}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-300">
                                    {chargeTypeText(policy.ChargeType)}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-300">
                                    {formatMoney(policy.CancellationCharge)}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-300">
                                    {policy.Currency || "N/A"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cancellation Policy Text */}
                    {room.CancellationPolicy && (
                      <div className="mt-5 rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
                        <h4 className="text-red-300 text-sm mb-3">
                          Cancellation Policy Text
                        </h4>

                        <div className="space-y-2 text-sm text-gray-300">
                          {room.CancellationPolicy.split("|")
                            .map((item) =>
                              item
                                .replaceAll("#^#", " - ")
                                .replaceAll("#!#", "")
                                .trim(),
                            )
                            .filter(Boolean)
                            .map((item, i) => (
                              <p key={i}>• {item}</p>
                            ))}
                        </div>
                      </div>
                    )}

                    {room.CancellationPolicies && (
                      <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 p-4">
                        <h4 className="text-yellow-200 text-sm mb-3">
                          Cancellation Policies Raw
                        </h4>
                        <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-gray-300">
                          {JSON.stringify(room.CancellationPolicies, null, 2)}
                        </pre>
                      </div>
                    )}
                  </DetailSection>
                ))}

                {/* Rate Conditions */}
                {!!hotelDetail?.RateConditions?.length && (
                  <DetailSection
                    title={`Rate Conditions (${hotelDetail.RateConditions.length})`}
                  >
                    <div className="space-y-3">
                      {hotelDetail.RateConditions.map((condition, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-gray-300 leading-relaxed"
                        >
                          <p className="mb-2 text-xs font-semibold text-yellow-300">
                            Condition {i + 1}
                          </p>

                          <div
                            dangerouslySetInnerHTML={{
                              __html: decodeHtml(condition),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Tracking */}
                <DetailSection title="Itinerary Tracking">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <DetailItem
                      label="Campaign ID"
                      value={hotelDetail.HotelItineraryTracking?.CampaignId}
                    />
                    <DetailItem
                      label="Campaign Name"
                      value={hotelDetail.HotelItineraryTracking?.CampaignName}
                    />
                    <DetailItem
                      label="Loved By Indians"
                      value={boolText(
                        hotelDetail.HotelItineraryTracking?.IsLovedByIndians,
                      )}
                    />
                    <DetailItem
                      label="Selected From Similar"
                      value={boolText(
                        hotelDetail.HotelItineraryTracking
                          ?.IsSelectedFromSimilar,
                      )}
                    />
                    <DetailItem
                      label="Search Type"
                      value={hotelDetail.HotelItineraryTracking?.SearchType}
                    />
                    <DetailItem
                      label="Itinerary Tracking JSON"
                      value={
                        hotelDetail.HotelItineraryTracking
                          ?.ItineraryTrackingJson
                      }
                      className="sm:col-span-2 lg:col-span-3"
                    />
                  </div>
                </DetailSection>

                {/* Extra Raw Objects */}
                <DetailSection title="Additional Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <DetailItem
                      label="Agent Remarks"
                      value={hotelDetail.AgentRemarks}
                    />
                    <DetailItem
                      label="Hotel Policy Detail"
                      value={hotelDetail.HotelPolicyDetail}
                    />
                    <DetailItem
                      label="International Passport Details"
                      value={hotelDetail.IntHotelPassportDetails}
                    />
                    <DetailItem
                      label="Post Booking Requests Count"
                      value={hotelDetail.PostBookingRequestDetails?.length || 0}
                    />
                    <DetailItem
                      label="Booking Allowed For Roamer"
                      value={boolText(hotelDetail.BookingAllowedForRoamer)}
                    />
                  </div>

                  {!!hotelDetail.PostBookingRequestDetails?.length && (
                    <div className="mt-4">
                      <h4 className="text-yellow-200 text-sm mb-3">
                        Post Booking Request Details
                      </h4>

                      <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-gray-300">
                        {JSON.stringify(
                          hotelDetail.PostBookingRequestDetails,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  )}
                </DetailSection>

                {/* Full Raw JSON */}
                <DetailSection title="Full Raw Booking JSON">
                  <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <summary className="cursor-pointer text-sm text-yellow-300 font-semibold">
                      Show / Hide Raw JSON
                    </summary>

                    <pre className="mt-4 max-h-125 overflow-auto rounded-xl bg-black/40 p-4 text-xs text-gray-300">
                      {JSON.stringify(hotelDetail, null, 2)}
                    </pre>
                  </details>
                </DetailSection>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HotelBookings;
