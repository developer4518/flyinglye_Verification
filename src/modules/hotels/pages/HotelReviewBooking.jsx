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

const pickFirstValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "n/a",
  );
};

const toBoolean = (value) => {
  if (value === true || value === 1) return true;

  const text = String(value || "")
    .trim()
    .toLowerCase();

  return text === "true" || text === "1" || text === "yes";
};

const normalizeDateTimeForApi = (value) => {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    return `${text}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  const pad = (num) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};

const getDateTimeLocalDefault = (dateValue, fallbackTime = "12:00") => {
  if (!dateValue) return "";

  const datePart = String(dateValue).split(" ")[0].split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return `${datePart}T${fallbackTime}`;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${fallbackTime}`;
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

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getBlockValidationFromReviewData = (data = {}) => {
  const sources = [
    data?.validation,
    data?.validationInfo,
    data?.ValidationInfo,

    data?.prebookData?.validation,
    data?.prebookData?.validationInfo,
    data?.prebookData?.ValidationInfo,

    data?.prebookData?.raw?.validation,
    data?.prebookData?.raw?.validationInfo,
    data?.prebookData?.raw?.ValidationInfo,

    data?.prebookData?.raw?.Response?.validation,
    data?.prebookData?.raw?.Response?.validationInfo,
    data?.prebookData?.raw?.Response?.ValidationInfo,

    data?.prebookData?.raw?.HotelResult?.[0]?.validation,
    data?.prebookData?.raw?.HotelResult?.[0]?.validationInfo,
    data?.prebookData?.raw?.HotelResult?.[0]?.ValidationInfo,

    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.validation,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.validationInfo,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.ValidationInfo,

    data?.hotelResult?.validation,
    data?.hotelResult?.validationInfo,
    data?.hotelResult?.ValidationInfo,

    data?.roomData?.validation,
    data?.roomData?.validationInfo,
    data?.roomData?.ValidationInfo,

    data?.finalPayload,
  ];

  return sources.find((item) => item && typeof item === "object") || {};
};

const getPackageFareFlags = (data = {}) => {
  const validation = getBlockValidationFromReviewData(data);

  const isPackageFare = toBoolean(
    pickFirstValue(
      validation?.IsPackageFare,
      validation?.isPackageFare,
      data?.IsPackageFare,
      data?.isPackageFare,
      data?.finalPayload?.IsPackageFare,
    ),
  );

  const isPackageDetailsMandatory = toBoolean(
    pickFirstValue(
      validation?.IsPackageDetailsMandatory,
      validation?.isPackageDetailsMandatory,
      data?.IsPackageDetailsMandatory,
      data?.isPackageDetailsMandatory,
      data?.finalPayload?.IsPackageDetailsMandatory,
    ),
  );

  const isDepartureDetailsMandatory = toBoolean(
    pickFirstValue(
      validation?.DepartureDetailsMandatory,
      validation?.departureDetailsMandatory,
      validation?.IsDepartureDetailsMandatory,
      validation?.isDepartureDetailsMandatory,
      data?.DepartureDetailsMandatory,
      data?.departureDetailsMandatory,
      data?.finalPayload?.DepartureDetailsMandatory,
    ),
  );

  return {
    isPackageFare: isPackageFare || isPackageDetailsMandatory,
    isPackageDetailsMandatory,
    isDepartureDetailsMandatory,
  };
};

const GST_FIELDS = [
  "GSTCompanyAddress",
  "GSTCompanyContactNumber",
  "GSTCompanyName",
  "GSTNumber",
  "GSTCompanyEmail",
];

const emptyGSTDetails = {
  GSTCompanyAddress: "",
  GSTCompanyContactNumber: "",
  GSTCompanyName: "",
  GSTNumber: "",
  GSTCompanyEmail: "",
};

const getGSTAllowed = (data = {}) => {
  const validation = getBlockValidationFromReviewData(data);

  return toBoolean(
    pickFirstValue(
      validation?.GSTAllowed,
      validation?.gstAllowed,
      validation?.IsGSTAllowed,
      validation?.isGSTAllowed,

      data?.GSTAllowed,
      data?.gstAllowed,
      data?.IsGSTAllowed,
      data?.isGSTAllowed,

      data?.roomData?.GSTAllowed,
      data?.roomData?.gstAllowed,
      data?.roomData?.IsGSTAllowed,

      data?.hotelResult?.GSTAllowed,
      data?.hotelResult?.gstAllowed,

      data?.prebookData?.GSTAllowed,
      data?.prebookData?.gstAllowed,

      data?.prebookData?.raw?.GSTAllowed,
      data?.prebookData?.raw?.Response?.GSTAllowed,

      data?.prebookData?.raw?.HotelResult?.[0]?.GSTAllowed,
      data?.prebookData?.raw?.Response?.HotelResult?.[0]?.GSTAllowed,

      data?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.GSTAllowed,
      data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]
        ?.GSTAllowed,

      data?.finalPayload?.GSTAllowed,
    ),
  );
};

const hasAnyGSTValue = (gst = {}) => {
  return GST_FIELDS.some((field) => String(gst?.[field] || "").trim() !== "");
};

const hasAllGSTValues = (gst = {}) => {
  return GST_FIELDS.every((field) => String(gst?.[field] || "").trim() !== "");
};

const cleanGSTDetails = (gst = {}) => {
  return {
    GSTCompanyAddress: String(gst.GSTCompanyAddress || "").trim(),
    GSTCompanyContactNumber: String(gst.GSTCompanyContactNumber || "").trim(),
    GSTCompanyName: String(gst.GSTCompanyName || "").trim(),
    GSTNumber: String(gst.GSTNumber || "")
      .trim()
      .toUpperCase(),
    GSTCompanyEmail: String(gst.GSTCompanyEmail || "").trim(),
  };
};

const addGSTToPassenger = (passenger = {}, gst = {}, gstAllowed = false) => {
  if (!gstAllowed) return passenger;

  const cleanedGST = cleanGSTDetails(gst);

  if (!hasAnyGSTValue(cleanedGST)) return passenger;

  return {
    ...passenger,
    ...cleanedGST,
  };
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

const normalizeTextList = (value) => {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(/,|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .flatMap((item) => normalizeTextList(item))
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const text = pickFirst(
      value?.Description,
      value?.Name,
      value?.FacilityName,
      value?.Facility,
      value?.HotelFacility,
      value?.Amenity,
      value?.Text,
      value?.Value,
      value?.Title,
    );

    if (text) return normalizeTextList(text);

    return Object.values(value)
      .flatMap((item) => normalizeTextList(item))
      .filter(Boolean);
  }

  return [];
};

const findDeepArrayByKeys = (obj, keywords = [], maxDepth = 7) => {
  const visited = new WeakSet();

  const search = (value, depth = 0) => {
    if (!value || depth > maxDepth) return [];
    if (typeof value !== "object") return [];

    if (visited.has(value)) return [];
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = search(item, depth + 1);
        if (found.length > 0) return found;
      }
      return [];
    }

    for (const [key, val] of Object.entries(value)) {
      const keyLower = String(key).toLowerCase();

      const isMatchingKey = keywords.some((keyword) =>
        keyLower.includes(keyword.toLowerCase()),
      );

      if (isMatchingKey) {
        const normalized = normalizeTextList(val);
        if (normalized.length > 0) return normalized;
      }
    }

    for (const val of Object.values(value)) {
      const found = search(val, depth + 1);
      if (found.length > 0) return found;
    }

    return [];
  };

  return search(obj);
};

const getHotelFacilitiesFromReviewData = (data = {}) => {
  const directFacilities = normalizeTextList(
    data?.hotelFacilities ||
      data?.hotelResult?.HotelFacilities ||
      data?.hotelResult?.Facilities ||
      data?.hotelResult?.HotelFacility ||
      data?.hotelResult?.Amenities ||
      data?.hotel?.HotelFacilities ||
      data?.hotel?.Facilities ||
      data?.hotel?.facilities ||
      data?.hotel?.hotel_facilities ||
      data?.hotel?.Amenities ||
      data?.hotel?.amenities ||
      data?.hotel?.hotel_raw?.HotelFacilities ||
      data?.hotel?.hotel_raw?.Facilities ||
      data?.hotel?.hotel_raw?.Amenities ||
      data?.roomData?.HotelFacilities ||
      data?.roomData?.Facilities ||
      data?.prebookData?.HotelFacilities ||
      data?.prebookData?.Facilities ||
      data?.prebookData?.raw?.HotelResult?.[0]?.HotelFacilities ||
      data?.prebookData?.raw?.HotelResult?.[0]?.Facilities ||
      data?.prebookData?.raw?.HotelResult?.[0]?.Amenities ||
      data?.prebookData?.raw?.Response?.HotelResult?.[0]?.HotelFacilities ||
      data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Facilities ||
      data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Amenities,
  );

  const deepFacilities = findDeepArrayByKeys(data, [
    "hotelfacilities",
    "hotel_facilities",
    "facilities",
    "facility",
    "amenities",
    "amenity",
  ]);

  return Array.from(
    new Set(
      [...directFacilities, ...deepFacilities].map((item) =>
        String(item).trim(),
      ),
    ),
  ).filter(Boolean);
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

const normalizeSupplementGroups = (value) => {
  if (!value) return [];

  const groups = Array.isArray(value) ? value : [value];

  return groups
    .map((group) => {
      if (Array.isArray(group)) {
        return group.flat(Infinity).filter(Boolean);
      }

      return group ? [group] : [];
    })
    .filter((group) => group.length > 0);
};

const getSupplementsFromReviewData = (data = {}) => {
  const sources = [
    data?.supplements,
    data?.Supplements,

    data?.roomData?.Supplements,
    data?.roomData?.supplements,
    data?.roomData?.Supplement,

    data?.hotelResult?.Supplements,
    data?.hotelResult?.supplements,

    data?.prebookData?.supplements,
    data?.prebookData?.Supplements,
    data?.prebookData?.room?.Supplements,
    data?.prebookData?.room?.supplements,

    data?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.Supplements,
    data?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0]?.supplements,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.Supplements,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.supplements,

    data?.prebookData?.raw?.HotelResult?.[0]?.Supplements,
    data?.prebookData?.raw?.HotelResult?.[0]?.supplements,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.Supplements,
    data?.prebookData?.raw?.Response?.HotelResult?.[0]?.supplements,
  ];

  for (const source of sources) {
    const normalized = normalizeSupplementGroups(source);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
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

  const mergedHotel = {
    ...(selectedHotel || {}),
    ...(baseReviewData?.hotel || {}),
    hotel_raw: {
      ...(selectedHotel?.hotel_raw || selectedHotel?.rawHotel || {}),
      ...(baseReviewData?.hotel?.hotel_raw || {}),
    },
  };

  const mergedRoomData =
    baseReviewData?.roomData ||
    selectedRoom ||
    baseReviewData?.prebookData?.room ||
    {};

  const mergedPrebookData = baseReviewData?.prebookData || prebookData || {};

  const mergedHotelResult =
    baseReviewData?.hotelResult ||
    prebookData?.raw?.HotelResult?.[0] ||
    prebookData?.raw?.Response?.HotelResult?.[0] ||
    {};

  const reviewDataSource = baseReviewData
    ? {
        ...baseReviewData,
        hotel: mergedHotel,
        roomData: mergedRoomData,
        prebookData: mergedPrebookData,
        hotelResult: mergedHotelResult,
      }
    : null;

  const reviewData = reviewDataSource
    ? {
        ...reviewDataSource,

        hotelAddress:
          reviewDataSource?.hotelAddress ||
          getHotelAddressFromReviewData(reviewDataSource),

        hotelFacilities:
          reviewDataSource?.hotelFacilities ||
          getHotelFacilitiesFromReviewData(reviewDataSource),

        hotelNorms:
          reviewDataSource?.hotelNorms ||
          getHotelNormsFromReviewData(reviewDataSource),

        supplements: getSupplementsFromReviewData(reviewDataSource),
      }
    : null;

  const [loading, setLoading] = useState(false);

  const packageFareFlags = getPackageFareFlags(reviewData || {});
  const gstAllowed = getGSTAllowed(reviewData || {});

  const [transportForm, setTransportForm] = useState(() => {
    const payload = reviewData?.finalPayload || {};

    return {
      arrivalTransportType:
        payload?.ArrivalTransport?.ArrivalTransportType ?? 0,
      arrivalTransportInfoId: payload?.ArrivalTransport?.TransportInfoId || "",
      arrivalTime:
        payload?.ArrivalTransport?.Time ||
        getDateTimeLocalDefault(reviewData?.checkIn, "14:00"),

      departureTransportType:
        payload?.DepartureTransport?.DepartureTransportType ?? 0,
      departureTransportInfoId:
        payload?.DepartureTransport?.TransportInfoId || "",
      departureTime:
        payload?.DepartureTransport?.Time ||
        getDateTimeLocalDefault(reviewData?.checkOut, "11:00"),
    };
  });

  const [gstForms, setGstForms] = useState(() => {
    const guests = reviewData?.guestList || [];

    return guests.map((guest) => ({
      GSTCompanyAddress: guest?.GSTCompanyAddress || "",
      GSTCompanyContactNumber: guest?.GSTCompanyContactNumber || "",
      GSTCompanyName: guest?.GSTCompanyName || "",
      GSTNumber: guest?.GSTNumber || "",
      GSTCompanyEmail: guest?.GSTCompanyEmail || "",
    }));
  });

  const updateTransportField = (field, value) => {
    setTransportForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateGSTField = (guestIndex, field, value) => {
    setGstForms((prev) => {
      const updated = [...prev];

      updated[guestIndex] = {
        ...(updated[guestIndex] || emptyGSTDetails),
        [field]: value,
      };

      return updated;
    });
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

  const validatePackageTransportDetails = () => {
    if (packageFareFlags.isPackageDetailsMandatory) {
      if (!transportForm.arrivalTransportInfoId || !transportForm.arrivalTime) {
        alert("Arrival transport details are required for this package fare.");
        return false;
      }
    }

    if (packageFareFlags.isDepartureDetailsMandatory) {
      if (
        !transportForm.departureTransportInfoId ||
        !transportForm.departureTime
      ) {
        alert("Departure transport details are required for this booking.");
        return false;
      }
    }

    return true;
  };

  const validateGSTDetails = () => {
    if (!gstAllowed) return true;

    for (let index = 0; index < gstForms.length; index += 1) {
      const gst = cleanGSTDetails(gstForms[index]);

      if (hasAnyGSTValue(gst) && !hasAllGSTValues(gst)) {
        alert(
          `Please fill all GST details for Guest ${
            index + 1
          }, or leave all GST fields empty.`,
        );
        return false;
      }

      if (
        gst.GSTCompanyEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gst.GSTCompanyEmail)
      ) {
        alert(`Please enter a valid GST company email for Guest ${index + 1}.`);
        return false;
      }

      if (
        gst.GSTNumber &&
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          gst.GSTNumber,
        )
      ) {
        alert(`Please enter a valid GST number for Guest ${index + 1}.`);
        return false;
      }
    }

    return true;
  };

  const buildFinalBookingPayload = () => {
    const payload = {
      ...(reviewData?.finalPayload || {}),
    };

    if (packageFareFlags.isPackageFare) {
      payload.IsPackageFare = true;
    }

    if (packageFareFlags.isPackageDetailsMandatory) {
      payload.ArrivalTransport = {
        ArrivalTransportType: Number(transportForm.arrivalTransportType),
        TransportInfoId: String(
          transportForm.arrivalTransportInfoId || "",
        ).trim(),
        Time: normalizeDateTimeForApi(transportForm.arrivalTime),
      };
    }

    if (packageFareFlags.isDepartureDetailsMandatory) {
      payload.DepartureTransport = {
        DepartureTransportType: Number(transportForm.departureTransportType),
        TransportInfoId: String(
          transportForm.departureTransportInfoId || "",
        ).trim(),
        Time: normalizeDateTimeForApi(transportForm.departureTime),
      };
    }

    if (gstAllowed) {
      payload.GSTAllowed = true;

      if (Array.isArray(payload.HotelRoomsDetails)) {
        let passengerIndex = 0;

        payload.HotelRoomsDetails = payload.HotelRoomsDetails.map((room) => {
          const passengers = Array.isArray(room?.HotelPassenger)
            ? room.HotelPassenger
            : [];

          const updatedPassengers = passengers.map((passenger) => {
            const updatedPassenger = addGSTToPassenger(
              passenger,
              gstForms[passengerIndex],
              gstAllowed,
            );

            passengerIndex += 1;

            return updatedPassenger;
          });

          return {
            ...room,
            HotelPassenger: updatedPassengers,
          };
        });
      }

      if (Array.isArray(payload.HotelPassenger)) {
        payload.HotelPassenger = payload.HotelPassenger.map(
          (passenger, index) =>
            addGSTToPassenger(passenger, gstForms[index], gstAllowed),
        );
      }

      if (Array.isArray(payload.HotelPassengers)) {
        payload.HotelPassengers = payload.HotelPassengers.map(
          (passenger, index) =>
            addGSTToPassenger(passenger, gstForms[index], gstAllowed),
        );
      }
    }

    return payload;
  };

  const handleConfirmBooking = async () => {
    if (!reviewData?.finalPayload) {
      return alert("Booking payload missing");
    }

    if (!validatePackageTransportDetails()) return;
    if (!validateGSTDetails()) return;

    try {
      setLoading(true);

      const finalHotelFacilities = getHotelFacilitiesFromReviewData(reviewData);
      const finalHotelNorms = getHotelNormsFromReviewData(reviewData);
      const finalSupplements = getSupplementsFromReviewData(reviewData);
      const bookingPayload = buildFinalBookingPayload();

      console.log("FINAL BOOK PAYLOAD:", bookingPayload);
      console.log("PACKAGE FARE FLAGS:", packageFareFlags);
      console.log("GST ALLOWED:", gstAllowed);
      console.log("GST DETAILS:", gstForms);

      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        bookingPayload,
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

        finalPayload: bookingPayload,

        isPackageFare: packageFareFlags.isPackageFare,
        isPackageDetailsMandatory: packageFareFlags.isPackageDetailsMandatory,
        departureDetailsMandatory: packageFareFlags.isDepartureDetailsMandatory,

        gstAllowed,
        gstDetails: gstForms,

        cancellationPolicies: reviewData.cancellationPolicies || [],
        roomPromotions: reviewData.roomPromotions || [],
        supplements: finalSupplements,
        roomAmenities: reviewData.roomAmenities || [],
        rateConditions: reviewData.rateConditions || [],

        hotelFacilities: finalHotelFacilities,
        hotelNorms: finalHotelNorms,
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
    isPANRequired,
    corporatePAN,
    cancellationPolicies = [],
    roomPromotions = [],
    roomAmenities = [],
    rateConditions = [],
    finalPayload,
  } = reviewData;

  const supplements = getSupplementsFromReviewData(reviewData);

  const hotelFacilities = getHotelFacilitiesFromReviewData(reviewData);

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
              </div>
            </div>

            {packageFareFlags.isPackageFare && (
              <div className="rounded-2xl border border-yellow-400/20 bg-[#15151C] p-6">
                <div className="mb-5">
                  <h3 className="font-semibold text-yellow-300">
                    Package Fare Details
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    This booking is marked as a package fare. Required transport
                    details will be sent in the Book request.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                    IsPackageFare: true
                  </span>

                  {packageFareFlags.isPackageDetailsMandatory && (
                    <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-200">
                      Arrival details mandatory
                    </span>
                  )}

                  {packageFareFlags.isDepartureDetailsMandatory && (
                    <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-200">
                      Departure details mandatory
                    </span>
                  )}
                </div>

                {(packageFareFlags.isPackageDetailsMandatory ||
                  packageFareFlags.isDepartureDetailsMandatory) && (
                  <div className="mt-5 grid grid-cols-1 gap-5">
                    {packageFareFlags.isPackageDetailsMandatory && (
                      <div className="rounded-xl border border-gray-800 bg-[#0B0B0F] p-4">
                        <h4 className="mb-4 font-semibold text-white">
                          Arrival Transport
                        </h4>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Transport Type
                            </label>

                            <select
                              value={transportForm.arrivalTransportType}
                              onChange={(e) =>
                                updateTransportField(
                                  "arrivalTransportType",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                            >
                              <option value={0}>Flight</option>
                              <option value={1}>Surface</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Transport Info ID / Flight No.
                            </label>

                            <input
                              type="text"
                              value={transportForm.arrivalTransportInfoId}
                              onChange={(e) =>
                                updateTransportField(
                                  "arrivalTransportInfoId",
                                  e.target.value,
                                )
                              }
                              placeholder="Example: AB 777"
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-400"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Arrival Time
                            </label>

                            <input
                              type="datetime-local"
                              value={String(
                                transportForm.arrivalTime || "",
                              ).slice(0, 16)}
                              onChange={(e) =>
                                updateTransportField(
                                  "arrivalTime",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {packageFareFlags.isDepartureDetailsMandatory && (
                      <div className="rounded-xl border border-gray-800 bg-[#0B0B0F] p-4">
                        <h4 className="mb-4 font-semibold text-white">
                          Departure Transport
                        </h4>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Transport Type
                            </label>

                            <select
                              value={transportForm.departureTransportType}
                              onChange={(e) =>
                                updateTransportField(
                                  "departureTransportType",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                            >
                              <option value={0}>Flight</option>
                              <option value={1}>Surface</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Transport Info ID / Flight No.
                            </label>

                            <input
                              type="text"
                              value={transportForm.departureTransportInfoId}
                              onChange={(e) =>
                                updateTransportField(
                                  "departureTransportInfoId",
                                  e.target.value,
                                )
                              }
                              placeholder="Example: AB 777"
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-400"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Departure Time
                            </label>

                            <input
                              type="datetime-local"
                              value={String(
                                transportForm.departureTime || "",
                              ).slice(0, 16)}
                              onChange={(e) =>
                                updateTransportField(
                                  "departureTime",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {hotelFacilities.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-yellow-300">
                      Hotel Facilities
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Facilities provided by this hotel.
                    </p>
                  </div>

                  <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                    {hotelFacilities.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {hotelFacilities.map((facility, index) => (
                    <span
                      key={`${facility}-${index}`}
                      className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-medium text-yellow-100"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
              <div className="bg-[#1E2230] px-5 py-3">
                <h3 className="font-semibold text-yellow-300">Guest Details</h3>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  {guestList.length > 0 ? (
                    guestList.map((guest, index) => (
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

                        {gstAllowed && (
                          <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/10 p-4">
                            <div className="mb-4">
                              <h5 className="text-sm font-semibold text-blue-200">
                                GST Details Optional
                              </h5>

                              <p className="mt-1 text-xs text-gray-400">
                                Fill these details only if GST invoice is
                                required for this passenger.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs text-gray-400">
                                  GST Company Name
                                </label>

                                <input
                                  type="text"
                                  value={gstForms[index]?.GSTCompanyName || ""}
                                  onChange={(e) =>
                                    updateGSTField(
                                      index,
                                      "GSTCompanyName",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Company name"
                                  className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-gray-400">
                                  GST Number
                                </label>

                                <input
                                  type="text"
                                  value={gstForms[index]?.GSTNumber || ""}
                                  onChange={(e) =>
                                    updateGSTField(
                                      index,
                                      "GSTNumber",
                                      e.target.value.toUpperCase(),
                                    )
                                  }
                                  placeholder="GSTIN"
                                  maxLength={15}
                                  className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm uppercase text-white outline-none placeholder:text-gray-600 focus:border-blue-400"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-gray-400">
                                  GST Company Contact Number
                                </label>

                                <input
                                  type="tel"
                                  value={
                                    gstForms[index]?.GSTCompanyContactNumber ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateGSTField(
                                      index,
                                      "GSTCompanyContactNumber",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Contact number"
                                  className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs text-gray-400">
                                  GST Company Email
                                </label>

                                <input
                                  type="email"
                                  value={gstForms[index]?.GSTCompanyEmail || ""}
                                  onChange={(e) =>
                                    updateGSTField(
                                      index,
                                      "GSTCompanyEmail",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="company@example.com"
                                  className="w-full rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs text-gray-400">
                                  GST Company Address
                                </label>

                                <textarea
                                  rows={3}
                                  value={
                                    gstForms[index]?.GSTCompanyAddress || ""
                                  }
                                  onChange={(e) =>
                                    updateGSTField(
                                      index,
                                      "GSTCompanyAddress",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Company billing address"
                                  className="w-full resize-none rounded-lg border border-gray-700 bg-[#15151C] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">
                      Guest details are not available.
                    </p>
                  )}
                </div>
              </div>
            </div>

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

            {supplements.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#15151C]">
                <div className="flex items-center gap-2 bg-[#1E2230] px-5 py-3">
                  <span className="text-yellow-300">➕</span>
                  <h3 className="font-semibold text-yellow-300">Supplements</h3>
                </div>

                <div className="p-5">
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
                            ).map((supplement, index) => {
                              const price =
                                supplement?.Price ??
                                supplement?.Amount ??
                                supplement?.Charge ??
                                supplement?.SupplementPrice ??
                                supplement?.SupplementCharge ??
                                0;

                              const currency =
                                supplement?.Currency ||
                                supplement?.currency ||
                                reviewData?.prebookData?.currency ||
                                reviewData?.prebookData?.Currency ||
                                reviewData?.currency ||
                                "INR";

                              return (
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
                                        {supplement?.Description ||
                                          supplement?.Name ||
                                          supplement?.SupplementName ||
                                          "Supplement"}
                                      </h5>
                                    </div>

                                    <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                                      {supplement?.Type || "AtProperty"}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                      <p className="text-xs text-gray-500">
                                        Index
                                      </p>
                                      <p className="mt-1 font-semibold text-gray-100">
                                        {supplement?.Index ?? index + 1}
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                      <p className="text-xs text-gray-500">
                                        Type
                                      </p>
                                      <p className="mt-1 font-semibold text-purple-200">
                                        {supplement?.Type || "-"}
                                      </p>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                      <p className="text-xs text-gray-500">
                                        Price
                                      </p>
                                      <p className="mt-1 font-semibold text-green-300">
                                        {Number(price).toLocaleString("en-IN", {
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
                                        {currency || "-"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {roomAmenities.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-[#15151C] p-6">
                <h3 className="mb-4 font-semibold text-yellow-300">
                  Room Amenities
                </h3>

                <div className="flex flex-wrap gap-2">
                  {roomAmenities.map((amenity, index) => (
                    <span
                      key={`${amenity}-${index}`}
                      className="rounded-full border border-gray-700 bg-[#0B0B0F] px-3 py-1.5 text-xs text-gray-300"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

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

          <div className="sticky top-24 h-fit rounded-2xl border border-gray-800 bg-[#15151C] p-6">
            <h3 className="mb-4 text-lg font-semibold text-yellow-300">
              Price Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>
                  Total Amount{" "}
                  <p className="text-xs text-gray-200">
                    (Inclusive of all taxes and TDS)
                  </p>
                </span>

                <span>₹ {formatPrice(net)}</span>
              </div>

              <hr className="border-gray-700" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Payable</span>
                <span className="text-yellow-400">
                  ₹ {formatPrice(net || 0)}
                </span>
              </div>
            </div>

            {packageFareFlags.isPackageFare && (
              <div className="mt-5 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs text-yellow-100">
                Package fare will be passed in booking request as{" "}
                <b>IsPackageFare: true</b>.
              </div>
            )}

            {gstAllowed && (
              <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/10 p-4 text-xs text-blue-100">
                GST is allowed for this room. GST details will be passed
                passenger-wise only if filled.
              </div>
            )}

            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating.... " : "Generate Voucher"}
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
