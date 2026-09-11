import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFlightStore } from "../../../store/flightStore";

const ALL_SOURCE_TITLES = [
  "Mr",
  "Mstr",
  "Mrs",
  "Ms",
  "Miss",
  "Master",
  "DR",
  "CHD",
  "MST",
  "PROF",
  "Inf",
];

const TRUJET_ADULT_TITLES = ["MR", "MRS", "MS"];
const TRUJET_CHILD_TITLES = ["MISS", "MSTR"];

const FORBIDDEN_LAST_NAME_TITLE_REGEX =
  /^(mr|mrs|ms|miss|master|mstr|dr|chd|mst|prof|inf)(?:\.|\s|$)/i;

const PAX_TYPE_LABELS = {
  1: "Adult",
  2: "Child",
  3: "Infant",
};

const normalizePaxType = (value) => {
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["1", "adult", "adt"].includes(normalizedValue)) return 1;
  if (["2", "child", "chd"].includes(normalizedValue)) return 2;
  if (["3", "infant", "inf"].includes(normalizedValue)) return 3;

  return 1;
};

const getFareBreakdown = (flight) => {
  const breakdown =
    flight?.Fare?.FareBreakdown ||
    flight?.FareBreakdown ||
    flight?.fare?.fareBreakdown ||
    flight?.fareBreakdown ||
    [];

  return Array.isArray(breakdown) ? breakdown : [];
};

const buildPassengerTypes = (flight, totalPassengers) => {
  const passengerTypes = [];
  const fareBreakdown = getFareBreakdown(flight);

  fareBreakdown.forEach((item) => {
    const paxType = normalizePaxType(
      item?.PassengerType ?? item?.PaxType ?? item?.passengerType,
    );

    const count = Math.max(
      0,
      Number(
        item?.PassengerCount ??
        item?.PaxCount ??
        item?.Count ??
        item?.passengerCount ??
        0,
      ) || 0,
    );

    for (let index = 0; index < count; index += 1) {
      passengerTypes.push(paxType);
    }
  });

  while (passengerTypes.length < totalPassengers) {
    passengerTypes.push(1);
  }

  return passengerTypes.slice(0, totalPassengers);
};

const getAirlineProfile = (selectedFlight, segments) => {
  const values = [
    selectedFlight?.AirlineCode,
    selectedFlight?.AirlineName,
    selectedFlight?.ValidatingAirline,
    selectedFlight?.ValidatingAirlineCode,
    selectedFlight?.SourceName,
    selectedFlight?.SupplierName,
    ...segments.flatMap((segment) => [
      segment?.Airline?.AirlineCode,
      segment?.Airline?.AirlineName,
      segment?.AirlineCode,
      segment?.AirlineName,
      segment?.MarketingAirline,
      segment?.MarketingAirlineCode,
      segment?.OperatingCarrier,
      segment?.OperatingCarrierCode,
    ]),
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim())
    .filter(Boolean);

  const exactValues = new Set(values.map((value) => value.toUpperCase()));
  const compactText = values
    .join(" ")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const hasCode = (...codes) =>
    codes.some((code) => exactValues.has(String(code).toUpperCase()));

  const hasName = (...names) =>
    names.some((name) =>
      compactText.includes(
        String(name)
          .toLowerCase()
          .replace(/[\s_-]+/g, ""),
      ),
    );

  if (hasCode("SG") || hasName("SpiceJet", "Spice Jet")) {
    return {
      key: "SPICEJET",
      label: "SpiceJet",
      lastNameLettersOnly: false,
      allowTitleInLastName: false,
      rejectDuplicateNames: true,
      isTruJet: false,
    };
  }

  if (
    hasCode("J9", "G9", "3L", "E5") ||
    hasName("Jazeera", "AirArabia", "Air Arabia")
  ) {
    return {
      key: "JAZEERA_AIR_ARABIA",
      label: "Jazeera / Air Arabia",
      lastNameLettersOnly: false,
      allowTitleInLastName: true,
      rejectDuplicateNames: false,
      isTruJet: false,
    };
  }

  const isTruJet = hasCode("2T") || hasName("TruJet", "TrueJet");

  if (
    isTruJet ||
    hasCode("B3", "KB", "LB", "ZO") ||
    hasName(
      "Bhutan Airlines",
      "Drukair",
      "Druk Air",
      "AirCosta",
      "Air Costa",
      "ZoomAir",
      "Zoom Air",
    )
  ) {
    return {
      key: "BHUTAN_AIRCOSTA_TRUJET_ZOOMAIR",
      label: "Bhutan / AirCosta / TruJet / ZoomAir",
      lastNameLettersOnly: true,
      allowTitleInLastName: false,
      rejectDuplicateNames: false,
      isTruJet,
    };
  }

  return {
    key: "OTHER",
    label: "Other airline / source",
    lastNameLettersOnly: false,
    allowTitleInLastName: false,
    rejectDuplicateNames: false,
    isTruJet: false,
  };
};

const getTitleOptions = (airlineProfile, paxType) => {
  if (!airlineProfile.isTruJet) return ALL_SOURCE_TITLES;

  return paxType === 1 ? TRUJET_ADULT_TITLES : TRUJET_CHILD_TITLES;
};

const getGenderFromTitle = (title, currentGender = "Male") => {
  const normalizedTitle = String(title || "").toUpperCase();

  if (["MRS", "MS", "MISS"].includes(normalizedTitle)) return "Female";
  if (["MR", "MSTR", "MASTER"].includes(normalizedTitle)) return "Male";

  return currentGender;
};

const createEmptyPassenger = (title = "Mr") => ({
  title,
  firstName: "",
  lastName: "",
  gender: getGenderFromTitle(title),
  dob: "",
  pan: "",
  passport: "",
  passportIssueDate: "",
  passportExpiry: "",
  nationality: "IN",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "India",
});


const toBool = (value) => {
  return value === true || String(value).toLowerCase() === "true";
};

const cleanNameForDuplicateCheck = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.\s]+/g, "");



const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const PassengerDetails = () => {
  const navigate = useNavigate();

  const {
    selectedFlight,
    selectedSeats,
    selectedBaggage,
    selectedMeals,
    passengerCount,
    traceId,
    resultIndex,
    fareQuote,
  } = useFlightStore();

  const totalPassengers = Math.max(1, Number(passengerCount) || 1);




  const fareQuoteResult =
    fareQuote?.data?.Response?.Results ||
    fareQuote?.Response?.Results ||
    fareQuote?.Results ||
    fareQuote ||
    {};

  const isGSTMandatory = toBool(
    fareQuoteResult?.IsGSTMandatory,
  );

  const isGSTAllowed =
    toBool(fareQuoteResult?.GSTAllowed) ||
    isGSTMandatory;

  const isPanRequiredAtBook = toBool(
    fareQuoteResult?.IsPanRequiredAtBook,
  );

  const isPanRequiredAtTicket = toBool(
    fareQuoteResult?.IsPanRequiredAtTicket,
  );

  const isPassportRequiredAtBook = toBool(
    fareQuoteResult?.IsPassportRequiredAtBook,
  );

  const isPassportRequiredAtTicket = toBool(
    fareQuoteResult?.IsPassportRequiredAtTicket,
  );

  // Passenger Details par field tabhi lenge
  // jab Book YA Ticket me required ho
  const isPanRequired =
    isPanRequiredAtBook || isPanRequiredAtTicket;

  const isPassportRequired =
    isPassportRequiredAtBook ||
    isPassportRequiredAtTicket;

  /* ---------------- SEGMENTS ---------------- */

  const segments = useMemo(() => {
    const rawSegments =
      selectedFlight?.segments || selectedFlight?.Segments || [];

    return Array.isArray(rawSegments) ? rawSegments.flat(Infinity) : [];
  }, [selectedFlight]);

  /* ---------------- AIRLINE RULES ---------------- */

  const airlineProfile = useMemo(
    () => getAirlineProfile(selectedFlight, segments),
    [selectedFlight, segments],
  );

  const passengerTypes = useMemo(
    () => buildPassengerTypes(selectedFlight, totalPassengers),
    [selectedFlight, totalPassengers],
  );

  /* ---------------- INITIAL STATE ---------------- */

  const [passengers, setPassengers] = useState(() =>
    Array.from({ length: totalPassengers }, (_, index) => {
      const titleOptions = getTitleOptions(
        airlineProfile,
        passengerTypes[index] || 1,
      );

      return createEmptyPassenger(titleOptions[0]);
    }),
  );



  const [gstDetails, setGstDetails] = useState({
    GSTNumber: "",
    GSTCompanyName: "",
    GSTCompanyEmail: "",
    GSTCompanyContactNumber: "",
    GSTCompanyAddress: "",
  });

  /* ---------------- KEEP PASSENGER COUNT IN SYNC ---------------- */

  useEffect(() => {
    setPassengers((previousPassengers) =>
      Array.from({ length: totalPassengers }, (_, index) => {
        if (previousPassengers[index]) return previousPassengers[index];

        const titleOptions = getTitleOptions(
          airlineProfile,
          passengerTypes[index] || 1,
        );

        return createEmptyPassenger(titleOptions[0]);
      }),
    );
  }, [totalPassengers, airlineProfile, passengerTypes]);

  /* ---------------- KEEP TITLES VALID FOR AIRLINE/PAX TYPE ---------------- */

  useEffect(() => {
    setPassengers((previousPassengers) =>
      previousPassengers.map((passenger, index) => {
        const allowedTitles = getTitleOptions(
          airlineProfile,
          passengerTypes[index] || 1,
        );

        if (allowedTitles.includes(passenger.title)) return passenger;

        const nextTitle = allowedTitles[0];

        return {
          ...passenger,
          title: nextTitle,
          gender: getGenderFromTitle(nextTitle, passenger.gender),
        };
      }),
    );
  }, [airlineProfile, passengerTypes]);

  /* ---------------- HANDLE CHANGE ---------------- */

  const handleChange = (index, event) => {
    const { name, value } = event.target;

    setPassengers((previousPassengers) => {
      const updatedPassengers = [...previousPassengers];
      const currentPassenger = updatedPassengers[index];

      let nextValue = value;

      if (name === "passport") {
        const cleaned = value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        if (!cleaned) {
          nextValue = "";
        } else {
          // Passport must start with 1 or 2 letters
          const letters =
            cleaned.match(/^[A-Z]{1,2}/)?.[0] || "";

          if (!letters) {
            nextValue = "";
          } else {
            // After letters only numbers are allowed
            const digits = cleaned
              .slice(letters.length)
              .replace(/\D/g, "");

            // Old passport: 1 letter + 7 digits
            // New format: 2 letters + 6 digits
            const maxDigits =
              letters.length === 2 ? 6 : 7;

            nextValue =
              letters + digits.slice(0, maxDigits);
          }
        }
      }

      if (name === "phone") {
        nextValue = value
          .replace(/\D/g, "")
          .slice(0, 10);
      }
      if (name === "pan") {
        nextValue = value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 10);
      }

      updatedPassengers[index] = {
        ...currentPassenger,
        [name]: nextValue,
        ...(name === "title"
          ? {
            gender: getGenderFromTitle(nextValue, currentPassenger.gender),
          }
          : {}),
      };

      return updatedPassengers;
    });
  };



  const handleGSTChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === "GSTNumber") {
      nextValue = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 15);
    }

    if (name === "GSTCompanyContactNumber") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    setGstDetails((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  /* ---------------- COUNTRY HELPER ---------------- */

  const getCountry = (segment, type) => {
    return (
      segment?.[type]?.CountryCode ||
      segment?.[type]?.Airport?.CountryCode ||
      segment?.[type]?.Airport?.Country?.CountryCode ||
      null
    );
  };

  /* ---------------- INTERNATIONAL CHECK ---------------- */

  const isInternational = useMemo(() => {
    if (!segments.length) return false;

    return segments.some((segment) => {
      const originCountry = getCountry(segment, "Origin");
      const destinationCountry = getCountry(segment, "Destination");

      if (!originCountry || !destinationCountry) return false;

      return originCountry !== destinationCountry;
    });
  }, [segments]);

  /* ---------------- DEBUG ---------------- */

  useEffect(() => {
    console.log("Airline name validation profile:", airlineProfile);

    console.log(
      "Segments Debug:",
      segments.map((segment) => ({
        from: segment?.Origin?.AirportCode,
        to: segment?.Destination?.AirportCode,
        fromCountry: getCountry(segment, "Origin"),
        toCountry: getCountry(segment, "Destination"),
      })),
    );

    console.log("isInternational:", isInternational);
  }, [airlineProfile, segments, isInternational]);

  /* ---------------- CLEAR PASSPORT FOR DOMESTIC ---------------- */

  /* ---------------- CLEAR UNUSED PAN / PASSPORT ---------------- */

  useEffect(() => {
    setPassengers((previousPassengers) =>
      previousPassengers.map((passenger) => ({
        ...passenger,

        ...(isPanRequired
          ? {}
          : {
            pan: "",
          }),

        ...(isPassportRequired
          ? {}
          : {
            passport: "",
            passportIssueDate: "",
            passportExpiry: "",
          }),
      })),
    );
  }, [isPanRequired, isPassportRequired]);

  /* ---------------- NAME VALIDATION ---------------- */

  const validatePassengerName = (passenger, passengerIndex) => {
    const passengerNumber = passengerIndex + 1;
    const firstName = passenger.firstName.trim();
    const lastName = passenger.lastName.trim();

    if (!firstName || !lastName) {
      alert(
        `Passenger ${passengerNumber}: First Name and Last Name are required`,
      );
      return false;
    }

    if (!/^[A-Za-z .]+$/.test(firstName) || !/[A-Za-z]/.test(firstName)) {
      alert(
        `Passenger ${passengerNumber}: First Name can contain only A-Z letters, spaces and dots`,
      );
      return false;
    }

    if (firstName.startsWith(".")) {
      alert(`Passenger ${passengerNumber}: First Name cannot start with a dot`);
      return false;
    }

    if (
      !airlineProfile.allowTitleInLastName &&
      FORBIDDEN_LAST_NAME_TITLE_REGEX.test(lastName)
    ) {
      alert(
        `Passenger ${passengerNumber}: Do not add a title such as Mr., Mrs., Ms., Miss or Dr. in Last Name`,
      );
      return false;
    }

    if (airlineProfile.lastNameLettersOnly) {
      if (!/^[A-Za-z]+$/.test(lastName)) {
        alert(
          `Passenger ${passengerNumber}: For ${airlineProfile.label}, Last Name can contain only A-Z letters. Spaces and dots are not allowed`,
        );
        return false;
      }
    } else {
      if (!/^[A-Za-z .]+$/.test(lastName) || !/[A-Za-z]/.test(lastName)) {
        alert(
          `Passenger ${passengerNumber}: Last Name can contain only A-Z letters, spaces and dots`,
        );
        return false;
      }

      if (lastName.startsWith(".")) {
        alert(
          `Passenger ${passengerNumber}: Last Name cannot start with a dot`,
        );
        return false;
      }
    }

    return true;
  };


  const validateGSTDetails = () => {
    if (!isGSTAllowed) {
      return true;
    }

    const {
      GSTNumber,
      GSTCompanyName,
      GSTCompanyEmail,
      GSTCompanyContactNumber,
      GSTCompanyAddress,
    } = gstDetails;

    const hasAnyGSTDetail =
      GSTNumber.trim() ||
      GSTCompanyName.trim() ||
      GSTCompanyEmail.trim() ||
      GSTCompanyContactNumber.trim() ||
      GSTCompanyAddress.trim();

    // Optional GST and user filled nothing
    if (!isGSTMandatory && !hasAnyGSTDetail) {
      return true;
    }

    // Mandatory OR user started entering GST
    if (
      !GSTNumber.trim() ||
      !GSTCompanyName.trim() ||
      !GSTCompanyEmail.trim() ||
      !GSTCompanyContactNumber.trim() ||
      !GSTCompanyAddress.trim()
    ) {
      alert("Please fill all GST details.");
      return false;
    }

    if (!GST_REGEX.test(GSTNumber.trim().toUpperCase())) {
      alert("Please enter a valid 15-character GST number.");
      return false;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(GSTCompanyEmail.trim())) {
      alert("Please enter a valid GST company email.");
      return false;
    }

    if (
      !/^[0-9]{10}$/.test(
        GSTCompanyContactNumber.trim(),
      )
    ) {
      alert(
        "GST company contact number must be 10 digits.",
      );
      return false;
    }

    return true;
  };

  /* ---------------- COMPLETE VALIDATION ---------------- */

  const validatePassengers = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const passportRegex =
      /^(?:[A-Z][0-9]{7}|[A-Z]{2}[0-9]{6})$/;
    const duplicateNameMap = new Map();

    for (let index = 0; index < passengers.length; index += 1) {
      const passenger = passengers[index];
      const passengerNumber = index + 1;
      const paxType = passengerTypes[index] || 1;
      const allowedTitles = getTitleOptions(airlineProfile, paxType);

      if (!allowedTitles.includes(passenger.title)) {
        alert(
          `Passenger ${passengerNumber}: Invalid title for ${PAX_TYPE_LABELS[paxType] || "Passenger"
          } on ${airlineProfile.label}`,
        );
        return false;
      }

      if (!validatePassengerName(passenger, index)) return false;

      if (airlineProfile.rejectDuplicateNames) {
        const duplicateKey = `${cleanNameForDuplicateCheck(
          passenger.firstName,
        )}|${cleanNameForDuplicateCheck(passenger.lastName)}`;

        if (duplicateNameMap.has(duplicateKey)) {
          const previousPassengerNumber = duplicateNameMap.get(duplicateKey);

          alert(
            `SpiceJet does not allow duplicate passenger names. Passenger ${previousPassengerNumber} and Passenger ${passengerNumber} have the same name`,
          );
          return false;
        }

        duplicateNameMap.set(duplicateKey, passengerNumber);
      }

      if (!emailRegex.test(passenger.email.trim())) {
        alert(`Passenger ${passengerNumber}: Invalid email format`);
        return false;
      }

      if (!phoneRegex.test(passenger.phone.trim())) {
        alert(`Passenger ${passengerNumber}: Phone must be 10 digits`);
        return false;
      }


      if (isPanRequired) {
        if (!passenger.pan?.trim()) {
          alert(
            `Passenger ${passengerNumber}: PAN is required for this flight`,
          );
          return false;
        }

        if (!panRegex.test(passenger.pan.trim().toUpperCase())) {
          alert(
            `Passenger ${passengerNumber}: Invalid PAN format. Example: ABCDE1234F`,
          );
          return false;
        }
      }

      if (!passenger.address.trim() || !passenger.city.trim()) {
        alert(`Passenger ${passengerNumber}: Address and City are required`);
        return false;
      }

      /* -------- INTERNATIONAL -------- */

      /* -------- PASSPORT REQUIRED BY FARE QUOTE -------- */

      if (isPassportRequired) {
        if (
          !passenger.passport ||
          !passenger.passportIssueDate ||
          !passenger.passportExpiry
        ) {
          alert(
            `Passenger ${passengerNumber}: Passport details are required for this flight`,
          );
          return false;
        }

        if (
          !passportRegex.test(
            passenger.passport.trim().toUpperCase(),
          )
        ) {
          alert(
            `Passenger ${passengerNumber}: Invalid passport format`,
          );
          return false;
        }

        const expiry = new Date(passenger.passportExpiry);
        const today = new Date();

        const sixMonthsLater = new Date(today);
        sixMonthsLater.setMonth(
          sixMonthsLater.getMonth() + 6,
        );

        if (expiry < sixMonthsLater) {
          alert(
            `Passenger ${passengerNumber}: Passport must be valid for at least 6 months`,
          );
          return false;
        }
      }
    }

    return true;
  };

  /* ---------------- CONTINUE ---------------- */

  const formatDate = (date) =>
    date ? new Date(`${date}T00:00:00.000Z`).toISOString() : "";

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ");

  const handleContinue = () => {
    if (!validatePassengers()) return;

    if (!validateGSTDetails()) return;
    if (!selectedFlight) {
      alert("Selected flight data is missing. Please search the flight again.");
      navigate("/");
      return;
    }

    if (!fareQuote) {
      alert("Fare quote data is missing. Please search the flight again.");
      navigate("/");
      return;
    }

    if (!traceId || resultIndex === null || resultIndex === undefined) {
      alert("Flight session data is missing. Please search the flight again.");
      navigate("/");
      return;
    }

    const normalizedPassengers = passengers.map((passenger, index) => ({
      ...passenger,

      // ✅ Save actual passenger type
      paxType: passengerTypes[index] || 1,

      firstName: normalizeText(passenger.firstName),
      lastName: normalizeText(passenger.lastName),
      pan: passenger.pan.trim().toUpperCase(),
      email: passenger.email.trim(),
      phone: passenger.phone.trim(),
      address: normalizeText(passenger.address),
      city: normalizeText(passenger.city),
      country: normalizeText(passenger.country),
      nationality: passenger.nationality.trim().toUpperCase(),
      passport: passenger.passport.trim().toUpperCase(),
      dob: formatDate(passenger.dob),
      passportIssueDate: formatDate(passenger.passportIssueDate),
      passportExpiry: formatDate(passenger.passportExpiry),
    }));

    const hasGSTDetails = Boolean(
      gstDetails.GSTNumber.trim() ||
      gstDetails.GSTCompanyName.trim() ||
      gstDetails.GSTCompanyEmail.trim() ||
      gstDetails.GSTCompanyContactNumber.trim() ||
      gstDetails.GSTCompanyAddress.trim()
    );

    const normalizedGSTDetails =
      isGSTAllowed && hasGSTDetails
        ? {
          GSTNumber: gstDetails.GSTNumber.trim().toUpperCase(),
          GSTCompanyName: normalizeText(gstDetails.GSTCompanyName),
          GSTCompanyEmail: gstDetails.GSTCompanyEmail.trim(),
          GSTCompanyContactNumber:
            gstDetails.GSTCompanyContactNumber.trim(),
          GSTCompanyAddress: normalizeText(
            gstDetails.GSTCompanyAddress
          ),
        }
        : null;

    localStorage.setItem(
      "bookingData",
      JSON.stringify({
        passengers: normalizedPassengers,
        selectedSeats,
        selectedMeals,
        selectedBaggage,
        selectedFlight,
        traceId,
        resultIndex,
        fareQuote,

        gstDetails: normalizedGSTDetails,

        isGSTMandatory,
        isGSTAllowed,
      }),
    );

    navigate("/review-booking", {
      state: {
        passengers: normalizedPassengers,
        selectedBaggage,
        selectedSeats,
        selectedMeals,
        selectedFlight,
        traceId,
        resultIndex,
        fareQuote,

        gstDetails: normalizedGSTDetails,

        isGSTMandatory,
        isGSTAllowed,
      },
    });
  };

  const inputStyle =
    "w-full border border-gray-300 rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const lastNameHelpText = airlineProfile.lastNameLettersOnly
    ? "Only A-Z letters are allowed. Spaces, dots and titles are not allowed."
    : airlineProfile.allowTitleInLastName
      ? "A-Z letters, spaces, dots and titles are allowed. The name cannot start with a dot."
      : "A-Z letters, spaces and dots are allowed. Titles are not allowed, and the name cannot start with a dot.";

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <div className="max-w-5xl mx-auto px-4 pt-28">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
          Passenger Details
        </h2>

        <p className="text-gray-500 text-sm mt-1">Enter traveler information</p>

        <p className="text-xs mt-2 text-blue-500">
          {isInternational ? "International Flight ✈️" : "Domestic Flight 🇮🇳"}
        </p>

        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <p className="font-semibold">Name rules: {airlineProfile.label}</p>
          <p className="mt-1">
            First Name: A-Z letters, spaces and dots are allowed. It cannot
            start with a dot.
          </p>
          <p className="mt-1">Last Name: {lastNameHelpText}</p>
          {airlineProfile.rejectDuplicateNames && (
            <p className="mt-1 font-medium">
              Duplicate passenger names are not allowed for SpiceJet.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {passengers.map((passenger, index) => {
          const paxType = passengerTypes[index] || 1;
          const titleOptions = getTitleOptions(airlineProfile, paxType);

          return (
            <div
              key={index}
              className="bg-white shadow-sm rounded-xl p-5 md:p-8 mb-6"
            >
              <h3 className="text-lg font-semibold mb-4">
                Passenger {index + 1}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({PAX_TYPE_LABELS[paxType] || "Adult"})
                </span>
                {selectedSeats?.[index] && (
                  <span className="text-sm text-blue-600 ml-2">
                    (Seat {selectedSeats[index].Code})
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <select
                    name="title"
                    value={passenger.title}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  >
                    {titleOptions.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <select
                    name="gender"
                    value={passenger.gender}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <input
                    name="firstName"
                    value={passenger.firstName}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                    placeholder="Enter first name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Letters, spaces and dots only. Cannot start with a dot.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <input
                    name="lastName"
                    value={passenger.lastName}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                    placeholder="Enter last name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {lastNameHelpText}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={passenger.dob}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Nationality</label>
                  <input
                    name="nationality"
                    value={passenger.nationality}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>



                {isPanRequired && (
                  <div>
                    <label className="text-sm font-medium">
                      PAN Number *
                    </label>

                    <input
                      name="pan"
                      value={passenger.pan}
                      onChange={(event) => handleChange(index, event)}
                      maxLength={10}
                      autoCapitalize="characters"
                      placeholder="ABCDE1234F"
                      className={inputStyle}
                    />
                  </div>
                )}

                {isPassportRequired && (

                  <>
                    <div>
                      <label className="text-sm font-medium">
                        Passport Number *
                      </label>
                      <input
                        name="passport"
                        value={passenger.passport}
                        onChange={(event) => handleChange(index, event)}
                        maxLength={8}
                        autoCapitalize="characters"
                        placeholder="A1234567 or AB123456"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Passport Issue Date *
                      </label>
                      <input
                        type="date"
                        name="passportIssueDate"
                        value={passenger.passportIssueDate}
                        onChange={(event) => handleChange(index, event)}
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Passport Expiry *
                      </label>
                      <input
                        type="date"
                        name="passportExpiry"
                        value={passenger.passportExpiry}
                        onChange={(event) => handleChange(index, event)}
                        className={inputStyle}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={passenger.email}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="phone"
                    value={passenger.phone}
                    onChange={(event) => handleChange(index, event)}
                    maxLength={10}
                    autoComplete="tel"
                    className={inputStyle}
                    placeholder="Enter 10 digit mobile number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Address *</label>
                  <input
                    name="address"
                    value={passenger.address}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">City *</label>
                  <input
                    name="city"
                    value={passenger.city}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Country</label>
                  <input
                    name="country"
                    value={passenger.country}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>





      {isGSTAllowed && (
        <div className="max-w-5xl mx-auto px-4 mt-2 mb-6">
          <div className="bg-white shadow-sm rounded-xl p-5 md:p-8 border border-gray-200">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  GST Details
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  {isGSTMandatory
                    ? "GST details are mandatory for this booking."
                    : "GST details are optional for this booking."}
                </p>
              </div>

              {isGSTMandatory && (
                <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                  Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* GST NUMBER */}
              <div>
                <label className="text-sm font-medium">
                  GST/UIN Number
                  {isGSTMandatory && " *"}
                </label>

                <input
                  type="text"
                  name="GSTNumber"
                  value={gstDetails.GSTNumber}
                  onChange={handleGSTChange}
                  maxLength={15}
                  autoCapitalize="characters"
                  className={inputStyle}
                  placeholder="Enter GST number"
                />
              </div>

              {/* COMPANY NAME */}
              <div>
                <label className="text-sm font-medium">
                  GST Company Name
                  {isGSTMandatory && " *"}
                </label>

                <input
                  type="text"
                  name="GSTCompanyName"
                  value={gstDetails.GSTCompanyName}
                  onChange={handleGSTChange}
                  className={inputStyle}
                  placeholder="Enter company name"
                />
              </div>

              {/* COMPANY EMAIL */}
              <div>
                <label className="text-sm font-medium">
                  GST Company Email
                  {isGSTMandatory && " *"}
                </label>

                <input
                  type="email"
                  name="GSTCompanyEmail"
                  value={gstDetails.GSTCompanyEmail}
                  onChange={handleGSTChange}
                  className={inputStyle}
                  placeholder="Enter company email"
                />
              </div>

              {/* COMPANY CONTACT */}
              <div>
                <label className="text-sm font-medium">
                  GST Company Contact No
                  {isGSTMandatory && " *"}
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  name="GSTCompanyContactNumber"
                  value={
                    gstDetails.GSTCompanyContactNumber
                  }
                  onChange={handleGSTChange}
                  maxLength={10}
                  className={inputStyle}
                  placeholder="Enter 10 digit number"
                />
              </div>

              {/* COMPANY ADDRESS */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium">
                  GST Company Address
                  {isGSTMandatory && " *"}
                </label>

                <input
                  type="text"
                  name="GSTCompanyAddress"
                  value={gstDetails.GSTCompanyAddress}
                  onChange={handleGSTChange}
                  className={inputStyle}
                  placeholder="Enter company address"
                />
              </div>

            </div>

            {!isGSTMandatory && (
              <p className="mt-4 text-xs text-gray-500">
                Fill GST details only if you want GST
                information associated with this booking.
              </p>
            )}

          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
        <div className="max-w-5xl mx-auto flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg"
          >
            Continue to Review
          </button>
        </div>
      </div>

    </div>
  );
};

export default PassengerDetails;
