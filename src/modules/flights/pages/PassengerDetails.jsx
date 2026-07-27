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

const cleanNameForDuplicateCheck = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.\s]+/g, "");

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
  } = useFlightStore();

  const totalPassengers = Math.max(1, Number(passengerCount) || 1);

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

      const nextValue =
        name === "passport" ? value.toUpperCase().replace(/\s/g, "") : value;

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

  useEffect(() => {
    if (!isInternational) {
      setPassengers((previousPassengers) =>
        previousPassengers.map((passenger) => ({
          ...passenger,
          passport: "",
          passportIssueDate: "",
          passportExpiry: "",
        })),
      );
    }
  }, [isInternational]);

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

  /* ---------------- COMPLETE VALIDATION ---------------- */

  const validatePassengers = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const passportRegex = /^[A-Z0-9]{6,9}$/;
    const duplicateNameMap = new Map();

    for (let index = 0; index < passengers.length; index += 1) {
      const passenger = passengers[index];
      const passengerNumber = index + 1;
      const paxType = passengerTypes[index] || 1;
      const allowedTitles = getTitleOptions(airlineProfile, paxType);

      if (!allowedTitles.includes(passenger.title)) {
        alert(
          `Passenger ${passengerNumber}: Invalid title for ${
            PAX_TYPE_LABELS[paxType] || "Passenger"
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

      if (!passenger.address.trim() || !passenger.city.trim()) {
        alert(`Passenger ${passengerNumber}: Address and City are required`);
        return false;
      }

      /* -------- INTERNATIONAL -------- */

      if (isInternational) {
        if (
          !passenger.passport ||
          !passenger.passportIssueDate ||
          !passenger.passportExpiry
        ) {
          alert(
            `Passenger ${passengerNumber}: Passport details are required for international travel`,
          );
          return false;
        }

        if (!passportRegex.test(passenger.passport.trim().toUpperCase())) {
          alert(`Passenger ${passengerNumber}: Invalid passport format`);
          return false;
        }

        const expiry = new Date(passenger.passportExpiry);
        const today = new Date();
        const sixMonthsLater = new Date(today);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        if (expiry < sixMonthsLater) {
          alert(
            `Passenger ${passengerNumber}: Passport must be valid for at least 6 months`,
          );
          return false;
        }
      } else {
        /* -------- DOMESTIC -------- */

        const hasAnyPassportDetail =
          passenger.passport ||
          passenger.passportIssueDate ||
          passenger.passportExpiry;

        if (
          hasAnyPassportDetail &&
          (!passenger.passport ||
            !passenger.passportIssueDate ||
            !passenger.passportExpiry)
        ) {
          alert(
            `Passenger ${passengerNumber}: Complete passport details or remove them`,
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

    const normalizedPassengers = passengers.map((passenger) => ({
      ...passenger,
      firstName: normalizeText(passenger.firstName),
      lastName: normalizeText(passenger.lastName),
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

                {isInternational && (
                  <>
                    <div>
                      <label className="text-sm font-medium">
                        Passport Number *
                      </label>
                      <input
                        name="passport"
                        value={passenger.passport}
                        onChange={(event) => handleChange(index, event)}
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
                    name="phone"
                    value={passenger.phone}
                    onChange={(event) => handleChange(index, event)}
                    className={inputStyle}
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
