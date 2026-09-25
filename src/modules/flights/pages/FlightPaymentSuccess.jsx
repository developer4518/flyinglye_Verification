"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    CheckCircle2,
    Clock3,
    AlertTriangle,
    XCircle,
    Plane,
    RefreshCcw,
    ArrowRight,
    Copy,
    ShieldCheck,
} from "lucide-react";

import { publicApi, privateApi } from "../../../services/api";

const FlightPaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const txnid = searchParams.get("txnid");

    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");
    const [paymentData, setPaymentData] = useState(null);
    const [ticketData, setTicketData] = useState(null);

    const [copied, setCopied] = useState(false);

    const hasStartedRef = useRef(false);

    // ============================================================
    // COPY TRANSACTION ID
    // ============================================================

    const handleCopyTxn = async () => {
        if (!txnid) return;

        try {
            await navigator.clipboard.writeText(txnid);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1600);
        } catch {
            setCopied(false);
        }
    };

    // ============================================================
    // GET SAVED PENDING FLIGHT PAYMENT DATA
    // ============================================================

    const getPendingFlightData = () => {
        try {
            return JSON.parse(
                localStorage.getItem("pendingFlightPayment") || "null",
            );
        } catch {
            return null;
        }
    };

    // ============================================================
    // SAVE FINAL PAYMENT/TICKET DATA
    // ============================================================

    const saveFinalFlightPaymentData = (data) => {
        try {
            localStorage.setItem(
                "flightPaymentResult",
                JSON.stringify(data),
            );
        } catch {
            // intentionally silent
        }
    };

    // ============================================================
    // MAIN FLOW
    // ============================================================

    useEffect(() => {
        if (hasStartedRef.current) return;

        hasStartedRef.current = true;

        const verifyAndGenerateTicket = async () => {
            if (!txnid) {
                setStatus("error");
                setMessage(
                    "Transaction ID is missing. We could not verify your payment.",
                );
                return;
            }

            const lockKey = `flightTicketStarted_${txnid}`;

            try {
                // ======================================================
                // STEP 1 - VERIFY PAYU PAYMENT
                // ======================================================

                setStatus("verifying");
                setMessage("");

                const verifyResponse = await publicApi.get(
                    `/payment/airline/verify/${txnid}/`,
                );

                const verified = verifyResponse?.data;

                setPaymentData(verified);

                const paymentIsValid =
                    verified?.success === true &&
                    verified?.paid === true &&
                    String(
                        verified?.payment_status ||
                        verified?.status ||
                        "",
                    )
                        .trim()
                        .toLowerCase() === "success";

                if (!paymentIsValid) {
                    setStatus("payment_failed");

                    setMessage(
                        verified?.message ||
                        "Your payment could not be verified successfully.",
                    );

                    return;
                }

                // ======================================================
                // STEP 2 - CHECK IF BACKEND ALREADY KNOWS FINAL STATE
                // ======================================================

                const currentTicketStatus = String(
                    verified?.ticket_status || "",
                )
                    .trim()
                    .toLowerCase();

                if (currentTicketStatus === "ticketed") {
                    setStatus("success");

                    setMessage(
                        "Your payment was successful and your ticket has already been generated.",
                    );

                    saveFinalFlightPaymentData({
                        txnid,
                        payment: verified,
                        ticket: null,
                        status: "ticketed",
                    });

                    return;
                }

                if (
                    currentTicketStatus ===
                    "verification_pending"
                ) {
                    setStatus("verification_pending");

                    setMessage(
                        verified?.verification_message ||
                        verified?.message ||
                        "Your payment was successful, but your ticket confirmation is still being verified. Please check My Bookings after 5 minutes.",
                    );

                    return;
                }

                if (
                    currentTicketStatus === "failed" &&
                    String(verified?.refund_status || "")
                        .trim()
                        .toLowerCase() === "pending"
                ) {
                    setStatus("ticket_failed");

                    setMessage(
                        verified?.message ||
                        "Your payment was successful, but your flight ticket could not be generated. Your amount will be refunded shortly.",
                    );

                    return;
                }

                // ======================================================
                // STEP 3 - GET SAVED TICKET PAYLOAD
                // ======================================================

                const pendingData = getPendingFlightData();

                if (!pendingData) {
                    setStatus("error");

                    setMessage(
                        "Payment was successful, but the pending flight ticket data was not found. Please contact FlyingLyte support with your Transaction ID.",
                    );

                    return;
                }

                const {
                    paymentAction,
                    ticketPayload,
                    successRedirect,
                    source,
                } = pendingData;

                if (!paymentAction) {
                    setStatus("error");

                    setMessage(
                        "Payment was successful, but payment action information is missing.",
                    );

                    return;
                }

                if (!ticketPayload) {
                    setStatus("error");

                    setMessage(
                        "Payment was successful, but ticket booking data is missing.",
                    );

                    return;
                }

                // ======================================================
                // STEP 4 - DUPLICATE PROTECTION
                // ======================================================

                const existingLock =
                    localStorage.getItem(lockKey);

                const storedResult = (() => {
                    try {
                        return JSON.parse(
                            localStorage.getItem(
                                "flightPaymentResult",
                            ) || "null",
                        );
                    } catch {
                        return null;
                    }
                })();

                if (
                    existingLock === "completed" &&
                    storedResult?.txnid === txnid
                ) {
                    if (
                        storedResult?.status === "ticketed"
                    ) {
                        setStatus("success");
                        setTicketData(
                            storedResult?.ticket || null,
                        );

                        setMessage(
                            "Your ticket has already been generated successfully.",
                        );

                        return;
                    }

                    if (
                        storedResult?.status ===
                        "verification_pending"
                    ) {
                        setStatus("verification_pending");

                        setMessage(
                            storedResult?.message ||
                            "Your ticket confirmation is still being verified.",
                        );

                        return;
                    }

                    if (
                        storedResult?.status ===
                        "ticket_failed"
                    ) {
                        setStatus("ticket_failed");

                        setMessage(
                            storedResult?.message ||
                            "Your ticket could not be generated.",
                        );

                        return;
                    }
                }

                localStorage.setItem(
                    lockKey,
                    "processing",
                );

                // ======================================================
                // STEP 5 - BUILD FINAL PAYLOAD WITH TXN ID
                // ======================================================

                const finalPayload = {
                    ...ticketPayload,
                    txnid,
                };

                // ======================================================
                // STEP 6 - SELECT CORRECT TICKET API
                // ======================================================

                let endpoint = "";

                if (paymentAction === "lcc_ticket") {
                    endpoint =
                        "/api/airlines/booking/ticket/";
                } else if (
                    paymentAction ===
                    "non_lcc_direct_ticket" ||
                    paymentAction ===
                    "non_lcc_hold_ticket"
                ) {
                    endpoint =
                        "/api/airlines/ticket/";
                } else {
                    localStorage.removeItem(lockKey);

                    setStatus("error");

                    setMessage(
                        "Invalid flight payment action received.",
                    );

                    return;
                }

                // ======================================================
                // STEP 7 - GENERATE TICKET
                // ======================================================

                setStatus("ticketing");

                setMessage(
                    "Payment verified successfully. We are now generating your flight ticket.",
                );

                let ticketResponse;

                try {
                    ticketResponse =
                        await privateApi.post(
                            endpoint,
                            finalPayload,
                        );
                } catch (err) {
                    const responseData =
                        err?.response?.data || {};

                    const backendTicketStatus =
                        String(
                            responseData?.ticket_status || "",
                        )
                            .trim()
                            .toLowerCase();

                    const verificationPending =
                        backendTicketStatus ===
                        "verification_pending" ||
                        responseData?.verification_required ===
                        true ||
                        responseData?.do_not_retry_blindly ===
                        true;

                    // ====================================================
                    // UNCERTAIN / TIMEOUT / NETWORK STATE
                    // ====================================================

                    if (verificationPending) {
                        const pendingMessage =
                            responseData?.message ||
                            "Your payment was successful, but ticket confirmation is still being verified. Please check My Bookings after 5 minutes. Do not make another payment.";

                        localStorage.setItem(
                            lockKey,
                            "completed",
                        );

                        saveFinalFlightPaymentData({
                            txnid,
                            payment: verified,
                            ticket: responseData,
                            status:
                                "verification_pending",
                            message: pendingMessage,
                        });

                        setTicketData(responseData);
                        setStatus(
                            "verification_pending",
                        );
                        setMessage(pendingMessage);

                        return;
                    }

                    // ====================================================
                    // CONFIRMED TICKET FAILURE
                    // ====================================================

                    const refundPending =
                        String(
                            responseData?.refund_status ||
                            "",
                        )
                            .trim()
                            .toLowerCase() === "pending";

                    if (
                        backendTicketStatus === "failed" ||
                        refundPending
                    ) {
                        const failureMessage =
                            responseData?.message ||
                            "Your payment was successful, but your flight ticket could not be generated. Your amount will be refunded shortly.";

                        localStorage.setItem(
                            lockKey,
                            "completed",
                        );

                        saveFinalFlightPaymentData({
                            txnid,
                            payment: verified,
                            ticket: responseData,
                            status: "ticket_failed",
                            message: failureMessage,
                        });

                        setTicketData(responseData);
                        setStatus("ticket_failed");
                        setMessage(failureMessage);

                        return;
                    }

                    /*
                     * Important:
                     * Do not immediately allow blind retry after an
                     * unknown ticket error because TBO may have processed
                     * the ticket even if frontend did not receive it.
                     */
                    const uncertainMessage =
                        responseData?.message ||
                        "Your payment was successful. We could not confirm the final ticket status immediately. Please check My Bookings after 5 minutes before trying again.";

                    localStorage.setItem(
                        lockKey,
                        "completed",
                    );

                    saveFinalFlightPaymentData({
                        txnid,
                        payment: verified,
                        ticket: responseData,
                        status:
                            "verification_pending",
                        message: uncertainMessage,
                    });

                    setTicketData(responseData);
                    setStatus(
                        "verification_pending",
                    );
                    setMessage(uncertainMessage);

                    return;
                }

                // ======================================================
                // STEP 8 - TICKET API SUCCESS
                // ======================================================

                const responseData =
                    ticketResponse?.data || {};

                setTicketData(responseData);

                const responseTicketStatus =
                    String(
                        responseData?.ticket_status ||
                        responseData?.booking_status ||
                        "",
                    )
                        .trim()
                        .toLowerCase();

                if (
                    responseTicketStatus ===
                    "verification_pending"
                ) {
                    const pendingMessage =
                        responseData?.message ||
                        "Your ticket confirmation is being verified. Please check My Bookings after 5 minutes.";

                    localStorage.setItem(
                        lockKey,
                        "completed",
                    );

                    saveFinalFlightPaymentData({
                        txnid,
                        payment: verified,
                        ticket: responseData,
                        status:
                            "verification_pending",
                        message: pendingMessage,
                    });

                    setStatus(
                        "verification_pending",
                    );
                    setMessage(pendingMessage);

                    return;
                }

                // ======================================================
                // STEP 9 - SUCCESS
                // ======================================================

                localStorage.setItem(
                    lockKey,
                    "completed",
                );

                saveFinalFlightPaymentData({
                    txnid,
                    payment: verified,
                    ticket: responseData,
                    status: "ticketed",
                });


                const pendingFlightData =
                    getPendingFlightData();

                if (
                    pendingFlightData?.flightBookingData
                ) {
                    const finalFlightBookingData = {
                        ...pendingFlightData.flightBookingData,

                        booking: responseData,

                        paymentTransactionId:
                            txnid,

                        paymentStatus:
                            "success",

                        paymentVerified:
                            true,
                    };

                    localStorage.setItem(
                        "flightBookingData",
                        JSON.stringify(
                            finalFlightBookingData,
                        ),
                    );
                }

                localStorage.removeItem(
                    "pendingFlightPayment",
                );

                setStatus("success");

                setMessage(
                    "Your payment was successful and your flight ticket has been generated successfully.",
                );

                // ======================================================
                // STEP 10 - OPTIONAL AUTO REDIRECT
                // ======================================================

                if (successRedirect) {
                    setTimeout(() => {
                        navigate(successRedirect, {
                            replace: true,

                            state: {
                                bookingResponse:
                                    responseData,

                                paymentTransactionId:
                                    txnid,

                                paymentVerified:
                                    true,

                                paymentData:
                                    verified,

                                source:
                                    source || "payment",
                            },
                        });
                    }, 1800);
                }
            } catch (err) {
                console.error(
                    "FLIGHT PAYMENT / TICKET ERROR:",
                    err?.response?.data || err,
                );

                /*
                 * Payment verification itself failed.
                 * This is different from TBO ticket uncertainty.
                 */
                if (txnid) {
                    const currentLock =
                        localStorage.getItem(lockKey);

                    if (currentLock === "processing") {
                        localStorage.removeItem(
                            lockKey,
                        );
                    }
                }

                setStatus("error");

                setMessage(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Unable to complete flight payment verification.",
                );
            }
        };

        verifyAndGenerateTicket();
    }, [txnid, navigate]);

    // ============================================================
    // UI CONFIG
    // ============================================================

    const uiConfig = {
        verifying: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-yellow-400" />
                </div>
            ),
            eyebrow: "Secure Payment Verification",
            title: "Verifying Your Payment",
            description:
                message ||
                "We are securely verifying your PayU transaction.",
            titleClass: "text-yellow-300",
            borderClass:
                "border-yellow-400/20",
            glowClass:
                "shadow-yellow-500/5",
        },

        ticketing: {
            icon: (
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10">
                    <Plane className="h-9 w-9 text-cyan-300" />

                    <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/20" />
                </div>
            ),
            eyebrow: "Payment Verified",
            title: "Generating Your Ticket",
            description:
                message ||
                "Your payment is confirmed. We are now generating your flight ticket.",
            titleClass: "text-cyan-300",
            borderClass:
                "border-cyan-400/20",
            glowClass:
                "shadow-cyan-500/5",
        },

        success: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-green-400/20 bg-green-400/10">
                    <CheckCircle2 className="h-11 w-11 text-green-400" />
                </div>
            ),
            eyebrow: "Booking Confirmed",
            title: "Ticket Generated Successfully",
            description:
                message ||
                "Your ticket has been generated successfully.",
            titleClass: "text-green-400",
            borderClass:
                "border-green-400/20",
            glowClass:
                "shadow-green-500/5",
        },

        verification_pending: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10">
                    <Clock3 className="h-10 w-10 text-amber-300" />
                </div>
            ),
            eyebrow: "Payment Received",
            title: "Ticket Confirmation Pending",
            description:
                message ||
                "Your ticket confirmation is still being verified.",
            titleClass: "text-amber-300",
            borderClass:
                "border-amber-400/20",
            glowClass:
                "shadow-amber-500/5",
        },

        ticket_failed: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10">
                    <AlertTriangle className="h-10 w-10 text-red-300" />
                </div>
            ),
            eyebrow: "Payment Successful",
            title: "Ticket Could Not Be Generated",
            description:
                message ||
                "Your ticket could not be generated. Your amount will be refunded shortly.",
            titleClass: "text-red-300",
            borderClass:
                "border-red-400/20",
            glowClass:
                "shadow-red-500/5",
        },

        payment_failed: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10">
                    <XCircle className="h-11 w-11 text-red-400" />
                </div>
            ),
            eyebrow: "Payment Verification",
            title: "Payment Could Not Be Verified",
            description:
                message ||
                "Your payment could not be verified.",
            titleClass: "text-red-300",
            borderClass:
                "border-red-400/20",
            glowClass:
                "shadow-red-500/5",
        },

        error: {
            icon: (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10">
                    <AlertTriangle className="h-10 w-10 text-red-300" />
                </div>
            ),
            eyebrow: "We Need Your Attention",
            title: "Unable To Complete Request",
            description:
                message ||
                "Something went wrong while processing your booking.",
            titleClass: "text-red-300",
            borderClass:
                "border-red-400/20",
            glowClass:
                "shadow-red-500/5",
        },
    };

    const config =
        uiConfig[status] || uiConfig.error;

    const isBusy =
        status === "verifying" ||
        status === "ticketing";

    // ============================================================
    // UI
    // ============================================================

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#07090D] px-4 pb-16 pt-28 text-white sm:px-6">
            {/* Background decoration */}
            <div className="pointer-events-none absolute left-1/2 top-10 h-100 w-100 -translate-x-1/2 rounded-full bg-yellow-400/5 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
                {/* Progress */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                    <div
                        className={`h-1 rounded-full ${[
                                "verifying",
                                "ticketing",
                                "success",
                                "verification_pending",
                                "ticket_failed",
                            ].includes(status)
                                ? "bg-yellow-400"
                                : "bg-white/10"
                            }`}
                    />

                    <div
                        className={`h-1 rounded-full ${[
                                "ticketing",
                                "success",
                                "verification_pending",
                                "ticket_failed",
                            ].includes(status)
                                ? "bg-cyan-400"
                                : "bg-white/10"
                            }`}
                    />

                    <div
                        className={`h-1 rounded-full ${status === "success"
                                ? "bg-green-400"
                                : status ===
                                    "verification_pending"
                                    ? "bg-amber-400"
                                    : status ===
                                        "ticket_failed"
                                        ? "bg-red-400"
                                        : "bg-white/10"
                            }`}
                    />
                </div>

                <div
                    className={`overflow-hidden rounded-3xl border bg-[#11141B]/95 shadow-2xl backdrop-blur-xl ${config.borderClass} ${config.glowClass}`}
                >
                    {/* Header */}
                    <div className="border-b border-white/6 px-6 py-8 text-center sm:px-10 sm:py-10">
                        {config.icon}

                        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                            {config.eyebrow}
                        </p>

                        <h1
                            className={`mt-2 text-2xl font-bold sm:text-3xl ${config.titleClass}`}
                        >
                            {config.title}
                        </h1>

                        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                            {config.description}
                        </p>
                    </div>

                    {/* Information */}
                    <div className="space-y-4 p-5 sm:p-8">
                        {/* Transaction */}
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Transaction ID
                                    </p>

                                    <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                                        {txnid || "N/A"}
                                    </p>
                                </div>

                                {txnid && (
                                    <button
                                        type="button"
                                        onClick={handleCopyTxn}
                                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-200"
                                    >
                                        <Copy className="h-3.5 w-3.5" />

                                        {copied
                                            ? "Copied"
                                            : "Copy"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Payment amount */}
                        {paymentData?.amount && (
                            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 p-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Payment Amount
                                    </p>

                                    <p className="mt-1 text-sm text-gray-400">
                                        PayU verified amount
                                    </p>
                                </div>

                                <p className="text-xl font-bold text-yellow-300">
                                    ₹{" "}
                                    {Number(
                                        paymentData.amount || 0,
                                    ).toLocaleString(
                                        "en-IN",
                                        {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        },
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Security note */}
                        {isBusy && (
                            <div className="flex items-start gap-3 rounded-2xl border border-blue-400/15 bg-blue-400/5 p-4">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />

                                <div>
                                    <p className="text-sm font-semibold text-blue-200">
                                        Please keep this page open
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-gray-400">
                                        Do not refresh, close this page,
                                        or make another payment while
                                        your ticket is being processed.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Pending verification */}
                        {status ===
                            "verification_pending" && (
                                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-5">
                                    <div className="flex items-start gap-3">
                                        <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />

                                        <div>
                                            <p className="font-semibold text-amber-200">
                                                What should you do now?
                                            </p>

                                            <p className="mt-2 text-sm leading-6 text-gray-300">
                                                Please check{" "}
                                                <b>My Bookings</b> after
                                                around 5 minutes. If your
                                                ticket still does not appear,
                                                contact FlyingLyte with this
                                                Transaction ID.
                                            </p>

                                            <p className="mt-3 text-xs font-semibold text-red-300">
                                                Do not make another payment.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* Manual refund */}
                        {status === "ticket_failed" && (
                            <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-300" />

                                    <div>
                                        <p className="font-semibold text-red-200">
                                            Payment received, ticket failed
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-gray-300">
                                            Your payment was successful,
                                            but the ticket could not be
                                            generated. The amount will be
                                            refunded manually to the
                                            original payment method.
                                        </p>

                                        <p className="mt-3 text-xs text-gray-400">
                                            Please keep your Transaction
                                            ID for support reference.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {!isBusy && (
                            <div className="grid gap-3 pt-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/bookings")
                                    }
                                    className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 px-5 py-3 font-bold text-black transition hover:scale-[1.01]"
                                >
                                    View My Bookings

                                    <ArrowRight className="h-4 w-4" />
                                </button>

                                {status === "error" ||
                                    status ===
                                    "payment_failed" ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate("/")
                                        }
                                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-gray-200 transition hover:bg-white/10"
                                    >
                                        Back to Home
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            window.location.reload()
                                        }
                                        disabled={
                                            status ===
                                            "verification_pending" ||
                                            status ===
                                            "ticket_failed"
                                        }
                                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <RefreshCcw className="h-4 w-4" />

                                        Refresh Status
                                    </button>
                                )}
                            </div>
                        )}

                        {ticketData?.booking_id && (
                            <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-xs text-gray-400">
                                Booking ID:{" "}
                                <span className="font-semibold text-white">
                                    {ticketData.booking_id}
                                </span>
                            </div>
                        )}

                        {ticketData?.pnr && (
                            <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-xs text-gray-400">
                                PNR:{" "}
                                <span className="font-semibold text-white">
                                    {ticketData.pnr}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <p className="mt-5 text-center text-xs leading-5 text-gray-600">
                    FlyingLyte secure flight payment and
                    ticket processing
                </p>
            </div>
        </div>
    );
};

export default FlightPaymentSuccess;