"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const pickFirst = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "n/a",
  );
};

const findDeepValueByKeys = (obj, keywords = [], maxDepth = 6) => {
  const visited = new WeakSet();

  const search = (value, depth = 0) => {
    if (!value || depth > maxDepth) return "";

    if (typeof value !== "object") return "";

    if (visited.has(value)) return "";
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = search(item, depth + 1);
        if (found) return found;
      }
      return "";
    }

    for (const [key, val] of Object.entries(value)) {
      const keyLower = String(key).toLowerCase();

      const isMatchingKey = keywords.some((keyword) =>
        keyLower.includes(keyword.toLowerCase()),
      );

      if (
        isMatchingKey &&
        val !== undefined &&
        val !== null &&
        String(val).trim() !== "" &&
        typeof val !== "object"
      ) {
        return String(val).trim();
      }
    }

    for (const val of Object.values(value)) {
      const found = search(val, depth + 1);
      if (found) return found;
    }

    return "";
  };

  return search(obj);
};

const getHotelAddressFromReviewData = (data = {}) => {
  const directAddress = pickFirst(
    data?.hotelAddress,

    data?.hotel?.hotel_address,
    data?.hotel?.address,
    data?.hotel?.Address,
    data?.hotel?.HotelAddress,
    data?.hotel?.AddressLine,
    data?.hotel?.HotelAddressLine,
    data?.hotel?.Location,
    data?.hotel?.HotelLocation,

    data?.hotel?.hotel_raw?.Address,
    data?.hotel?.hotel_raw?.HotelAddress,
    data?.hotel?.hotel_raw?.AddressLine,
    data?.hotel?.hotel_raw?.HotelAddressLine,
    data?.hotel?.hotel_raw?.Location,
    data?.hotel?.hotel_raw?.HotelLocation,

    data?.hotelResult?.Address,
    data?.hotelResult?.HotelAddress,
    data?.hotelResult?.AddressLine,
    data?.hotelResult?.HotelAddressLine,
    data?.hotelResult?.Location,
    data?.hotelResult?.HotelLocation,

    data?.prebookData?.raw?.HotelResult?.[0]?.Address,
    data?.prebookData?.raw?.HotelResult?.[0]?.HotelAddress,
    data?.prebookData?.raw?.HotelResult?.[0]?.AddressLine,
    data?.prebookData?.raw?.HotelResult?.[0]?.HotelLocation,

    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Address,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.HotelAddress,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.AddressLine,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.HotelLocation,
  );

  if (directAddress) return directAddress;

  const deepAddress = findDeepValueByKeys(data, [
    "hoteladdress",
    "addressline",
    "address",
    "location",
  ]);

  if (deepAddress) return deepAddress;

  const fallbackLocation = pickFirst(
    data?.hotel?.city_name,
    data?.hotel?.CityName,
    data?.hotel?.city,
    data?.hotel?.City,
    data?.hotelResult?.CityName,
    data?.hotelResult?.City,
  );

  return fallbackLocation || "";
};

const getHotelFacilitiesFromReviewData = (data = {}) => {
  return (
    data?.hotelFacilities ||
    data?.hotelResult?.HotelFacilities ||
    data?.hotelResult?.Facilities ||
    data?.hotelResult?.HotelFacility ||
    data?.hotel?.HotelFacilities ||
    data?.hotel?.Facilities ||
    data?.hotel?.facilities ||
    data?.hotel?.hotel_facilities ||
    data?.hotel?.hotel_raw?.HotelFacilities ||
    data?.hotel?.hotel_raw?.Facilities ||
    data?.prebookData?.raw?.HotelResult?.[0]?.HotelFacilities ||
    data?.prebookData?.raw?.HotelResult?.[0]?.Facilities ||
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.HotelFacilities ||
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Facilities ||
    []
  );
};

const getHotelNormsFromReviewData = (data = {}) => {
  return (
    data?.hotelNorms ||
    data?.HotelNorms ||
    data?.hotelResult?.HotelNorms ||
    data?.hotel?.HotelNorms ||
    data?.hotel?.hotel_norms ||
    data?.hotel?.hotel_raw?.HotelNorms ||
    data?.roomData?.HotelNorms ||
    data?.prebookData?.raw?.HotelResult?.[0]?.HotelNorms ||
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.HotelNorms ||
    []
  );
};

const HotelReviewBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setGuestDetails, selectedHotel, selectedRoom, prebookData } =
    useHotelStore();

  const stateData = location.state;

  const storedData = (() => {
    try {
      return JSON.parse(localStorage.getItem("reviewBookingData") || "null");
    } catch {
      return null;
    }
  })();

  const baseReviewData = stateData || storedData;

  const reviewData = baseReviewData
    ? {
        ...baseReviewData,

        hotel: {
          ...(selectedHotel || {}),
          ...(baseReviewData?.hotel || {}),
          hotel_raw: {
            ...(selectedHotel?.hotel_raw || selectedHotel?.rawHotel || {}),
            ...(baseReviewData?.hotel?.hotel_raw || {}),
          },
        },

        roomData:
          baseReviewData?.roomData ||
          selectedRoom ||
          baseReviewData?.prebookData?.room ||
          {},

        prebookData: baseReviewData?.prebookData || prebookData || {},

        hotelResult:
          baseReviewData?.hotelResult ||
          prebookData?.raw?.HotelResult?.[0] ||
          prebookData?.raw?.Response?.HotelResult?.[0] ||
          {},

        hotelAddress:
          baseReviewData?.hotelAddress ||
          getHotelAddressFromReviewData({
            ...baseReviewData,
            hotel: {
              ...(selectedHotel || {}),
              ...(baseReviewData?.hotel || {}),
              hotel_raw: {
                ...(selectedHotel?.hotel_raw || selectedHotel?.rawHotel || {}),
                ...(baseReviewData?.hotel?.hotel_raw || {}),
              },
            },
            prebookData: baseReviewData?.prebookData || prebookData || {},
            hotelResult:
              baseReviewData?.hotelResult ||
              prebookData?.raw?.HotelResult?.[0] ||
              prebookData?.raw?.Response?.HotelResult?.[0] ||
              {},
          }),
      }
    : null;

  const [loading, setLoading] = useState(false);

  const parseDateValue = (value) => {
    if (!value) return null;

    const datePart = String(value).split(" ")[0].trim();
    const parts = datePart.split("-");

    if (parts.length === 3) {
      const [a, b, c] = parts;

      if (a.length === 4) {
        const date = new Date(Number(a), Number(b) - 1, Number(c));
        return Number.isNaN(date.getTime()) ? null : date;
      }

      if (c.length === 4) {
        const date = new Date(Number(c), Number(b) - 1, Number(a));
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value) => {
    const date = parseDateValue(value);

    if (!date) return value || "-";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRoomName = (roomData) => {
    if (Array.isArray(roomData?.Name)) return roomData.Name[0];

    return (
      roomData?.room_name ||
      roomData?.RoomTypeName ||
      roomData?.RoomName ||
      roomData?.Name ||
      "Standard Room"
    );
  };

  const formatSupplementText = (supplement) => {
    if (!supplement) return "";

    if (typeof supplement === "string") return supplement;

    const title =
      supplement?.Description ||
      supplement?.Name ||
      supplement?.SupplementName ||
      supplement?.Type ||
      supplement?.ChargeType ||
      "Supplement";

    const amount =
      supplement?.Price ||
      supplement?.Amount ||
      supplement?.Charge ||
      supplement?.SupplementPrice ||
      supplement?.SupplementCharge;

    const currency = supplement?.Currency || supplement?.currency || "INR";

    if (amount !== undefined && amount !== null && amount !== "") {
      return `${title} - ${currency === "INR" ? "₹" : currency} ${Math.round(
        Number(amount),
      )}`;
    }

    return title;
  };

  const getCancellationChargeText = (policy) => {
    const charge = Number(policy?.CancellationCharge ?? 0);
    const type = String(policy?.ChargeType || "").toLowerCase();

    if (type === "percentage") return `${charge}%`;

    if (type === "fixed") {
      if (charge === 0) return "Free Cancellation";
      return `₹ ${Math.round(charge)}`;
    }

    return charge ? String(charge) : "-";
  };

  const handleConfirmBooking = async () => {
    if (!reviewData?.finalPayload) {
      return alert("Booking payload missing");
    }

    try {
      setLoading(true);

      console.log("SELECTED HOTEL FROM STORE:", selectedHotel);
      console.log("SELECTED ROOM FROM STORE:", selectedRoom);
      console.log("PREBOOK DATA FROM STORE:", prebookData);
      console.log("FINAL MERGED REVIEW DATA:", reviewData);
      console.log("FINAL HOTEL ADDRESS SAVED:", {
        hotelAddress:
          reviewData?.hotelAddress || getHotelAddressFromReviewData(reviewData),
        hotel: reviewData?.hotel,
        selectedHotel,
        prebookData,
      });
      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        reviewData.finalPayload,
      );

      const bookingSuccessData = {
        ...reviewData,

        bookingResponse: res.data,

        guestList: reviewData.guestList || [],
        bookingCode: reviewData.bookingCode,

        hotel: reviewData.hotel || {},
        roomData: reviewData.roomData || {},
        hotelResult: reviewData.hotelResult || {},

        hotelAddress:
          reviewData?.hotelAddress ||
          getHotelAddressFromReviewData(reviewData) ||
          reviewData?.hotel?.city_name ||
          reviewData?.hotel?.CityName ||
          "",

        checkIn: reviewData.checkIn,
        checkOut: reviewData.checkOut,
        net: reviewData.net,

        isPANRequired: reviewData.isPANRequired,
        corporatePAN: reviewData.corporatePAN,

        finalPayload: reviewData.finalPayload,

        cancellationPolicies: reviewData.cancellationPolicies || [],
        roomPromotions: reviewData.roomPromotions || [],
        supplements: reviewData.supplements || [],
        roomAmenities: reviewData.roomAmenities || [],
        rateConditions: reviewData.rateConditions || [],

        hotelFacilities:
          reviewData?.hotelFacilities ||
          getHotelFacilitiesFromReviewData(reviewData),

        hotelNorms:
          reviewData?.hotelNorms || getHotelNormsFromReviewData(reviewData),
      };

      localStorage.setItem(
        "hotelBookingData",
        JSON.stringify(bookingSuccessData),
      );

      setGuestDetails(reviewData.guestList || []);

      navigate("/hotel-booking-success", {
        state: {
          booking: res.data,
          savedData: bookingSuccessData,
        },
      });

      localStorage.removeItem("reviewBookingData");
    } catch (err) {
      console.log("BOOK ERROR:", err?.response?.data || err);

      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Error?.ErrorMessage ||
          err?.message ||
          "Booking failed",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!reviewData) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] p-10 text-center text-white">
        <h2 className="mb-4 text-xl text-red-400">⚠️ Review data not found</h2>

        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-yellow-400 px-5 py-2 font-semibold text-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  const {
    hotel,
    roomData,
    checkIn,
    checkOut,
    net,
    guestList = [],
    bookingCode,
    isPANRequired,
    corporatePAN,
    cancellationPolicies = [],
    roomPromotions = [],
    supplements = [],
    roomAmenities = [],
    rateConditions = [],
    finalPayload,
  } = reviewData;

  return (
    <div className="min-h-screen bg-[#0B0B0F] px-4 py-24 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 rounded-full border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-yellow-400 hover:text-yellow-300"
          >
            ← Back to Guest Details
          </button>

          <h1 className="text-3xl font-bold text-yellow-400">
            Review Your Booking
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Please check all details before confirming your hotel booking.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Hotel Details */}
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                {hotel?.hotel_name || hotel?.HotelName || "Hotel Booking"}
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                {reviewData?.hotelAddress ||
                  getHotelAddressFromReviewData(reviewData) ||
                  "Address not available"}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#0B0B0F] p-4">
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatDate(checkIn)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#0B0B0F] p-4">
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatDate(checkOut)}
                  </p>
                </div>

                <div className="rounded-xl bg-[#0B0B0F] p-4 sm:col-span-2">
                  <p className="text-xs text-gray-500">Room</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatRoomName(roomData)}
                  </p>
                </div>

                {/* <div className="rounded-xl bg-[#0B0B0F] p-4 sm:col-span-2">
                  <p className="text-xs text-gray-500">Booking Code</p>
                  <p className="mt-1 break-all text-sm font-semibold text-gray-300">
                    {bookingCode || "-"}
                  </p>
                </div> */}
              </div>
            </div>

            {/* Guests */}
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
              <div className="bg-[#1E2230] px-5 py-3">
                <h3 className="font-semibold text-yellow-300">Guest Details</h3>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  {guestList.map((guest, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-gray-800 bg-[#0B0B0F] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-white">
                            {guest.Title} {guest.FirstName} {guest.LastName}
                          </h4>

                          <p className="mt-1 text-xs text-gray-400">
                            {guest.PaxType === 1 ? "Adult" : "Child"} • Age{" "}
                            {guest.Age}
                            {guest.LeadPassenger ? " • Lead Passenger" : ""}
                          </p>
                        </div>

                        <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                          Guest {index + 1}
                        </span>
                      </div>

                      {guest.LeadPassenger && (
                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
                          <p>Email: {guest.Email || "-"}</p>
                          <p>Phone: {guest.Phoneno || "-"}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PAN */}
            {isPANRequired && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <h3 className="mb-3 font-semibold text-yellow-300">
                  PAN Details
                </h3>

                <div className="rounded-xl bg-[#0B0B0F] p-4">
                  <p className="text-xs text-gray-500">Corporate PAN</p>
                  <p className="mt-1 font-semibold text-white">
                    {corporatePAN || finalPayload?.CorporatePAN || "-"}
                  </p>
                </div>
              </div>
            )}

            {/* Cancellation */}
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
              <div className="bg-[#1E2230] px-5 py-3">
                <h3 className="font-semibold text-yellow-300">
                  Cancellation Charges
                </h3>
              </div>

              <div className="p-5">
                {cancellationPolicies.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#202432] text-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            Cancelled On or After
                          </th>
                          <th className="px-4 py-3 text-left">Charge</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-800">
                        {cancellationPolicies.map((policy, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-gray-300">
                              {formatDate(policy?.FromDate)}
                            </td>

                            <td
                              className={`px-4 py-3 font-semibold ${
                                getCancellationChargeText(policy) ===
                                "Free Cancellation"
                                  ? "text-green-300"
                                  : "text-red-300"
                              }`}
                            >
                              {getCancellationChargeText(policy)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Cancellation policy is not available.
                  </p>
                )}
              </div>
            </div>

            {/* Promotions */}
            {roomPromotions.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <h3 className="mb-4 font-semibold text-yellow-300">
                  Room Promotions
                </h3>

                <div className="flex flex-wrap gap-3">
                  {roomPromotions.map((promotion, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm font-medium text-green-200"
                    >
                      {typeof promotion === "string"
                        ? promotion
                        : promotion?.Description ||
                          promotion?.Name ||
                          promotion?.PromotionName ||
                          "Promotion available"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplements */}
            {supplements.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <h3 className="mb-4 font-semibold text-yellow-300">
                  Supplements
                </h3>

                <div className="space-y-3">
                  {supplements.map((supplement, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-100"
                    >
                      <div className="font-semibold">
                        {formatSupplementText(supplement)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {roomAmenities.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <h3 className="mb-4 font-semibold text-yellow-300">
                  Room Amenities
                </h3>

                <div className="flex flex-wrap gap-2">
                  {roomAmenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-gray-700 bg-[#0B0B0F] px-3 py-1.5 text-xs text-gray-300"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rate Conditions */}
            {rateConditions.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
                <div className="bg-[#1E2230] px-5 py-3">
                  <h3 className="font-semibold text-yellow-300">
                    Rate Conditions
                  </h3>
                </div>

                <div className="p-5">
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-300">
                    {rateConditions.map((condition, index) => (
                      <li
                        key={index}
                        className="rounded-xl border border-white/10 bg-white/3 p-3 text-gray-300"
                        dangerouslySetInnerHTML={{
                          __html: String(condition || "")
                            .replaceAll("&lt;", "<")
                            .replaceAll("&gt;", ">")
                            .replaceAll("&amp;", "&")
                            .replaceAll(",", ", "),
                        }}
                      />
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Price Summary */}
          <div className="sticky top-24 h-fit rounded-2xl border border-gray-800 bg-[#15151C] p-6">
            <h3 className="mb-4 text-lg font-semibold text-yellow-300">
              Price Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>
                  Total Amount{" "}
                  <p className="text-xs  text-gray-200">
                    (Inclusive of all taxes)
                  </p>
                </span>
                <span>₹ {Math.round(Number(net || 0))}</span>
              </div>

              <hr className="border-gray-700" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Payable</span>
                <span className="text-yellow-400">
                  ₹ {Math.round(Number(net || 0))}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Confirming Booking..." : "Confirm Booking"}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              Booking will be created only after clicking Confirm Booking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelReviewBooking;
