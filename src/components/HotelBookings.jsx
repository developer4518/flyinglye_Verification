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
                <p className="text-xs text-gray-500 break-all">
                  {b.booking_code}
                </p>

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
                    Get Hotel Detail
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
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-end mb-4">
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
                {/* Header */}
                <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-yellow-400">
                        {hotelDetail.HotelName || "Hotel Booking"}
                      </h2>

                      <div className="text-sm text-gray-400 mt-3 space-y-1">
                        <p>Booking ID: {hotelDetail.BookingId || "N/A"}</p>
                        <p>Invoice: {hotelDetail.InvoiceNo || "N/A"}</p>
                        <p>Ref: {hotelDetail.BookingRefNo || "N/A"}</p>
                        <p>
                          Confirmation: {hotelDetail.ConfirmationNo || "N/A"}
                        </p>

                        <p className="text-xs text-gray-500 mt-2">
                          Booked: {formatDateTime(hotelDetail.BookingDate)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${
                        hotelDetail.HotelBookingStatus === "Cancelled"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {hotelDetail.HotelBookingStatus || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Hotel Info */}
                <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-yellow-300 mb-3 font-semibold">
                    Hotel Info
                  </h3>

                  <p className="text-sm text-gray-400">
                    {[hotelDetail.AddressLine1, hotelDetail.City]
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>

                  <p className="text-sm mt-2">
                    {formatDate(hotelDetail.CheckInDate)} →{" "}
                    {formatDate(hotelDetail.CheckOutDate)}
                  </p>

                  {hotelDetail.StarRating && (
                    <p className="text-sm mt-1">
                      ⭐ {hotelDetail.StarRating} Star
                    </p>
                  )}
                </div>

                {/* Rooms */}
                {hotelDetail.Rooms?.map((room, idx) => (
                  <div
                    key={idx}
                    className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
                  >
                    <h3 className="text-yellow-300 mb-3 font-semibold">
                      Room {idx + 1} - {room.RoomTypeName || "Room"}
                    </h3>

                    {room.RoomDescription && (
                      <div
                        className="text-sm text-gray-400 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: room.RoomDescription,
                        }}
                      />
                    )}

                    <p className="text-sm mt-3">
                      Adults: {room.AdultCount || 0} | Children:{" "}
                      {room.ChildCount || 0}
                    </p>

                    {!!room.Amenities?.length && (
                      <div className="mt-4">
                        <h4 className="text-yellow-200 text-sm mb-2">
                          Amenities
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-400">
                          {room.Amenities.slice(0, 12).map((a, i) => (
                            <div key={i}>• {a}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!!room.HotelPassenger?.length && (
                      <div className="mt-5">
                        <h4 className="text-yellow-200 text-sm mb-2">Guests</h4>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {room.HotelPassenger.map((p, i) => (
                            <div
                              key={i}
                              className={`rounded-xl p-3 text-sm border ${
                                p.LeadPassenger
                                  ? "bg-green-400/10 border-green-400/20"
                                  : "bg-white/5 border-white/10"
                              }`}
                            >
                              <p>
                                {p.Title} {p.FirstName} {p.LastName}
                              </p>

                              <p className="text-xs text-gray-400 mt-1">
                                Age: {p.Age || "N/A"}
                                {p.LeadPassenger && " • Lead Passenger"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-gray-300">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-400">Room Price</p>
                        <p className="text-white font-semibold">
                          {formatMoney(room.PriceBreakUp?.RoomRate || 0)}
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-gray-400">Tax</p>
                        <p className="text-white font-semibold">
                          {formatMoney(room.PriceBreakUp?.RoomTax || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Price Summary */}
                <div className="bg-yellow-400/10 p-6 rounded-3xl border border-yellow-400/20">
                  <h3 className="text-yellow-300 mb-3 font-semibold">
                    Price Summary
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Net Amount</span>
                      <span>{formatMoney(net)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Convenience Fee</span>
                      <span>{formatMoney(fee)}</span>
                    </div>

                    <hr className="border-gray-700" />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-yellow-400">
                        {formatMoney(total)}
                      </span>
                    </div>

                    {hotelDetail?.HotelBookingStatus === "Cancelled" && (
                      <div className="flex justify-between text-green-400 font-semibold pt-2">
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

                {/* Policies */}
                {!!hotelDetail?.RateConditions?.length && (
                  <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
                    <h3 className="text-yellow-300 mb-3 font-semibold">
                      Policies
                    </h3>

                    <ul className="text-sm text-gray-400 space-y-2">
                      {hotelDetail.RateConditions.slice(0, 8).map((r, i) => (
                        <li key={i}>• {stripHtml(r)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HotelBookings;
