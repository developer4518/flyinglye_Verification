"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const toTBODate = (date) => {
  if (!date) return "";
  return `${date}T00:00:00`;
};

const normalizeText = (value) => {
  if (!value) return "";

  try {
    if (typeof value === "string") return value.toLowerCase();
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
};

const getSafeValue = (...values) => {
  return values.find((v) => v !== undefined && v !== null && v !== "") || "";
};

const nationalityOptions = [
  { Code: "IN", Name: "India" },
  { Code: "AE", Name: "United Arab Emirates" },
  { Code: "US", Name: "United States" },
  { Code: "GB", Name: "United Kingdom" },
  { Code: "SG", Name: "Singapore" },
  { Code: "TH", Name: "Thailand" },
  { Code: "MY", Name: "Malaysia" },
  { Code: "MV", Name: "Maldives" },
  { Code: "ID", Name: "Indonesia" },
  { Code: "AU", Name: "Australia" },
  { Code: "CA", Name: "Canada" },
  { Code: "FR", Name: "France" },
  { Code: "DE", Name: "Germany" },
  { Code: "IT", Name: "Italy" },
  { Code: "CH", Name: "Switzerland" },
  { Code: "LK", Name: "Sri Lanka" },
  { Code: "NP", Name: "Nepal" },
  { Code: "BT", Name: "Bhutan" },
  { Code: "VN", Name: "Vietnam" },
];

const destinationCountryOptions = [
  { Code: "IN", Name: "India" },
  { Code: "AE", Name: "United Arab Emirates" },
  { Code: "TH", Name: "Thailand" },
  { Code: "SG", Name: "Singapore" },
  { Code: "MV", Name: "Maldives" },
  { Code: "ID", Name: "Indonesia" },
  { Code: "MY", Name: "Malaysia" },
  { Code: "VN", Name: "Vietnam" },
  { Code: "LK", Name: "Sri Lanka" },
  { Code: "NP", Name: "Nepal" },
  { Code: "BT", Name: "Bhutan" },
  { Code: "US", Name: "United States" },
  { Code: "GB", Name: "United Kingdom" },
  { Code: "FR", Name: "France" },
  { Code: "DE", Name: "Germany" },
  { Code: "IT", Name: "Italy" },
  { Code: "CH", Name: "Switzerland" },
  { Code: "AU", Name: "Australia" },
];

const detectDestinationCountry = (text = "") => {
  const value = String(text || "").toLowerCase();

  if (
    value.includes("dubai") ||
    value.includes("abu dhabi") ||
    value.includes("sharjah") ||
    value.includes("ajman") ||
    value.includes("ras al khaimah") ||
    value.includes("fujairah") ||
    value.includes("united arab emirates") ||
    value.includes("uae")
  ) {
    return "AE";
  }

  if (
    value.includes("thailand") ||
    value.includes("bangkok") ||
    value.includes("phuket") ||
    value.includes("pattaya") ||
    value.includes("krabi")
  ) {
    return "TH";
  }

  if (value.includes("singapore")) return "SG";
  if (value.includes("maldives")) return "MV";
  if (value.includes("bali") || value.includes("indonesia")) return "ID";
  if (value.includes("malaysia") || value.includes("kuala lumpur")) return "MY";
  if (value.includes("vietnam")) return "VN";
  if (value.includes("sri lanka") || value.includes("colombo")) return "LK";
  if (value.includes("nepal")) return "NP";
  if (value.includes("bhutan")) return "BT";
  if (value.includes("united states") || value.includes("usa")) return "US";
  if (value.includes("united kingdom") || value.includes("london")) return "GB";
  if (value.includes("france") || value.includes("paris")) return "FR";
  if (value.includes("germany")) return "DE";
  if (value.includes("italy")) return "IT";
  if (value.includes("switzerland")) return "CH";
  if (value.includes("australia")) return "AU";

  return "IN";
};

const cleanEmptyKeys = (obj) => {
  const cleaned = { ...obj };

  Object.keys(cleaned).forEach((key) => {
    if (
      cleaned[key] === undefined ||
      cleaned[key] === null ||
      cleaned[key] === ""
    ) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

const HotelBooking = () => {
  const { setGuestDetails } = useHotelStore();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const payload = state?.payload || state;

  const { hotel, preBook, checkIn, checkOut, guests, search } = payload;

  if (!preBook) {
    return (
      <div className="p-10 text-center text-white bg-[#0B0B0F] min-h-screen">
        <h2 className="text-xl text-red-400 mb-4">⚠️ Session Expired</h2>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  const roomData = preBook?.raw?.HotelResult?.[0]?.Rooms?.[0];
  const validation = preBook?.validation || {};

  const bookingCode =
    preBook?.booking_code ||
    preBook?.BookingCode ||
    roomData?.BookingCode ||
    payload?.room?.BookingCode;

  const net =
    Number(preBook?.net_amount || preBook?.NetAmount || roomData?.NetAmount) ||
    0;

  const total =
    Number(
      preBook?.total_amount || preBook?.TotalAmount || roomData?.TotalFare,
    ) || 0;

  const convenienceFee =
    Number(preBook?.convenience_fee || preBook?.ConvenienceFee) || 0;

  const adultsCount =
    Number(guests?.adults || search?.adults || payload?.adults || 0) || 0;

  const childrenCount =
    Number(guests?.children || search?.children || payload?.children || 0) || 0;

  const totalGuests =
    typeof guests === "number" ? guests : adultsCount + childrenCount;

  const defaultGuestNationality =
    search?.nationality ||
    search?.GuestNationality ||
    payload?.nationality ||
    payload?.GuestNationality ||
    "IN";

  const [guestNationality, setGuestNationality] = useState(
    defaultGuestNationality,
  );

  const hotelCountryCode = getSafeValue(
    hotel?.country_code,
    hotel?.CountryCode,
    hotel?.countryCode,
    hotel?.Country_Code,
    hotel?.CountryCodeIso,
    hotel?.CountryCodeISO,
    hotel?.HotelInfo?.CountryCode,
    hotel?.HotelInfo?.Country_Code,
    preBook?.raw?.HotelResult?.[0]?.CountryCode,
    preBook?.raw?.HotelResult?.[0]?.countryCode,
    preBook?.raw?.HotelResult?.[0]?.Country_Code,
    preBook?.raw?.HotelResult?.[0]?.CountryCodeIso,
    preBook?.raw?.HotelResult?.[0]?.HotelInfo?.CountryCode,
    preBook?.raw?.HotelResult?.[0]?.HotelInfo?.Country_Code,
  );

  const hotelCountryName = getSafeValue(
    hotel?.country_name,
    hotel?.CountryName,
    hotel?.countryName,
    hotel?.Country,
    hotel?.country,
    hotel?.address?.country,
    hotel?.Address?.country,
    hotel?.HotelInfo?.CountryName,
    preBook?.raw?.HotelResult?.[0]?.CountryName,
    preBook?.raw?.HotelResult?.[0]?.countryName,
    preBook?.raw?.HotelResult?.[0]?.Country,
    preBook?.raw?.HotelResult?.[0]?.HotelInfo?.CountryName,
  );

  const destinationText = useMemo(() => {
    return [
      normalizeText(hotel),
      normalizeText(search),
      normalizeText(payload),
      normalizeText(preBook),
      normalizeText(preBook?.raw),
      normalizeText(preBook?.raw?.HotelResult?.[0]),
      normalizeText(preBook?.raw?.HotelResult?.[0]?.HotelInfo),
      normalizeText(preBook?.raw?.HotelResult?.[0]?.Rooms),
      normalizeText(hotelCountryCode),
      normalizeText(hotelCountryName),
    ].join(" ");
  }, [hotel, search, payload, preBook, hotelCountryCode, hotelCountryName]);

  const detectedDestinationCountry = useMemo(() => {
    const code = String(hotelCountryCode || "")
      .trim()
      .toUpperCase();
    const name = String(hotelCountryName || "")
      .trim()
      .toLowerCase();

    if (["IN", "IND", "INDIA"].includes(code)) return "IN";
    if (["AE", "UAE"].includes(code)) return "AE";

    if (code && !["IN", "IND", "INDIA"].includes(code)) {
      const exists = destinationCountryOptions.some(
        (country) => country.Code === code,
      );

      return exists ? code : "AE";
    }

    if (name.includes("india")) return "IN";

    if (name.includes("united arab emirates") || name.includes("uae")) {
      return "AE";
    }

    if (name) {
      const matched = destinationCountryOptions.find((country) =>
        name.includes(country.Name.toLowerCase()),
      );

      if (matched) return matched.Code;
    }

    return detectDestinationCountry(destinationText);
  }, [hotelCountryCode, hotelCountryName, destinationText]);

  const [destinationCountry, setDestinationCountry] = useState(
    detectedDestinationCountry,
  );

  const isInternationalHotel = destinationCountry !== "IN";

  const [guestList, setGuestList] = useState(
    Array.from({ length: totalGuests }, (_, i) => {
      const isChild = i >= adultsCount;

      return {
        Title: isChild ? "Master" : "Mr",
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Email: "",
        Phoneno: "",
        PaxType: isChild ? 2 : 1,
        LeadPassenger: i === 0,
        Age: "",
        Nationality: defaultGuestNationality,

        PassportNo: "",
        PassportIssueDate: "",
        PassportExpDate: "",

        PAN: "",
        ParentPAN: "",
      };
    }),
  );

  const [loading, setLoading] = useState(false);

  const updateGuest = (index, field, value) => {
    setGuestList((prev) => {
      const updated = [...prev];

      if (field === "Age") {
        updated[index][field] = value.replace(/\D/g, "").slice(0, 3);
        return updated;
      }

      if (field === "PAN" || field === "ParentPAN" || field === "PassportNo") {
        updated[index][field] = value.toUpperCase();
        return updated;
      }

      updated[index][field] = value;
      return updated;
    });
  };

  const handleNationalityChange = (value) => {
    setGuestNationality(value);

    setGuestList((prev) =>
      prev.map((guest) => ({
        ...guest,
        Nationality: value,
      })),
    );
  };

  const getFinalGuestAge = (guest) => {
    return Number(guest.Age);
  };

  const validateGuests = () => {
    if (!bookingCode) {
      return "Booking code missing. Please select room again.";
    }

    if (!guestNationality) {
      return "Guest nationality is required";
    }

    if (!destinationCountry) {
      return "Hotel destination country is required";
    }

    for (let i = 0; i < guestList.length; i++) {
      const g = guestList[i];
      const finalAge = getFinalGuestAge(g);

      if (!g.Nationality) {
        return `Guest ${i + 1}: Nationality is required`;
      }

      if (!g.FirstName.trim() || !g.LastName.trim()) {
        return `Guest ${i + 1}: First name and last name are required`;
      }

      if (!finalAge) {
        return `Guest ${i + 1}: Age is required`;
      }

      if (Number.isNaN(finalAge) || finalAge <= 0) {
        return `Guest ${i + 1}: Enter valid age`;
      }

      if (g.PaxType === 1 && finalAge < 12) {
        return `Guest ${i + 1}: Adult age must be 12 or above`;
      }

      if (g.PaxType === 2 && finalAge >= 12) {
        return `Guest ${i + 1}: Child age must be below 12`;
      }

      if (g.LeadPassenger) {
        if (!g.Email.trim() || !g.Email.includes("@")) {
          return "Valid email required";
        }

        if (!/^[0-9]{10}$/.test(g.Phoneno)) {
          return "Valid 10-digit phone required";
        }
      }

      if (
        validation?.PaxNameMinLength &&
        g.FirstName.length < validation.PaxNameMinLength
      ) {
        return `Guest ${i + 1}: Name too short`;
      }

      if (
        validation?.PaxNameMaxLength &&
        g.FirstName.length > validation.PaxNameMaxLength
      ) {
        return `Guest ${i + 1}: Name too long`;
      }

      if (isInternationalHotel) {
        if (!g.PassportNo.trim()) {
          return `Guest ${i + 1}: Passport number is required`;
        }

        if (!g.PassportIssueDate) {
          return `Guest ${i + 1}: Passport issue date is required`;
        }

        if (!g.PassportExpDate) {
          return `Guest ${i + 1}: Passport expiry date is required`;
        }

        if (g.PassportExpDate <= g.PassportIssueDate) {
          return `Guest ${i + 1}: Passport expiry date must be after issue date`;
        }

        if (g.PaxType === 1) {
          if (!g.PAN.trim()) {
            return `Guest ${i + 1}: PAN number is required`;
          }

          if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(g.PAN.toUpperCase())) {
            return `Guest ${i + 1}: Enter valid PAN number`;
          }
        }

        if (g.PaxType === 2) {
          if (!g.ParentPAN.trim()) {
            return `Guest ${i + 1}: Parent PAN number is required`;
          }

          if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(g.ParentPAN.toUpperCase())) {
            return `Guest ${i + 1}: Enter valid Parent PAN number`;
          }
        }
      }
    }

    return null;
  };

  const handleBookHotel = async () => {
    const error = validateGuests();
    if (error) return alert(error);

    try {
      setLoading(true);

      const cleanedGuests = guestList.map((g, i) => {
        const finalAge = getFinalGuestAge(g);

        const baseGuest = {
          Title: g.Title,
          FirstName: g.FirstName.trim(),
          MiddleName: "",
          LastName: g.LastName.trim(),
          Email: i === 0 ? g.Email.trim() : undefined,
          Phoneno: i === 0 ? g.Phoneno.trim() : undefined,
          PaxType: g.PaxType,
          LeadPassenger: i === 0,
          Age: finalAge,
          Nationality: g.Nationality || guestNationality,
        };

        if (isInternationalHotel) {
          baseGuest.PassportNo = g.PassportNo.trim().toUpperCase();
          baseGuest.PassportIssueDate = toTBODate(g.PassportIssueDate);
          baseGuest.PassportExpDate = toTBODate(g.PassportExpDate);

          if (g.PaxType === 1) {
            baseGuest.PAN = g.PAN.trim().toUpperCase();
          }

          if (g.PaxType === 2) {
            baseGuest.ParentPAN = g.ParentPAN.trim().toUpperCase();

            // Some hotel APIs only read PAN, so send parent PAN in PAN too.
            baseGuest.PAN = g.ParentPAN.trim().toUpperCase();
          }
        }

        return cleanEmptyKeys(baseGuest);
      });

      const HotelRoomsDetails = [
        {
          RoomIndex: 1,
          HotelPassenger: cleanedGuests,
        },
      ];

      const finalPayload = {
        BookingCode: bookingCode,
        IsVoucherBooking: true,
        GuestNationality: guestNationality,
        RequestedBookingMode: 5,
        NetAmount: net,
        HotelRoomsDetails,
      };

      console.log("CHILD AGE DEBUG:", {
        adultsCount,
        childrenCount,
        enteredChildAges: cleanedGuests
          .filter((guest) => guest.PaxType === 2)
          .map((guest) => guest.Age),
      });

      console.log("FINAL PAYLOAD:", JSON.stringify(finalPayload, null, 2));

      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        finalPayload,
      );

      console.log("BOOK RESPONSE:", res.data);

      localStorage.setItem(
        "hotelBookingData",
        JSON.stringify({
          guestList: cleanedGuests,
          bookingCode,
          hotel,
          checkIn,
          checkOut,
          bookingResponse: res.data,
          isInternationalHotel,
          guestNationality,
          destinationCountry,
          enteredChildAges: cleanedGuests
            .filter((guest) => guest.PaxType === 2)
            .map((guest) => guest.Age),
        }),
      );

      setGuestDetails(cleanedGuests);

      navigate("/hotel-booking-success", {
        state: { booking: res.data },
      });
    } catch (err) {
      console.log("BOOK ERROR:", err?.response?.data);

      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Booking failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
            <h2 className="text-2xl font-bold text-yellow-400">
              {hotel?.hotel_name || hotel?.HotelName || "Hotel Booking"}
            </h2>

            <p className="text-gray-400 text-sm mt-2">
              📅 {checkIn} → {checkOut}
            </p>

            <p className="text-gray-400 text-sm mt-1">
              🛏 {roomData?.Name?.[0] || "Standard Room"}
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Guest Nationality <span className="text-red-400">*</span>
                </label>

                <select
                  className="input"
                  value={guestNationality}
                  onChange={(e) => handleNationalityChange(e.target.value)}
                >
                  {nationalityOptions.map((country) => (
                    <option key={country.Code} value={country.Code}>
                      {country.Name} ({country.Code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Hotel Destination Country{" "}
                  <span className="text-red-400">*</span>
                </label>

                <select
                  className="input"
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                >
                  {destinationCountryOptions.map((country) => (
                    <option key={country.Code} value={country.Code}>
                      {country.Name} ({country.Code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
                Guest Nationality: {guestNationality}
              </span>

              <span className="text-xs px-3 py-1 rounded-full bg-blue-400/10 text-blue-300 border border-blue-400/20">
                Destination Country: {destinationCountry}
              </span>

              {isInternationalHotel ? (
                <span className="text-xs px-3 py-1 rounded-full bg-red-400/10 text-red-300 border border-red-400/20">
                  International Destination: Passport & PAN Required
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-green-400/10 text-green-300 border border-green-400/20">
                  Domestic Destination
                </span>
              )}
            </div>

            {childrenCount > 0 && (
              <p className="mt-3 text-xs text-blue-300">
                Please enter the correct child age in guest details. This age
                will be sent in the final hotel booking payload.
              </p>
            )}
          </div>

          {guestList.map((guest, index) => {
            const isChild = guest.PaxType === 2;

            return (
              <div
                key={index}
                className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
              >
                <h3 className="text-yellow-300 mb-4">
                  Guest {index + 1} {guest.LeadPassenger && "(Lead)"}
                  {isChild && (
                    <span className="ml-2 text-xs text-blue-300">Child</span>
                  )}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className="input"
                    value={guest.Title}
                    onChange={(e) =>
                      updateGuest(index, "Title", e.target.value)
                    }
                  >
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Master">Master</option>
                    <option value="Miss">Miss</option>
                  </select>

                  <input
                    placeholder="First Name"
                    className="input"
                    value={guest.FirstName}
                    onChange={(e) =>
                      updateGuest(index, "FirstName", e.target.value)
                    }
                  />

                  <input
                    placeholder="Last Name"
                    className="input"
                    value={guest.LastName}
                    onChange={(e) =>
                      updateGuest(index, "LastName", e.target.value)
                    }
                  />

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Nationality <span className="text-red-400">*</span>
                    </label>

                    <select
                      className="input"
                      value={guest.Nationality}
                      onChange={(e) =>
                        updateGuest(index, "Nationality", e.target.value)
                      }
                    >
                      {nationalityOptions.map((country) => (
                        <option key={country.Code} value={country.Code}>
                          {country.Name} ({country.Code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      {guest.PaxType === 1 ? "Adult Age" : "Child Age"}
                      <span className="text-red-400"> *</span>
                    </label>

                    <input
                      type="number"
                      min={guest.PaxType === 1 ? 12 : 1}
                      max={guest.PaxType === 1 ? 120 : 11}
                      placeholder={
                        guest.PaxType === 1
                          ? "Enter adult age"
                          : "Enter child age"
                      }
                      className="input"
                      value={guest.Age}
                      onChange={(e) =>
                        updateGuest(index, "Age", e.target.value)
                      }
                    />
                  </div>

                  {guest.LeadPassenger && (
                    <>
                      <input
                        placeholder="Email"
                        className="input"
                        value={guest.Email}
                        onChange={(e) =>
                          updateGuest(index, "Email", e.target.value)
                        }
                      />

                      <input
                        placeholder="Phone"
                        className="input"
                        value={guest.Phoneno}
                        onChange={(e) =>
                          updateGuest(
                            index,
                            "Phoneno",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                      />
                    </>
                  )}

                  {isInternationalHotel && (
                    <div className="sm:col-span-2 mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                      <h4 className="text-yellow-300 font-semibold mb-2">
                        Passport & PAN Details
                      </h4>

                      <p className="text-xs text-gray-400 mb-4">
                        Required because this hotel destination is outside
                        India. Adults require PAN. Child guests require parent
                        PAN.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Passport Number{" "}
                            <span className="text-red-400">*</span>
                          </label>

                          <input
                            placeholder="Enter Passport Number"
                            className="input uppercase"
                            value={guest.PassportNo}
                            onChange={(e) =>
                              updateGuest(
                                index,
                                "PassportNo",
                                e.target.value.toUpperCase(),
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Passport Issue Date{" "}
                            <span className="text-red-400">*</span>
                          </label>

                          <input
                            type="date"
                            className="input"
                            value={guest.PassportIssueDate}
                            onChange={(e) =>
                              updateGuest(
                                index,
                                "PassportIssueDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Passport Expiry Date{" "}
                            <span className="text-red-400">*</span>
                          </label>

                          <input
                            type="date"
                            className="input"
                            value={guest.PassportExpDate}
                            onChange={(e) =>
                              updateGuest(
                                index,
                                "PassportExpDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        {guest.PaxType === 1 && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              PAN Number <span className="text-red-400">*</span>
                            </label>

                            <input
                              placeholder="Enter PAN Number"
                              maxLength={10}
                              className="input uppercase"
                              value={guest.PAN}
                              onChange={(e) =>
                                updateGuest(
                                  index,
                                  "PAN",
                                  e.target.value.toUpperCase().slice(0, 10),
                                )
                              }
                            />
                          </div>
                        )}

                        {guest.PaxType === 2 && (
                          <div className="sm:col-span-2 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
                            <h5 className="text-blue-300 font-semibold mb-3">
                              Parent PAN Details
                            </h5>

                            <p className="text-xs text-gray-400 mb-4">
                              For child guests, enter parent PAN only.
                            </p>

                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                Parent PAN Number{" "}
                                <span className="text-red-400">*</span>
                              </label>

                              <input
                                placeholder="Enter Parent PAN"
                                maxLength={10}
                                className="input uppercase"
                                value={guest.ParentPAN}
                                onChange={(e) =>
                                  updateGuest(
                                    index,
                                    "ParentPAN",
                                    e.target.value.toUpperCase().slice(0, 10),
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800 h-fit sticky top-24">
          <h3 className="text-yellow-300 mb-4 text-lg">Price Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Net</span>
              <span>₹ {Math.round(net)}</span>
            </div>

            <div className="flex justify-between">
              <span>Convenience Fees</span>
              <span>₹ {Math.round(convenienceFee)}</span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-yellow-400">₹ {Math.round(total)}</span>
            </div>
          </div>

          <button
            onClick={handleBookHotel}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-black disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>

      <style jsx>{`
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

        .input::placeholder {
          color: #777;
        }

        select.input option {
          background: #0b0b0f;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default HotelBooking;
