"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useHotelStore } from "../../../store/hotelStore";

const HotelBooking = () => {
  const { setGuestDetails } = useHotelStore();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const payload = state?.payload || state;

  const { hotel, preBook, checkIn, checkOut, guests } = payload;

  const roomData =
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    preBook?.room ||
    {};

  const hotelResult =
    preBook?.raw?.HotelResult?.[0] ||
    preBook?.raw?.Response?.HotelResult?.[0] ||
    {};

  const validation = preBook?.validation || {};

  const bookingCode =
    preBook?.booking_code ||
    preBook?.BookingCode ||
    preBook?.room?.BookingCode ||
    preBook?.room?.booking_code ||
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode;

  const net = Number(preBook?.net_amount || preBook?.NetAmount || 0);

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

  const addDays = (date, days) => {
    if (!date) return null;

    const updatedDate = new Date(date);
    updatedDate.setDate(updatedDate.getDate() + days);
    return updatedDate;
  };

  const normalizeList = (value, separator = ",") => {
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => {
          if (item === null || item === undefined) return [];

          if (typeof item === "string") {
            return item.split(separator);
          }

          return [item];
        })
        .map((item) => {
          if (typeof item === "string") return item.trim();
          return item;
        })
        .filter(Boolean);
    }

    return String(value || "")
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const cancellationPoliciesRaw =
    roomData?.CancelPolicies ||
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0]?.CancelPolicies ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.CancelPolicies ||
    [];

  const cancellationPolicies = Array.isArray(cancellationPoliciesRaw)
    ? cancellationPoliciesRaw
    : [];

  const getPolicyBeforeDate = (policy, index) => {
    if (
      policy?.ToDate ||
      policy?.To ||
      policy?.CancelledOnOrBefore ||
      policy?.CancelTillDate
    ) {
      return (
        policy?.ToDate ||
        policy?.To ||
        policy?.CancelledOnOrBefore ||
        policy?.CancelTillDate
      );
    }

    const nextPolicy = cancellationPolicies[index + 1];

    if (nextPolicy?.FromDate) {
      const nextFromDate = parseDateValue(nextPolicy.FromDate);
      const previousDate = addDays(nextFromDate, -1);

      if (previousDate) return previousDate;
    }

    return checkOut || policy?.FromDate;
  };

  const roomPromotionsRaw =
    preBook?.room_promotions ||
    preBook?.RoomPromotion ||
    preBook?.room?.RoomPromotion ||
    roomData?.RoomPromotion ||
    roomData?.RoomPromotions ||
    hotelResult?.RoomPromotion ||
    [];

  const roomPromotions = normalizeList(roomPromotionsRaw);

  const supplementsRaw =
    preBook?.supplements ||
    preBook?.Supplements ||
    preBook?.room?.Supplements ||
    roomData?.Supplements ||
    roomData?.Supplement ||
    hotelResult?.Supplements ||
    [];

  const supplements = Array.isArray(supplementsRaw)
    ? supplementsRaw.filter(Boolean)
    : normalizeList(supplementsRaw);

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

    const currency =
      supplement?.Currency ||
      supplement?.currency ||
      preBook?.currency ||
      preBook?.Currency ||
      "INR";

    if (amount !== undefined && amount !== null && amount !== "") {
      return `${title} - ${currency === "INR" ? "₹" : currency} ${Math.round(
        Number(amount),
      )}`;
    }

    return title;
  };

  const roomAmenitiesRaw =
    roomData?.Amenities ||
    roomData?.RoomAmenities ||
    hotelResult?.Amenities ||
    hotel?.amenities ||
    hotel?.Amenities ||
    [];

  const roomAmenities = normalizeList(roomAmenitiesRaw);

  const rateConditions =
    preBook?.rate_conditions?.length > 0
      ? preBook.rate_conditions
      : preBook?.raw?.HotelResult?.[0]?.RateConditions ||
        preBook?.raw?.Response?.HotelResult?.[0]?.RateConditions ||
        [];

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

  const isPANRequired =
    Boolean(validation?.PANRequired) ||
    Boolean(validation?.IsPANRequired) ||
    Boolean(preBook?.PANRequired) ||
    Boolean(preBook?.raw?.PANRequired) ||
    Boolean(roomData?.PANRequired) ||
    Boolean(hotel?.isInternational) ||
    Boolean(hotel?.IsInternational) ||
    Boolean(hotel?.is_international);

  const normalizeAgeArray = (ages = [], children = 0) => {
    const list = Array.isArray(ages) ? ages : [];

    return Array.from({ length: Number(children) || 0 }, (_, index) => {
      const age = Number(list[index]);
      return age >= 1 && age <= 12 ? age : "";
    });
  };

  const normalizedRooms = useMemo(() => {
    const roomGuests =
      preBook?.roomGuests ||
      preBook?.RoomGuests ||
      preBook?.Guests?.roomGuests ||
      preBook?.Guests?.RoomGuests ||
      payload?.roomGuests ||
      payload?.RoomGuests ||
      payload?.guests?.roomGuests ||
      payload?.guests?.RoomGuests ||
      guests?.roomGuests ||
      guests?.RoomGuests ||
      [];

    if (Array.isArray(roomGuests) && roomGuests.length > 0) {
      return roomGuests.map((room) => {
        const children = Number(room.Children ?? room.children ?? 0);

        const ages =
          room.ChildrenAges ||
          room.ChildAges ||
          room.childAges ||
          room.childrenAges ||
          [];

        return {
          Adults: Number(room.Adults ?? room.adults ?? 1),
          Children: children,
          ChildrenAges: normalizeAgeArray(ages, children),
        };
      });
    }

    const paxRooms =
      preBook?.PaxRooms ||
      preBook?.Guests?.PaxRooms ||
      payload?.PaxRooms ||
      payload?.guests?.PaxRooms ||
      guests?.PaxRooms ||
      [];

    if (Array.isArray(paxRooms) && paxRooms.length > 0) {
      return paxRooms.map((room) => {
        const children = Number(room.Children ?? room.children ?? 0);

        return {
          Adults: Number(room.Adults ?? room.adults ?? 1),
          Children: children,
          ChildrenAges: normalizeAgeArray(
            room.ChildrenAges || room.ChildAges || room.childAges || [],
            children,
          ),
        };
      });
    }

    const children = Number(guests?.children || guests?.Children || 0);

    return [
      {
        Adults: Number(guests?.adults || guests?.Adults || 1),
        Children: children,
        ChildrenAges: normalizeAgeArray(
          payload?.childAges ||
            preBook?.childAges ||
            guests?.childAges ||
            guests?.ChildrenAges ||
            [],
          children,
        ),
      },
    ];
  }, [guests, preBook, payload]);

  const initialGuests = useMemo(() => {
    const list = [];

    normalizedRooms.forEach((room, roomIndex) => {
      for (let i = 0; i < room.Adults; i++) {
        list.push({
          RoomIndex: roomIndex,
          Title: i === 1 ? "Mrs" : "Mr",
          FirstName: "",
          MiddleName: "",
          LastName: "",
          Email: "",
          Phoneno: "",
          PaxType: 1,
          LeadPassenger: i === 0,
          Age: "",
        });
      }

      for (let i = 0; i < room.Children; i++) {
        list.push({
          RoomIndex: roomIndex,
          Title: "Mstr",
          FirstName: "",
          MiddleName: "",
          LastName: "",
          Email: "",
          Phoneno: "",
          PaxType: 2,
          LeadPassenger: false,
          Age: room.ChildrenAges?.[i] ? String(room.ChildrenAges[i]) : "",
        });
      }
    });

    return list;
  }, [normalizedRooms]);

  const [guestList, setGuestList] = useState(initialGuests);
  const [corporatePAN, setCorporatePAN] = useState("");

  if (!preBook) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] p-10 text-center text-white">
        <h2 className="mb-4 text-xl text-red-400">⚠️ Session Expired</h2>

        <button
          onClick={() => navigate("/")}
          className="rounded-lg bg-yellow-400 px-5 py-2 text-black"
        >
          Go Home
        </button>
      </div>
    );
  }

  const updateGuest = (index, field, value) => {
    setGuestList((prev) =>
      prev.map((guest, guestIndex) =>
        guestIndex === index ? { ...guest, [field]: value } : guest,
      ),
    );
  };

  const updateLeadPassenger = (selectedIndex) => {
    const selectedGuest = guestList[selectedIndex];

    if (selectedGuest.PaxType !== 1) {
      alert("Only adult passenger can be selected as room lead");
      return;
    }

    setGuestList((prev) =>
      prev.map((guest, index) => {
        if (guest.RoomIndex !== selectedGuest.RoomIndex) return guest;

        return {
          ...guest,
          LeadPassenger: index === selectedIndex,
        };
      }),
    );
  };

  const getRoomGuestNumber = (currentIndex) => {
    const currentGuest = guestList[currentIndex];

    return (
      guestList
        .slice(0, currentIndex + 1)
        .filter((guest) => guest.RoomIndex === currentGuest.RoomIndex).length ||
      1
    );
  };

  const cleanNameInput = (value) => value.replace(/[^A-Za-z ]/g, "");

  const normalizeName = (name) =>
    name.trim().toLowerCase().replace(/\s+/g, " ");

  const formatName = (name) =>
    normalizeName(name)
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const isValidName = (name) => /^[A-Za-z ]{3,}$/.test(name.trim());

  const isDuplicateFirstName = (currentIndex, firstName) => {
    const current = normalizeName(firstName);

    if (!current) return false;

    return guestList.some(
      (guest, index) =>
        index !== currentIndex && normalizeName(guest.FirstName) === current,
    );
  };

  const isValidPAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  const validateGuests = () => {
    if (!bookingCode) return "Booking code missing";
    if (!net || net <= 0) return "Net amount missing";

    if (isPANRequired && !isValidPAN(corporatePAN.trim().toUpperCase())) {
      return "Valid PAN number is required";
    }

    for (let roomIndex = 0; roomIndex < normalizedRooms.length; roomIndex++) {
      const roomPassengers = guestList.filter(
        (guest) => guest.RoomIndex === roomIndex,
      );

      const roomLeads = roomPassengers.filter((guest) => guest.LeadPassenger);

      if (roomLeads.length !== 1) {
        return `Room ${roomIndex + 1}: Please select exactly one lead passenger`;
      }

      if (roomLeads[0]?.PaxType !== 1) {
        return `Room ${roomIndex + 1}: Lead passenger must be an adult`;
      }
    }

    for (let i = 0; i < guestList.length; i++) {
      const g = guestList[i];

      if (!g.FirstName.trim() || !g.LastName.trim()) {
        return `Guest ${i + 1}: First name and last name are required`;
      }

      if (!isValidName(g.FirstName)) {
        return `Guest ${i + 1}: First name must contain only alphabets and minimum 3 characters`;
      }

      if (!isValidName(g.LastName)) {
        return `Guest ${i + 1}: Last name must contain only alphabets and minimum 3 characters`;
      }

      if (isDuplicateFirstName(i, g.FirstName)) {
        return `Guest ${i + 1}: Same first name is not allowed for multiple guests`;
      }

      if (!g.Age) {
        return `Guest ${i + 1}: Age is required`;
      }

      const age = Number(g.Age);

      if (Number.isNaN(age) || age <= 0) {
        return `Guest ${i + 1}: Enter valid age`;
      }

      if (g.PaxType === 1 && age < 12) {
        return `Guest ${i + 1}: Adult age must be 12 or above`;
      }

      if (g.PaxType === 2 && (age < 1 || age > 12)) {
        return `Guest ${i + 1}: Child age must be between 1 and 12`;
      }

      if (g.LeadPassenger) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.Email.trim())) {
          return `Room ${g.RoomIndex + 1}: Valid lead passenger email required`;
        }

        if (!/^[0-9]{10}$/.test(g.Phoneno)) {
          return `Room ${g.RoomIndex + 1}: Valid 10-digit lead passenger phone required`;
        }
      }

      if (
        validation?.PaxNameMinLength &&
        g.FirstName.trim().length < validation.PaxNameMinLength
      ) {
        return `Guest ${i + 1}: Name too short`;
      }

      if (
        validation?.PaxNameMaxLength &&
        g.FirstName.trim().length > validation.PaxNameMaxLength
      ) {
        return `Guest ${i + 1}: Name too long`;
      }
    }

    return null;
  };

  const buildRoomPayloads = (cleanedGuests) => {
    const rooms = normalizedRooms.map((_, roomIndex) => {
      const roomPassengers = cleanedGuests.filter(
        (guest) => guest.RoomIndex === roomIndex,
      );

      const adults = roomPassengers.filter((guest) => guest.PaxType === 1);
      const children = roomPassengers.filter((guest) => guest.PaxType === 2);

      return {
        HotelRoomDetail: {
          HotelPassenger: roomPassengers.map(
            ({ RoomIndex, ...guest }) => guest,
          ),
        },
        PaxRoom: {
          Adults: adults.length,
          Children: children.length,
          ChildrenAges: children.map((child) => Number(child.Age)),
        },
      };
    });

    return {
      HotelRoomsDetails: rooms.map((room) => room.HotelRoomDetail),
      PaxRooms: rooms.map((room) => room.PaxRoom),
    };
  };

  const handleReviewBooking = () => {
    const error = validateGuests();
    if (error) return alert(error);

    try {
      const finalPAN = corporatePAN.trim().toUpperCase();

      const cleanedGuests = guestList.map((g) => {
        const passenger = {
          RoomIndex: g.RoomIndex,
          Title: g.PaxType === 2 ? "Mstr" : g.Title,
          FirstName: formatName(g.FirstName),
          MiddleName: "",
          LastName: formatName(g.LastName),
          PaxType: g.PaxType,
          Age: Number(g.Age),
          LeadPassenger: Boolean(g.LeadPassenger),
        };

        if (g.LeadPassenger) {
          passenger.Email = g.Email.trim();
          passenger.Phoneno = g.Phoneno.trim();
        }

        if (isPANRequired) {
          passenger.PAN = finalPAN;
        }

        return passenger;
      });

      const { HotelRoomsDetails, PaxRooms } = buildRoomPayloads(cleanedGuests);

      const finalPayload = {
        BookingCode: bookingCode,
        GuestNationality:
          payload?.GuestNationality ||
          payload?.guestNationality ||
          preBook?.GuestNationality ||
          guests?.nationality ||
          "IN",
        IsVoucherBooking: true,
        NetAmount: net,
        PreBookNetAmount: net,
        HotelRoomsDetails,
        PaxRooms,
      };

      if (isPANRequired) {
        finalPayload.PANRequired = true;
        finalPayload.CorporateBooking = true;
        finalPayload.CorporatePAN = finalPAN;
      }

      const searchedRooms =
        preBook?.roomGuests ||
        preBook?.RoomGuests ||
        preBook?.Guests?.roomGuests ||
        preBook?.Guests?.RoomGuests ||
        payload?.roomGuests ||
        payload?.RoomGuests ||
        payload?.guests?.roomGuests ||
        payload?.guests?.RoomGuests ||
        guests?.roomGuests ||
        guests?.RoomGuests ||
        [];

      searchedRooms.forEach((room, index) => {
        const searchAges =
          room.ChildrenAges ||
          room.ChildAges ||
          room.childAges ||
          room.childrenAges ||
          [];

        const finalAges = PaxRooms[index]?.ChildrenAges || [];

        if (
          JSON.stringify(searchAges.map(Number)) !==
          JSON.stringify(finalAges.map(Number))
        ) {
          throw new Error(
            `Child age mismatch before booking. Room ${
              index + 1
            }: searched age ${searchAges.join(", ")} but booking age ${finalAges.join(
              ", ",
            )}`,
          );
        }
      });

      const guestsForStorage = cleanedGuests.map(
        ({ RoomIndex, ...guest }) => guest,
      );

      const reviewBookingData = {
        finalPayload,
        guestList: guestsForStorage,
        bookingCode,
        hotel,
        roomData,
        hotelResult,
        checkIn,
        checkOut,
        net,
        isPANRequired,
        corporatePAN: finalPAN,
        cancellationPolicies,
        roomPromotions,
        supplements,
        roomAmenities,
        rateConditions,
      };

      localStorage.setItem(
        "reviewBookingData",
        JSON.stringify(reviewBookingData),
      );

      setGuestDetails(guestsForStorage);

      navigate("/hotel-review-booking", {
        state: reviewBookingData,
      });
    } catch (err) {
      alert(err?.message || "Unable to prepare review booking");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] px-4 py-24 text-white md:px-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
            <h2 className="text-2xl font-bold text-yellow-400">
              {hotel?.hotel_name || hotel?.HotelName || "Hotel Booking"}
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              📅 {formatDate(checkIn)} → {formatDate(checkOut)}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              🛏{" "}
              {Array.isArray(roomData?.Name)
                ? roomData?.Name?.[0]
                : roomData?.Name || "Standard Room"}
            </p>

            <p className="mt-3 text-xs text-gray-500">
              {isPANRequired
                ? "International / PAN required booking"
                : "Domestic booking"}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
            <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
              <span className="text-yellow-300">🕒</span>
              <h3 className="font-semibold text-yellow-300">
                Cancellation Charges
              </h3>
            </div>

            <div className="p-5">
              {cancellationPolicies.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#202432] text-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">
                            Cancelled on or After
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Cancelled on or Before
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Cancellation Charges
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-800">
                        {cancellationPolicies.map((policy, index) => (
                          <tr key={index} className="text-gray-300">
                            <td className="px-4 py-3">
                              {formatDate(policy?.FromDate)}
                            </td>

                            <td className="px-4 py-3">
                              {formatDate(getPolicyBeforeDate(policy, index))}
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

                  <p className="mt-4 text-sm text-gray-400">
                    <span className="font-semibold text-red-400">Note:</span>{" "}
                    Early check out may attract full cancellation charges unless
                    otherwise specified.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">
                  Cancellation policy is not available for this room.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
            <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
              <span className="text-yellow-300">🏷️</span>
              <h3 className="font-semibold text-yellow-300">Room Promotions</h3>
            </div>

            <div className="p-5">
              {roomPromotions.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-400">
                  Room promotions are not available.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
            <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
              <span className="text-yellow-300">➕</span>
              <h3 className="font-semibold text-yellow-300">Supplements</h3>
            </div>

            <div className="p-5">
              {supplements.length > 0 ? (
                <div className="space-y-3">
                  {supplements.map((supplement, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-100"
                    >
                      <div className="font-semibold">
                        {formatSupplementText(supplement)}
                      </div>

                      {typeof supplement === "object" &&
                        supplement?.IsMandatory !== undefined && (
                          <p className="mt-1 text-xs text-orange-200/80">
                            {supplement.IsMandatory
                              ? "Mandatory supplement"
                              : "Optional supplement"}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No supplements or extra charges are available for this room.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
            <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
              <span className="text-yellow-300">🛏️</span>
              <h3 className="font-semibold text-yellow-300">Room Amenities</h3>
            </div>

            <div className="p-5">
              {roomAmenities.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-[120px_1fr]">
                    <div className="bg-[#202432] px-4 py-3 font-semibold text-gray-300 md:border-r md:border-gray-800">
                      Room
                    </div>

                    <div className="bg-[#202432] px-4 py-3 font-semibold text-gray-300">
                      Amenities
                    </div>

                    <div className="border-t border-gray-800 px-4 py-4 font-semibold text-white md:border-r">
                      Room 1
                    </div>

                    <div className="border-t border-gray-800 px-4 py-4">
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
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Room amenities are not available.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
            <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
              <span className="text-yellow-300">📋</span>
              <h3 className="font-semibold text-yellow-300">Rate Condition</h3>
            </div>

            <div className="p-5">
              {rateConditions.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-400">
                  Rate conditions are not available.
                </p>
              )}
            </div>
          </div>

          {isPANRequired && (
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-4 text-yellow-300">PAN Details</h3>

              <input
                placeholder="Enter Corporate PAN"
                className="input uppercase"
                value={corporatePAN}
                maxLength={10}
                onChange={(e) =>
                  setCorporatePAN(
                    e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
                  )
                }
              />

              <p className="mt-2 text-xs text-gray-500">
                This PAN will be sent as CorporatePAN and passenger PAN.
              </p>
            </div>
          )}

          {guestList.map((guest, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-800 bg-[#15151C] p-6"
            >
              <h3 className="mb-4 text-yellow-300">
                Room {guest.RoomIndex + 1} - Guest {getRoomGuestNumber(index)}{" "}
                {guest.LeadPassenger && "(Lead)"}{" "}
                <span className="text-sm text-gray-500">
                  {guest.PaxType === 1 ? "Adult" : "Child"}
                </span>
              </h3>

              {guest.PaxType === 1 && (
                <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-200">
                  <input
                    type="radio"
                    name={`room-lead-${guest.RoomIndex}`}
                    checked={guest.LeadPassenger}
                    onChange={() => updateLeadPassenger(index)}
                    className="accent-yellow-400"
                  />
                  Lead passenger for Room {guest.RoomIndex + 1}
                </label>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <select
                  className="input"
                  value={guest.Title}
                  disabled={guest.PaxType === 2}
                  onChange={(e) => updateGuest(index, "Title", e.target.value)}
                >
                  {guest.PaxType === 1 ? (
                    <>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                    </>
                  ) : (
                    <option value="Mstr">Mstr</option>
                  )}
                </select>

                <input
                  placeholder="First Name"
                  className="input"
                  value={guest.FirstName}
                  maxLength={30}
                  onChange={(e) =>
                    updateGuest(
                      index,
                      "FirstName",
                      cleanNameInput(e.target.value),
                    )
                  }
                />

                <input
                  placeholder="Last Name"
                  className="input"
                  value={guest.LastName}
                  maxLength={30}
                  onChange={(e) =>
                    updateGuest(
                      index,
                      "LastName",
                      cleanNameInput(e.target.value),
                    )
                  }
                />

                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    {guest.PaxType === 1 ? "Adult Age" : "Child Age"}
                  </label>

                  <input
                    type="number"
                    min={guest.PaxType === 1 ? 12 : 1}
                    max={guest.PaxType === 1 ? 120 : 12}
                    placeholder={
                      guest.PaxType === 1
                        ? "Enter adult age"
                        : "Child age from search"
                    }
                    className="input"
                    value={guest.Age}
                    disabled={guest.PaxType === 2}
                    onChange={(e) => updateGuest(index, "Age", e.target.value)}
                  />
                </div>

                {guest.LeadPassenger && (
                  <>
                    <input
                      placeholder={`Lead Email - Room ${guest.RoomIndex + 1}`}
                      className="input"
                      value={guest.Email}
                      onChange={(e) =>
                        updateGuest(index, "Email", e.target.value.trim())
                      }
                    />

                    <input
                      placeholder={`Lead Phone - Room ${guest.RoomIndex + 1}`}
                      className="input"
                      value={guest.Phoneno}
                      maxLength={10}
                      onChange={(e) =>
                        updateGuest(
                          index,
                          "Phoneno",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky top-24 h-fit rounded-2xl border border-gray-800 bg-[#15151C] p-6">
          <h3 className="mb-4 text-lg text-yellow-300">Price Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Total Amount{" "}
                <p className="text-xs text-gray-200">
                  (Inclusive of all taxes)
                </p>
              </span>

              <span>₹ {Math.round(net)}</span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-yellow-400">₹ {Math.round(net)}</span>
            </div>
          </div>

          <button
            onClick={handleReviewBooking}
            className="mt-6 w-full rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 py-3 font-semibold text-black"
          >
            Review Booking
          </button>
        </div>
      </div>

      <style>{`
        .input {
          background: #0b0b0f;
          border: 1px solid #2a2a2f;
          padding: 12px;
          border-radius: 10px;
          width: 100%;
          color: white;
          outline: none;
        }

        .input:focus {
          border-color: #facc15;
        }

        .input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default HotelBooking;
