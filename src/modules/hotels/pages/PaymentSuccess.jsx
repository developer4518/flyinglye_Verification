"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { publicApi, privateApi } from "../../../services/api";

import { useHotelStore } from "../../../store/hotelStore";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { setGuestDetails } = useHotelStore();

  const txnid = searchParams.get("txnid");

  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");

  /*
   * IMPORTANT:
   * Prevent React StrictMode or rerenders
   * from calling the hotel booking API twice.
   */
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;

    const verifyAndBookHotel = async () => {
      if (!txnid) {
        setStatus("error");
        setError("Transaction ID missing.");
        return;
      }

      try {
        // =====================================================
        // STEP 1 - VERIFY PAYMENT
        // =====================================================

        setStatus("verifying");
        setError("");

        console.log("VERIFYING PAYMENT:", txnid);

        const verifyResponse = await publicApi.get(`/payment/verify/${txnid}/`);

        console.log("PAYMENT VERIFY RESPONSE:", verifyResponse.data);

        const paidAmount = Number(verifyResponse.data?.amount || 0);

        console.log("ACTUAL PAID AMOUNT:", paidAmount);

        const paymentIsValid =
          verifyResponse.data?.success === true &&
          verifyResponse.data?.paid === true &&
          String(verifyResponse.data?.status || "").toLowerCase() === "success";

        if (!paymentIsValid) {
          throw new Error("Payment could not be verified.");
        }

        // =====================================================
        // STEP 2 - GET SAVED BOOKING DATA
        // =====================================================

        setStatus("booking");

        const pendingData = JSON.parse(
          localStorage.getItem("pendingHotelBooking") || "null",
        );

        if (!pendingData) {
          throw new Error("Pending hotel booking data not found.");
        }

        const { reviewData, bookingPayload, gstForms } = pendingData;

        if (!reviewData) {
          throw new Error("Review booking data missing.");
        }

        if (!bookingPayload) {
          throw new Error("Hotel booking payload missing.");
        }

        // =====================================================
        // STEP 3 - PREVENT DOUBLE BOOKING
        // =====================================================

        const bookingLockKey = `hotelBookingStarted_${txnid}`;

        const alreadyStarted = localStorage.getItem(bookingLockKey);

        /*
         * If this transaction already produced booking data,
         * simply continue to success page.
         */
        const existingBookingData = JSON.parse(
          localStorage.getItem("hotelBookingData") || "null",
        );

        if (alreadyStarted === "completed" && existingBookingData) {
          navigate("/hotel-booking-success", {
            replace: true,

            state: {
              booking: existingBookingData.bookingResponse,

              savedData: existingBookingData,
            },
          });

          return;
        }

        /*
         * Set processing lock BEFORE third-party booking API.
         */
        localStorage.setItem(bookingLockKey, "processing");

        console.log("PAYMENT VERIFIED:", txnid);

        console.log("FINAL HOTEL BOOKING PAYLOAD:", bookingPayload);

        // =====================================================
        // STEP 4 - HOTEL BOOK API
        // =====================================================

        const bookingResponse = await privateApi.post(
          "/api/hotels/hotels/book/",
          bookingPayload,
        );

        console.log("HOTEL BOOKING RESPONSE:", bookingResponse.data);

        // =====================================================
        // STEP 5 - BUILD SUCCESS DATA
        // =====================================================

        const bookingSuccessData = {
          ...reviewData,

          bookingResponse: bookingResponse.data,

          guestList: reviewData.guestList || [],

          bookingCode: reviewData.bookingCode,

          hotel: reviewData.hotel || {},

          roomData: reviewData.roomData || {},

          hotelResult: reviewData.hotelResult || {},

          hotelAddress: reviewData.hotelAddress || "",

          checkIn: reviewData.checkIn,

          checkOut: reviewData.checkOut,

          net: reviewData.net,

          isPANRequired: reviewData.isPANRequired,

          corporatePAN: reviewData.corporatePAN,

          finalPayload: bookingPayload,

          cancellationPolicies: reviewData.cancellationPolicies || [],

          roomPromotions: reviewData.roomPromotions || [],

          supplements: reviewData.supplements || [],

          roomAmenities: reviewData.roomAmenities || [],

          rateConditions: reviewData.rateConditions || [],

          hotelFacilities: reviewData.hotelFacilities || [],

          hotelNorms: reviewData.hotelNorms || [],

          gstDetails: gstForms || [],

          // PAYMENT INFORMATION
          // PAYMENT INFORMATION

          // ✅ Actual amount paid through PayU
          paidAmount,

          paymentTransactionId: txnid,

          paymentStatus: "success",

          paymentVerified: true,
        };

        // =====================================================
        // STEP 6 - SAVE BOOKING
        // =====================================================

        localStorage.setItem(
          "hotelBookingData",
          JSON.stringify(bookingSuccessData),
        );

        setGuestDetails(reviewData.guestList || []);

        // Mark transaction booking as completed.
        localStorage.setItem(bookingLockKey, "completed");

        // Temporary data is no longer needed.
        localStorage.removeItem("pendingHotelBooking");

        localStorage.removeItem("reviewBookingData");

        // =====================================================
        // STEP 7 - EXISTING SUCCESS PAGE
        // =====================================================

        setStatus("success");

        navigate("/hotel-booking-success", {
          replace: true,

          state: {
            booking: bookingResponse.data,

            savedData: bookingSuccessData,
          },
        });
      } catch (err) {
        console.error(
          "PAYMENT / HOTEL BOOKING ERROR:",
          err?.response?.data || err,
        );

        /*
         * If third-party booking failed,
         * remove processing lock so you can retry safely.
         */
        if (txnid) {
          const bookingLockKey = `hotelBookingStarted_${txnid}`;

          if (localStorage.getItem(bookingLockKey) === "processing") {
            localStorage.removeItem(bookingLockKey);
          }
        }

        setStatus("error");

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.Error?.ErrorMessage ||
            err?.message ||
            "Unable to generate hotel voucher.",
        );
      }
    };

    verifyAndBookHotel();
  }, [txnid, navigate, setGuestDetails]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0F] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-yellow-400/20 bg-[#15151C] p-8 text-center shadow-2xl">
        {status === "verifying" && (
          <>
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-400" />

            <h1 className="mt-6 text-xl font-bold text-yellow-300">
              Verifying Payment...
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Please do not refresh or close this page.
            </p>

            <p className="mt-4 break-all text-xs text-gray-500">
              Transaction ID: {txnid || "N/A"}
            </p>
          </>
        )}

        {status === "booking" && (
          <>
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-700 border-t-green-400" />

            <h1 className="mt-6 text-xl font-bold text-green-300">
              Generating Your Voucher...
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Payment verified successfully. We are now confirming your hotel
              booking.
            </p>

            <p className="mt-4 text-xs text-yellow-300">
              Please do not refresh or close this page.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4 text-6xl">✅</div>

            <h1 className="text-2xl font-bold text-green-400">
              Booking Successful
            </h1>

            <p className="mt-3 text-sm text-gray-400">
              Opening your booking details...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4 text-6xl">❌</div>

            <h1 className="text-2xl font-bold text-red-400">
              Unable To Generate Voucher
            </h1>

            <p className="mt-3 text-sm text-gray-400">{error}</p>

            {txnid && (
              <div className="mt-5 rounded-xl border border-gray-800 bg-[#0B0B0F] p-4">
                <p className="text-xs text-gray-500">Transaction ID</p>

                <p className="mt-1 break-all text-sm font-semibold text-white">
                  {txnid}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 py-3 font-bold text-black"
            >
              Retry Voucher Generation
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
