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

  const validationInfo =
    preBook?.ValidationInfo ||
    preBook?.validationInfo ||
    preBook?.validation ||
    preBook?.raw?.ValidationInfo ||
    preBook?.raw?.Response?.ValidationInfo ||
    preBook?.raw?.HotelResult?.[0]?.ValidationInfo ||
    preBook?.raw?.Response?.HotelResult?.[0]?.ValidationInfo ||
    roomData?.ValidationInfo ||
    {};

  const bookingCode =
    preBook?.booking_code ||
    preBook?.BookingCode ||
    preBook?.room?.BookingCode ||
    preBook?.room?.booking_code ||
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode;

  const net = Number(
    preBook?.net_amount ??
      preBook?.NetAmount ??
      preBook?.room?.NetAmount ??
      roomData?.NetAmount ??
      0,
  );
  const totalFare = Number(
    payload?.TotalFare ??
      payload?.totalFare ??
      payload?.displayFare ??
      preBook?.TotalFare ??
      preBook?.totalFare ??
      preBook?.displayFare ??
      preBook?.room?.TotalFare ??
      preBook?.room?.totalFare ??
      preBook?.room?.displayFare ??
      roomData?.TotalFare ??
      roomData?.totalFare ??
      roomData?.displayFare ??
      preBook?.room_raw?.TotalFare ??
      preBook?.raw?.HotelResult?.[0]?.Rooms?.[0]?.TotalFare ??
      preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.TotalFare ??
      0,
  );

  const displayFare = totalFare;

  const toBool = (value) =>
    value === true || String(value).toLowerCase() === "true";

  const validation = {
    PanMandatory: toBool(
      validationInfo?.PanMandatory ||
        validationInfo?.PANMandatory ||
        validationInfo?.PANRequired ||
        validationInfo?.IsPANRequired,
    ),

    CorporateBokingAllowed: toBool(
      validationInfo?.CorporateBokingAllowed ||
        validationInfo?.CorporateBookingAllowed ||
        validationInfo?.IsCorporateBookingAllowed,
    ),

    PanCountRequired: Number(validationInfo?.PanCountRequired || 0),

    SamePaxNameAllowed: toBool(validationInfo?.SamePaxNameAllowed),
    SpaceAllowed: toBool(validationInfo?.SpaceAllowed),
    SpecialCharAllowed: toBool(validationInfo?.SpecialCharAllowed),
    CharLimit: toBool(validationInfo?.CharLimit),

    PaxNameMinLength: Number(validationInfo?.PaxNameMinLength || 0),
    PaxNameMaxLength: Number(validationInfo?.PaxNameMaxLength || 0),

    IsPackageFare: toBool(
      validationInfo?.IsPackageFare ||
        validationInfo?.PackageFare ||
        validationInfo?.PackageFare,
    ),

    PackageDetailsMandatory: toBool(
      validationInfo?.IsPackageDetailsMandatory ||
        validationInfo?.PackageDetailsMandatory ||
        validationInfo?.PackageDetailsRequired,
    ),

    DepartureDetailsMandatory: toBool(
      validationInfo?.DepartureDetailsMandatory ||
        validationInfo?.IsDepartureDetailsMandatory ||
        validationInfo?.DepartureDetailsRequired,
    ),

    GSTAllowed: toBool(validationInfo?.GSTAllowed),
  };

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

  const toApiDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
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
          if (typeof item === "string") return item.split(separator);
          return [item];
        })
        .map((item) => (typeof item === "string" ? item.trim() : item))
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

  const flattenDeep = (value) => {
    if (!Array.isArray(value)) return value ? [value] : [];

    return value.flatMap((item) =>
      Array.isArray(item) ? flattenDeep(item) : item ? [item] : [],
    );
  };

  const supplementsRaw =
    preBook?.supplements ||
    preBook?.Supplements ||
    preBook?.room?.Supplements ||
    preBook?.room?.supplements ||
    roomData?.Supplements ||
    roomData?.supplements ||
    roomData?.Supplement ||
    hotelResult?.Supplements ||
    hotelResult?.supplements ||
    [];

  const supplements = Array.isArray(supplementsRaw) ? supplementsRaw : [];

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
      supplement?.Price ??
      supplement?.Amount ??
      supplement?.Charge ??
      supplement?.SupplementPrice ??
      supplement?.SupplementCharge;

    const currency =
      supplement?.Currency ||
      supplement?.currency ||
      preBook?.currency ||
      preBook?.Currency ||
      "";

    if (amount !== undefined && amount !== null && amount !== "") {
      return `${title} - ${currency === "INR" ? "₹" : currency} ${Number(
        amount,
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
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
      return `₹ ${Number(charge).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`;
    }

    return charge ? String(charge) : "-";
  };

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
          PAN: "",
          ParentPAN: "",
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
          PAN: "",
          ParentPAN: "",
        });
      }
    });

    return list;
  }, [normalizedRooms]);

  const [guestList, setGuestList] = useState(initialGuests);
  const [isCorporate, setIsCorporate] = useState(false);
  const [corporatePAN, setCorporatePAN] = useState("");

  const [arrivalTransport, setArrivalTransport] = useState({
    ArrivalTransportType: 0,
    TransportInfoId: "",
    Time: "",
  });

  const [departureTransport, setDepartureTransport] = useState({
    DepartureTransportType: 0,
    TransportInfoId: "",
    Time: "",
  });

  const [gstDetails, setGstDetails] = useState({
    GSTCompanyAddress: "",
    GSTCompanyContactNumber: "",
    GSTCompanyName: "",
    GSTNumber: "",
    GSTCompanyEmail: "",
  });

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

  const cleanNameInput = (value) => {
    if (validation.SpecialCharAllowed && validation.SpaceAllowed) return value;

    if (validation.SpecialCharAllowed && !validation.SpaceAllowed) {
      return value.replace(/\s/g, "");
    }

    if (!validation.SpecialCharAllowed && validation.SpaceAllowed) {
      return value.replace(/[^A-Za-z ]/g, "");
    }

    return value.replace(/[^A-Za-z]/g, "");
  };

  const FIRST_NAME_MIN_LENGTH = 1;
  const FIRST_NAME_MAX_LENGTH = 50;

  const handleFirstNameChange = (index, value) => {
    const cleanedValue = cleanNameInput(value);

    if (cleanedValue.length > FIRST_NAME_MAX_LENGTH) {
      alert("First Name cannot be more than 50 characters.");

      updateGuest(
        index,
        "FirstName",
        cleanedValue.slice(0, FIRST_NAME_MAX_LENGTH),
      );
      return;
    }

    updateGuest(index, "FirstName", cleanedValue);
  };

  const handleFirstNameBlur = (index) => {
    const firstName = String(guestList[index]?.FirstName || "").trim();

    if (firstName.length < FIRST_NAME_MIN_LENGTH) {
      alert("First Name must be at least 1 character.");
    }
  };

  const isValidFirstNameByRules = (name) => {
    const value = String(name || "").trim();

    if (value.length < FIRST_NAME_MIN_LENGTH) return false;
    if (value.length > FIRST_NAME_MAX_LENGTH) return false;

    if (!validation.SpaceAllowed && /\s/.test(value)) return false;

    if (!validation.SpecialCharAllowed && /[^A-Za-z ]/.test(value)) {
      return false;
    }

    return true;
  };

  const normalizeName = (name) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const formatName = (name) =>
    normalizeName(name)
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const isValidPAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  const isValidGST = (gst) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);

  const isValidNameByRules = (name) => {
    const value = String(name || "").trim();

    if (!value) return false;

    if (!validation.SpaceAllowed && /\s/.test(value)) return false;

    if (!validation.SpecialCharAllowed && /[^A-Za-z ]/.test(value)) {
      return false;
    }

    if (validation.CharLimit) {
      if (
        validation.PaxNameMinLength &&
        value.length < validation.PaxNameMinLength
      ) {
        return false;
      }

      if (
        validation.PaxNameMaxLength &&
        value.length > validation.PaxNameMaxLength
      ) {
        return false;
      }
    }

    if (!validation.CharLimit && value.length < 2) return false;

    return true;
  };

  const getUniquePANCount = () => {
    const pans = guestList
      .flatMap((guest) => {
        const passengerPAN = guest.PAN;

        if (isCorporate) {
          return [passengerPAN];
        }

        // Parent / Guardian PAN is valid only for child passenger
        if (guest.PaxType === 2) {
          return [passengerPAN, guest.ParentPAN];
        }

        // Adult should only use own passenger PAN
        return [passengerPAN];
      })
      .map((pan) =>
        String(pan || "")
          .trim()
          .toUpperCase(),
      )
      .filter((pan) => isValidPAN(pan));

    if (isCorporate && isValidPAN(corporatePAN.trim().toUpperCase())) {
      pans.push(corporatePAN.trim().toUpperCase());
    }

    return new Set(pans).size;
  };

  const validateGuests = () => {
    if (!bookingCode) return "Booking code missing";
    if (!net || net <= 0) return "Net amount missing";

    if (isCorporate) {
      if (!validation.CorporateBokingAllowed) {
        return "Corporate booking is not allowed for this hotel";
      }

      if (!isValidPAN(corporatePAN.trim().toUpperCase())) {
        return "Valid Corporate PAN is required for corporate booking";
      }
    }

    if (validation.PanCountRequired > 0) {
      const uniquePANCount = getUniquePANCount();

      if (uniquePANCount < validation.PanCountRequired) {
        return `Minimum ${validation.PanCountRequired} unique PAN number required`;
      }
    }

    if (validation.PackageDetailsMandatory) {
      if (!arrivalTransport.TransportInfoId.trim()) {
        return "Arrival transport number/details required";
      }

      if (!arrivalTransport.Time) {
        return "Arrival transport time required";
      }
    }

    if (validation.DepartureDetailsMandatory) {
      if (!departureTransport.TransportInfoId.trim()) {
        return "Departure transport number/details required";
      }

      if (!departureTransport.Time) {
        return "Departure transport time required";
      }
    }

    if (validation.GSTAllowed && isCorporate) {
      if (!gstDetails.GSTCompanyName.trim()) {
        return "GST company name is required";
      }

      if (!gstDetails.GSTCompanyAddress.trim()) {
        return "GST company address is required";
      }

      if (!/^[0-9]{10}$/.test(gstDetails.GSTCompanyContactNumber)) {
        return "Valid 10-digit GST company contact number required";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gstDetails.GSTCompanyEmail)) {
        return "Valid GST company email required";
      }

      if (!isValidGST(gstDetails.GSTNumber.trim().toUpperCase())) {
        return "Valid GST number is required";
      }
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

    const fullNameMap = new Map();

    for (let i = 0; i < guestList.length; i++) {
      const g = guestList[i];

      const firstName = String(g.FirstName || "").trim();

      if (firstName.length < FIRST_NAME_MIN_LENGTH) {
        return `Guest ${i + 1}: First Name must be at least 1 character`;
      }

      if (firstName.length > FIRST_NAME_MAX_LENGTH) {
        return `Guest ${i + 1}: First Name cannot be more than 50 characters`;
      }

      if (!g.LastName.trim()) {
        return `Guest ${i + 1}: Last name is required`;
      }

      if (!isValidFirstNameByRules(g.FirstName)) {
        return `Guest ${i + 1}: First name does not match hotel validation rules`;
      }

      if (!isValidNameByRules(g.LastName)) {
        return `Guest ${i + 1}: Last name does not match hotel validation rules`;
      }

      const fullName = `${normalizeName(g.FirstName)} ${normalizeName(
        g.LastName,
      )}`;

      if (!validation.SamePaxNameAllowed) {
        if (fullNameMap.has(fullName)) {
          return `Guest ${i + 1}: Same passenger name is not allowed`;
        }

        fullNameMap.set(fullName, true);
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

      if (validation.PanMandatory) {
        const passengerPAN = String(g.PAN || "")
          .trim()
          .toUpperCase();

        const parentPAN = String(g.ParentPAN || "")
          .trim()
          .toUpperCase();

        if (passengerPAN && !isValidPAN(passengerPAN)) {
          return `Guest ${i + 1}: Enter valid passenger PAN`;
        }

        if (parentPAN && !isValidPAN(parentPAN)) {
          return `Guest ${i + 1}: Enter valid parent/guardian PAN`;
        }

        if (isCorporate && !passengerPAN) {
          return `Guest ${i + 1}: Passenger PAN is required for corporate booking`;
        }

        if (isCorporate && parentPAN) {
          return `Guest ${i + 1}: Parent/Guardian PAN is not allowed for corporate booking`;
        }

        if (!isCorporate && g.PaxType === 1 && !passengerPAN) {
          return `Guest ${i + 1}: Adult passenger PAN is required`;
        }

        if (!isCorporate && g.PaxType === 1 && parentPAN) {
          return `Guest ${i + 1}: Parent/Guardian PAN is allowed only for child passenger`;
        }

        if (!isCorporate && g.PaxType === 2 && !passengerPAN && !parentPAN) {
          return `Guest ${i + 1}: Child passenger PAN or Parent/Guardian PAN is required`;
        }
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
      const finalCorporatePAN = corporatePAN.trim().toUpperCase();

      const cleanedGuests = guestList.map((g) => {
        const passenger = {
          RoomIndex: g.RoomIndex,
          Title: g.PaxType === 2 ? "" : g.Title,
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

        if (validation.PanMandatory) {
          const passengerPAN = String(g.PAN || "")
            .trim()
            .toUpperCase();

          const parentPAN = String(g.ParentPAN || "")
            .trim()
            .toUpperCase();

          if (passengerPAN) {
            passenger.PAN = passengerPAN;
          }

          // Parent / Guardian PAN should be sent only for child and non-corporate booking
          if (!isCorporate && g.PaxType === 2 && !passengerPAN && parentPAN) {
            passenger.ParentPAN = parentPAN;
          }
        }

        if (validation.GSTAllowed && isCorporate) {
          passenger.GSTCompanyAddress = gstDetails.GSTCompanyAddress.trim();
          passenger.GSTCompanyContactNumber =
            gstDetails.GSTCompanyContactNumber.trim();
          passenger.GSTCompanyName = gstDetails.GSTCompanyName.trim();
          passenger.GSTNumber = gstDetails.GSTNumber.trim().toUpperCase();
          passenger.GSTCompanyEmail = gstDetails.GSTCompanyEmail.trim();
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

      if (validation.PanMandatory) {
        finalPayload.PANRequired = true;
      }

      if (validation.IsPackageFare) {
        finalPayload.IsPackageFare = true;
      }

      if (validation.PackageDetailsMandatory) {
        finalPayload.ArrivalTransport = {
          ArrivalTransportType: Number(arrivalTransport.ArrivalTransportType),
          TransportInfoId: arrivalTransport.TransportInfoId.trim(),
          Time: toApiDateTime(arrivalTransport.Time),
        };
      }

      if (validation.DepartureDetailsMandatory) {
        finalPayload.DepartureTransport = {
          DepartureTransportType: Number(
            departureTransport.DepartureTransportType,
          ),
          TransportInfoId: departureTransport.TransportInfoId.trim(),
          Time: toApiDateTime(departureTransport.Time),
        };
      }

      if (isCorporate) {
        finalPayload.IsCorporate = true;
        finalPayload.CorporatePAN = finalCorporatePAN;
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
            }: searched age ${searchAges.join(
              ", ",
            )} but booking age ${finalAges.join(", ")}`,
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
        prebookData: preBook,
        checkIn,
        checkOut,
        net,
        TotalFare: totalFare,
        totalFare,
        displayFare: totalFare,
        validation,
        validationInfo,
        isCorporate,
        corporatePAN: finalCorporatePAN,
        gstDetails,
        arrivalTransport,
        departureTransport,
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

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {validation.PanMandatory && (
                <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-red-200">
                  PAN Mandatory
                </span>
              )}

              {validation.IsPackageFare && (
                <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-blue-200">
                  Package Fare
                </span>
              )}

              {validation.PackageDetailsMandatory && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-200">
                  Arrival Details Required
                </span>
              )}

              {validation.DepartureDetailsMandatory && (
                <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-orange-200">
                  Departure Details Required
                </span>
              )}

              {validation.GSTAllowed && (
                <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-green-200">
                  GST Allowed
                </span>
              )}

              {validation.CorporateBokingAllowed && (
                <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-purple-200">
                  Corporate Booking Allowed
                </span>
              )}
            </div>
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
                <div className="rounded-2xl border border-orange-400/20 bg-linear-to-br from-orange-400/10 via-yellow-400/5 to-transparent p-5">
                  <div className="space-y-4">
                    {supplements.map((supplementGroup, groupIndex) => (
                      <div
                        key={groupIndex}
                        className="rounded-2xl border border-orange-400/20 bg-[#0B0B0F]/60 p-4"
                      >
                        <div className="space-y-3">
                          {(Array.isArray(supplementGroup)
                            ? supplementGroup
                            : [supplementGroup]
                          ).map((supplement, index) => (
                            <div
                              key={`${groupIndex}-${index}`}
                              className="rounded-xl border border-white/10 bg-white/5 p-4"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Description
                                  </p>
                                  <h5 className="text-base font-bold text-white">
                                    {supplement?.Description || "Supplement"}
                                  </h5>
                                </div>

                                <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                                  {supplement?.Type || "AtProperty"}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                  <p className="text-xs text-gray-500">Index</p>
                                  <p className="mt-1 font-semibold text-gray-100">
                                    {supplement?.Index ?? index + 1}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                  <p className="text-xs text-gray-500">Type</p>
                                  <p className="mt-1 font-semibold text-purple-200">
                                    {supplement?.Type || "-"}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                  <p className="text-xs text-gray-500">Price</p>
                                  <p className="mt-1 font-semibold text-green-300">
                                    {Number(
                                      supplement?.Price || 0,
                                    ).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                  <p className="text-xs text-gray-500">
                                    Currency
                                  </p>
                                  <p className="mt-1 font-semibold text-yellow-300">
                                    {supplement?.Currency || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300"
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

          {validation.CorporateBokingAllowed && (
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-4 text-yellow-300">Corporate Booking</h3>

              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-sm text-purple-200">
                <input
                  type="checkbox"
                  checked={isCorporate}
                  onChange={(e) => setIsCorporate(e.target.checked)}
                  className="accent-yellow-400"
                />
                Book as corporate customer
              </label>

              {isCorporate && (
                <div className="mt-4">
                  <input
                    placeholder="Corporate PAN"
                    className="input uppercase"
                    value={corporatePAN}
                    maxLength={10}
                    onChange={(e) =>
                      setCorporatePAN(
                        e.target.value
                          .replace(/[^A-Za-z0-9]/g, "")
                          .toUpperCase(),
                      )
                    }
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Corporate PAN must belong to the actual corporate customer.
                    Do not use agency PAN, TBO PAN, or parent/guardian PAN for
                    corporate booking.
                  </p>
                </div>
              )}
            </div>
          )}

          {validation.IsPackageFare && (
            <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
              <h3 className="font-semibold text-blue-200">Package Fare</h3>
              <p className="mt-2 text-sm text-blue-100/80">
                This room is marked as package fare. The book request will send{" "}
                <span className="font-semibold">IsPackageFare: true</span>.
                Transport details are required only when the hotel validation
                asks for them.
              </p>
            </div>
          )}

          {validation.PackageDetailsMandatory && (
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-4 text-yellow-300">
                Arrival Transport Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <select
                  className="input"
                  value={arrivalTransport.ArrivalTransportType}
                  onChange={(e) =>
                    setArrivalTransport((prev) => ({
                      ...prev,
                      ArrivalTransportType: Number(e.target.value),
                    }))
                  }
                >
                  <option value={0}>Flight</option>
                  <option value={1}>Surface</option>
                </select>

                <input
                  placeholder={
                    Number(arrivalTransport.ArrivalTransportType) === 0
                      ? "Flight No. e.g. 6E 203"
                      : "Surface details"
                  }
                  className="input"
                  value={arrivalTransport.TransportInfoId}
                  onChange={(e) =>
                    setArrivalTransport((prev) => ({
                      ...prev,
                      TransportInfoId: e.target.value,
                    }))
                  }
                />

                <input
                  type="datetime-local"
                  className="input"
                  value={arrivalTransport.Time}
                  onChange={(e) =>
                    setArrivalTransport((prev) => ({
                      ...prev,
                      Time: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {validation.DepartureDetailsMandatory && (
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-4 text-yellow-300">
                Departure Transport Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <select
                  className="input"
                  value={departureTransport.DepartureTransportType}
                  onChange={(e) =>
                    setDepartureTransport((prev) => ({
                      ...prev,
                      DepartureTransportType: Number(e.target.value),
                    }))
                  }
                >
                  <option value={0}>Flight</option>
                  <option value={1}>Surface</option>
                </select>

                <input
                  placeholder={
                    Number(departureTransport.DepartureTransportType) === 0
                      ? "Flight No. e.g. AI 221"
                      : "Surface details"
                  }
                  className="input"
                  value={departureTransport.TransportInfoId}
                  onChange={(e) =>
                    setDepartureTransport((prev) => ({
                      ...prev,
                      TransportInfoId: e.target.value,
                    }))
                  }
                />

                <input
                  type="datetime-local"
                  className="input"
                  value={departureTransport.Time}
                  onChange={(e) =>
                    setDepartureTransport((prev) => ({
                      ...prev,
                      Time: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {validation.GSTAllowed && isCorporate && (
            <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
              <h3 className="mb-4 text-yellow-300">GST Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  placeholder="GST Company Name"
                  className="input"
                  value={gstDetails.GSTCompanyName}
                  onChange={(e) =>
                    setGstDetails((prev) => ({
                      ...prev,
                      GSTCompanyName: e.target.value,
                    }))
                  }
                />

                <input
                  placeholder="GST Number"
                  className="input uppercase"
                  value={gstDetails.GSTNumber}
                  maxLength={15}
                  onChange={(e) =>
                    setGstDetails((prev) => ({
                      ...prev,
                      GSTNumber: e.target.value.toUpperCase(),
                    }))
                  }
                />

                <input
                  placeholder="GST Company Email"
                  className="input"
                  value={gstDetails.GSTCompanyEmail}
                  onChange={(e) =>
                    setGstDetails((prev) => ({
                      ...prev,
                      GSTCompanyEmail: e.target.value.trim(),
                    }))
                  }
                />

                <input
                  placeholder="GST Company Contact Number"
                  className="input"
                  value={gstDetails.GSTCompanyContactNumber}
                  maxLength={10}
                  onChange={(e) =>
                    setGstDetails((prev) => ({
                      ...prev,
                      GSTCompanyContactNumber: e.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    }))
                  }
                />

                <input
                  placeholder="GST Company Address"
                  className="input sm:col-span-2"
                  value={gstDetails.GSTCompanyAddress}
                  onChange={(e) =>
                    setGstDetails((prev) => ({
                      ...prev,
                      GSTCompanyAddress: e.target.value,
                    }))
                  }
                />
              </div>
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
                {guest.PaxType === 1 ? (
                  <select
                    className="input title-select"
                    value={guest.Title || "Mr"}
                    onChange={(e) =>
                      updateGuest(index, "Title", e.target.value)
                    }
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Miss">Miss</option>
                  </select>
                ) : (
                  <div className="hidden sm:block" />
                )}

                <input
                  placeholder="First Name"
                  className="input"
                  value={guest.FirstName}
                  minLength={FIRST_NAME_MIN_LENGTH}
                  onBlur={() => handleFirstNameBlur(index)}
                  onChange={(e) => handleFirstNameChange(index, e.target.value)}
                />

                <input
                  placeholder="Last Name"
                  className="input"
                  value={guest.LastName}
                  maxLength={
                    validation.CharLimit && validation.PaxNameMaxLength
                      ? validation.PaxNameMaxLength
                      : 50
                  }
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

                {validation.PanMandatory && (
                  <>
                    <input
                      placeholder={
                        guest.PaxType === 1
                          ? "Adult Passenger PAN required"
                          : isCorporate
                            ? "Child Passenger PAN required"
                            : "Child Passenger PAN"
                      }
                      className="input uppercase"
                      value={guest.PAN}
                      maxLength={10}
                      onChange={(e) =>
                        updateGuest(
                          index,
                          "PAN",
                          e.target.value
                            .replace(/[^A-Za-z0-9]/g, "")
                            .toUpperCase(),
                        )
                      }
                    />

                    {!isCorporate && guest.PaxType === 2 && (
                      <input
                        placeholder="Parent / Guardian PAN for child"
                        className="input uppercase"
                        value={guest.ParentPAN}
                        maxLength={10}
                        onChange={(e) =>
                          updateGuest(
                            index,
                            "ParentPAN",
                            e.target.value
                              .replace(/[^A-Za-z0-9]/g, "")
                              .toUpperCase(),
                          )
                        }
                      />
                    )}
                  </>
                )}

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

              {validation.PanMandatory && (
                <p className="mt-3 text-xs text-gray-500">
                  {isCorporate
                    ? "For corporate booking, passenger PAN is required for each guest. Parent/Guardian PAN is not allowed."
                    : guest.PaxType === 2
                      ? "For child passengers, you can provide either child PAN or Parent/Guardian PAN."
                      : "For adult passengers, only the passenger's own PAN is allowed."}
                </p>
              )}
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
                  (Inclusive of all taxes )
                </p>
              </span>

              <span>
                ₹{" "}
                {totalFare.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
              </span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-yellow-400">
                ₹{" "}
                {totalFare.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs text-gray-300">
            <p className="font-semibold text-yellow-300">
              Important Requirements
            </p>

            <ul className="mt-3 space-y-2">
              <li className="flex gap-2">
                <span
                  className={
                    validation.PanMandatory
                      ? "text-yellow-300"
                      : "text-gray-500"
                  }
                >
                  •
                </span>
                <span>
                  {validation.PanMandatory
                    ? `PAN details are required for this booking${
                        validation.PanCountRequired > 0
                          ? ` (${validation.PanCountRequired} )`
                          : ""
                      }.`
                    : "PAN details are not required for this booking."}
                </span>
              </li>

              <li className="flex gap-2">
                <span
                  className={
                    validation.CorporateBokingAllowed
                      ? "text-yellow-300"
                      : "text-red-300"
                  }
                >
                  •
                </span>
                <span>
                  {validation.CorporateBokingAllowed
                    ? "Corporate booking is allowed for this hotel."
                    : "Corporate booking is not allowed for this hotel."}
                </span>
              </li>

              <li className="flex gap-2">
                <span
                  className={
                    validation.IsPackageFare
                      ? "text-yellow-300"
                      : "text-gray-500"
                  }
                >
                  •
                </span>
                <span>
                  {validation.IsPackageFare
                    ? "This room has package fare pricing."
                    : "This room does not have package fare pricing."}
                </span>
              </li>
            </ul>
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
          
          .title-select {
  appearance: auto;
  -webkit-appearance: auto;
  color: #ffffff;
  background-color: #0b0b0f;
}

.title-select option {
  background: #111118;
  color: #ffffff;
}
      `}</style>
    </div>
  );
};

export default HotelBooking;
