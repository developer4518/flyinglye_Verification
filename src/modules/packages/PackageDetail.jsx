import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { privateApi, publicApi } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useAuthStore } from "../../store/authStore";
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  CalendarDays,
  Building2,
  Camera,
  Car,
  ShieldCheck,
  Tag,
  Headphones,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Phone,
  Plane,
  MessageCircle,
  ChevronDown,
  Send,
  Sparkles,
  BadgePercent,
  MapPin,
  Hotel,
  Landmark,
  Wallet,
  Clock3,
  Award,
  Navigation,
} from "lucide-react";

const fetchPackage = async (slug) => {
  const res = await publicApi.get(`/api/package/packages/${slug}/`);
  return res.data?.data || res.data;
};

const formatPrice = (price) => {
  const value = Number(price) || 0;
  return value.toLocaleString("en-IN");
};

const splitLines = (text = "") => {
  return String(text)
    .split(/\r?\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.toLowerCase() !== "n.a.");
};

const parseItinerary = (text = "") => {
  if (!text || text === "N.A.") return [];

  const cleanText = String(text).replace(/\r/g, "").trim();

  const parts = cleanText
    .split(/(?=Day\s*\d+\s*:)/gi)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length) {
    return parts.map((item, index) => {
      const titleMatch = item.match(/^(Day\s*\d+\s*:?[^\n]*)/i);
      const title = titleMatch ? titleMatch[1].trim() : `Day ${index + 1}`;
      const description = item.replace(title, "").trim();

      return {
        day: index + 1,
        title,
        description,
      };
    });
  }

  return splitLines(text).map((item, index) => ({
    day: index + 1,
    title: `Day ${index + 1}`,
    description: item,
  }));
};

const PackageDetails = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const token = useAuthStore((state) => state.token);

  const [activeTab, setActiveTab] = useState("overview");
  const [openBookingForm, setOpenBookingForm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    adults: 1,
    children: 0,
    date: "",
    budget: "",
    request: "",
  });

  const {
    data: pkg = null,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["package", slug],
    queryFn: () => fetchPackage(slug),
    enabled: !!slug,
  });

  const images = pkg?.images || [];
  const heroImage = images?.[0]?.image || "/images/package-placeholder.jpg";

  const packageTitle = pkg?.tour_name || pkg?.title || "Holiday Package";
  const destination = pkg?.Country_City_Multicity || "India";
  const destinationName = destination.split(",")[0]?.trim() || "Dream";
  const rating = Number(pkg?.rating) || 4.8;

  const shortDescription =
    pkg?.seo_description && pkg.seo_description !== "N.A."
      ? pkg.seo_description
      : pkg?.description;

  const itineraryDays = useMemo(() => parseItinerary(pkg?.Itinery), [pkg]);
  const inclusions = useMemo(() => splitLines(pkg?.Inclusion), [pkg]);
  const exclusions = useMemo(() => splitLines(pkg?.Exclusion), [pkg]);

  const pricePerPerson = Number(pkg?.price) || 0;
  const totalPassengers = Math.max(
    1,
    Number(formData.adults) + Number(formData.children),
  );
  const totalPrice = pricePerPerson * totalPassengers;

  const handleBookClick = () => {
    if (!token) {
      navigate("/login", {
        state: { redirectTo: `/packages/${slug}`, openBooking: true },
      });
      return;
    }

    setOpenBookingForm(true);
  };

  const handleWhatsappInquiry = () => {
    const message = `Hello FlyingLyte, I want to enquire about this package:

Package: ${packageTitle}
Destination: ${destination}
Duration: ${pkg?.days} Days / ${pkg?.Number_of_nights} Nights
Price: ₹${formatPrice(pkg?.price)} per person

Please share more details.`;

    const phoneNumber = "919667455591";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`;

    window.open(url, "_blank");
  };

  const handleQuoteWhatsapp = () => {
    if (!formData.name || !formData.phone || !formData.date) {
      toast.error("Please fill name, phone and travel date");
      return;
    }

    const message = `Hello FlyingLyte, I want to get a quote for this package:

Package: ${packageTitle}
Destination: ${destination}
Duration: ${pkg?.days} Days / ${pkg?.Number_of_nights} Nights
Starting Price: ₹${formatPrice(pkg?.price)} per person

My Details:
Name: ${formData.name}
Phone: ${formData.phone}
Travel Date: ${formData.date}
Budget: ${formData.budget || "Not mentioned"}

Please share the best quote and itinerary.`;

    const phoneNumber = "919667455591";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message,
    )}`;

    window.open(url, "_blank");
  };

  const handleShare = async () => {
    const shareData = {
      title: packageTitle,
      text: pkg?.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Package link copied");
      }
    } catch {
      toast.error("Unable to share package");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const updateCount = (type, value) => {
    setFormData((prev) => ({
      ...prev,
      [type]:
        type === "adults"
          ? Math.max(1, Number(prev[type]) + value)
          : Math.max(0, Number(prev[type]) + value),
    }));
  };

  const createBooking = async (bookingData) => {
    const res = await privateApi.post(
      "/api/package/packages/book/",
      bookingData,
    );
    return res.data;
  };

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async (res) => {
      const booking = res.data;

      toast.success("Booking created. Redirecting to payment...");

      try {
        localStorage.setItem("packageBookingData", JSON.stringify(booking));

        const paymentPayload = {
          amount: String(Math.round(booking.total_price)),
          firstname: booking.customer?.name || formData.name,
          email: booking.customer?.email || formData.email,
          phone: booking.customer?.phone || formData.phone,
        };

        const paymentRes = await privateApi.post(
          "/payment/initiate/",
          paymentPayload,
        );

        if (typeof paymentRes.data === "string") {
          const container = document.createElement("div");
          container.innerHTML = paymentRes.data;
          container.style.display = "none";
          document.body.appendChild(container);

          const form = container.querySelector("#payuForm");

          if (form) {
            form.submit();
            return;
          }

          throw new Error("Payment form not found");
        }
      } catch (err) {
        console.log("PAYMENT ERROR:", err);
        toast.error("Payment initiation failed");
      }
    },
    onError: (err) => {
      console.log("BOOKING ERROR:", err);
      toast.error("Booking failed. Please try again.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.adults ||
      !formData.date
    ) {
      toast.error("Please fill required details");
      return;
    }

    if (!token) {
      toast.error("Please login to book package");
      navigate("/login", {
        state: { redirectTo: `/packages/${slug}`, openBooking: true },
      });
      return;
    }

    bookingMutation.mutate({
      package_id: pkg.id,
      package_name: packageTitle,
      travel_date: formData.date,
      adults: Number(formData.adults),
      children: Number(formData.children),
      total_passengers: totalPassengers,
      total_price: totalPrice,
      customer: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      request: formData.request,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full border-2 border-(--gold-main) border-t-transparent animate-spin" />
          <p className="text-gray-300">Loading package...</p>
        </div>
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex items-center justify-center text-red-400">
        Package not found
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "itinerary", label: "Itinerary" },
    { id: "inclusions", label: "Inclusions" },
    { id: "exclusions", label: "Exclusions" },
    { id: "gallery", label: "Gallery" },
  ];

  return (
    <div className="bg-(--bg-main) text-white min-h-screen pb-28 overflow-hidden">
      {/* HERO */}
      <section className="relative min-h-180 overflow-hidden">
        <img
          src={heroImage}
          alt={packageTitle}
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />

        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-linear-to-r from-[#03070d] via-[#07101acc] to-black/40" />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-(--bg-main)" />

        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-40 -right-32 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 pt-24 pb-16">
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={() => navigate("/packages")}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-5 py-2.5 text-sm transition backdrop-blur-md"
            >
              <ArrowLeft size={17} />
              Back to Packages
            </button>

            <div className="flex items-center gap-3">
              <button className="w-11 h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-(--gold-main) hover:scale-105 transition">
                <Heart size={21} />
              </button>

              <button
                onClick={handleShare}
                className="w-11 h-11 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-(--gold-main) hover:scale-105 transition"
              >
                <Share2 size={21} />
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="max-w-4xl"
            >
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-400/30 text-(--gold-main) px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
                  <Sparkles size={16} />
                  Best Selling Package
                </div>

                <div className="inline-flex items-center gap-2 bg-red-500/15 border border-red-400/30 text-red-200 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
                  <BadgePercent size={16} />
                  Limited Seats Available
                </div>

                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md">
                  <MapPin size={16} className="text-(--gold-main)" />
                  {destination}
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-(--font-hero) leading-[1.05] mb-5">
                {packageTitle}
              </h1>

              <p className="text-base md:text-xl text-gray-200 max-w-3xl leading-relaxed mb-7">
                {shortDescription}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mb-8">
                <HeroInfo
                  icon={<CalendarDays />}
                  title={`${pkg.days} Days`}
                  subtitle={`${pkg.Number_of_nights} Nights`}
                />
                <HeroInfo icon={<Hotel />} title="Hotels" subtitle="Included" />
                <HeroInfo
                  icon={<Landmark />}
                  title="Sightseeing"
                  subtitle="Included"
                />
                <HeroInfo
                  icon={<Car />}
                  title="Transfers"
                  subtitle="Included"
                />
              </div>

              <div className="bg-black/30 border border-white/15 rounded-3xl p-5 md:p-6 backdrop-blur-xl max-w-3xl mb-7">
                <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Starting From</p>

                    <div className="flex items-end gap-2">
                      <span className="text-4xl md:text-6xl font-black text-(--gold-main)">
                        ₹{formatPrice(pkg.price)}
                      </span>
                      <span className="text-gray-200 mb-2">/ Per Person</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        <Star
                          size={17}
                          fill="currentColor"
                          className="text-(--gold-main)"
                        />
                        {rating}/5 Rating
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Award size={17} className="text-(--gold-main)" />
                        Trusted by 1000+ Travelers
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 min-w-57.5">
                    <button
                      onClick={handleBookClick}
                      className="relative overflow-hidden bg-linear-to-r from-start to-end text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-[0_15px_40px_rgba(245,186,74,0.25)]"
                    >
                      <CalendarDays size={19} />
                      Book Now
                    </button>

                    <button
                      onClick={handleWhatsappInquiry}
                      className="bg-green-600/95 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition"
                    >
                      <MessageCircle size={19} />
                      WhatsApp Enquiry
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
                <TrustPill icon={<ShieldCheck />} title="Secure Booking" />
                <TrustPill icon={<Wallet />} title="Best Price" />
                <TrustPill icon={<Clock3 />} title="24/7 Support" />
                <TrustPill
                  icon={<SlidersHorizontal />}
                  title="Customize Trip"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 35 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65 }}
              className="hidden lg:block"
            >
              <div className="relative bg-black/55 backdrop-blur-2xl border border-white/15 rounded-[28px] p-6 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 blur-[70px] rounded-full" />

                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-(--gold-main) mb-4">
                    <Navigation size={26} />
                  </div>

                  <h3 className="text-2xl font-bold text-white">
                    Plan Your {destinationName} Trip
                  </h3>

                  <p className="text-gray-300 text-sm mt-1 mb-5">
                    Get a personalized itinerary and best quote from our travel
                    expert.
                  </p>

                  <div className="space-y-3">
                    <QuoteInput
                      name="name"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={handleChange}
                    />

                    <QuoteInput
                      name="phone"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleChange}
                    />

                    <QuoteInput
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                    />

                    <QuoteInput
                      name="budget"
                      placeholder="Your Budget (Optional)"
                      value={formData.budget}
                      onChange={handleChange}
                    />

                    <button
                      type="button"
                      onClick={handleQuoteWhatsapp}
                      className="w-full bg-linear-to-r from-start to-end text-black font-bold py-3.5 rounded-2xl hover:scale-[1.02] transition"
                    >
                      Get Best Quote
                    </button>

                    <button
                      type="button"
                      onClick={handleQuoteWhatsapp}
                      className="w-full border border-green-500/50 bg-green-500/10 text-green-300 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-500/15 transition"
                    >
                      <MessageCircle size={18} />
                      Send Quote on WhatsApp
                    </button>

                    <p className="text-xs text-gray-400 text-center pt-2">
                      Our expert will call you within a few minutes.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* MINI GALLERY */}
      <section className="max-w-7xl mx-auto px-4 mt-10 relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Trip Gallery
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Explore beautiful moments from this package
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className="hidden md:inline-flex items-center gap-2 border border-(--gold-main)/50 text-(--gold-main) px-4 py-2 rounded-full text-sm font-semibold hover:bg-(--gold-main) hover:text-black transition"
          >
            <Camera size={16} />
            View All
          </button>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {images.slice(0, 4).map((img, index) => (
              <motion.button
                key={img.id || index}
                type="button"
                onClick={() => setSelectedImage(img.image)}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="relative h-56 rounded-3xl overflow-hidden group border border-white/10 bg-black/30 shadow-xl"
              >
                <img
                  src={img.image}
                  alt={`Package ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                />

                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/25 to-transparent" />

                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 border border-white/15 backdrop-blur-md flex items-center justify-center text-(--gold-main)">
                  <Camera size={18} />
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-left">
                  <p className="text-white font-bold text-base">
                    {index === 0
                      ? "Destination View"
                      : index === 1
                        ? "Sightseeing"
                        : index === 2
                          ? "Tour Highlight"
                          : "Memorable Trip"}
                  </p>

                  <p className="text-xs text-gray-300 mt-1">
                    Click to preview image
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="bg-(--bg-card) border border-white/10 rounded-2xl p-8 text-center text-gray-400">
            No gallery images available.
          </div>
        )}
      </section>

      {/* FEATURE STRIP */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-(--bg-card) border border-white/10 rounded-2xl p-4">
          <FeatureCard
            icon={<Building2 />}
            title="Hotels Included"
            text="Comfortable stays with breakfast"
          />
          <FeatureCard
            icon={<Camera />}
            title="Sightseeing"
            text="All major attractions covered"
          />
          <FeatureCard
            icon={<Car />}
            title="Transfers"
            text="Airport/Railway pickup & drop"
          />
          <FeatureCard
            icon={<Headphones />}
            title="24/7 Support"
            text="We are with you every step"
          />
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="max-w-7xl mx-auto px-4 mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-8">
          <div className="bg-(--bg-card) border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex overflow-x-auto border-b border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-max px-5 py-4 text-sm md:text-base font-semibold transition ${
                    activeTab === tab.id
                      ? "text-(--gold-main) border-b-2 border-(--gold-main)"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 md:p-8">
              {activeTab === "overview" && (
                <div>
                  <h2 className="text-2xl font-(--font-heading) text-(--gold-main) mb-4">
                    Tour Overview
                  </h2>

                  <p className="text-gray-300 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="grid md:grid-cols-3 gap-4 mt-7">
                    <SmallBenefit
                      title="Customized Packages"
                      text="As per your needs"
                    />
                    <SmallBenefit
                      title="Flexible Travel Dates"
                      text="Travel anytime"
                    />
                    <SmallBenefit
                      title="Best Price Guarantee"
                      text="No hidden charges"
                    />
                  </div>
                </div>
              )}

              {activeTab === "itinerary" && (
                <div>
                  <h2 className="text-2xl font-(--font-heading) text-(--gold-main) mb-6">
                    Itinerary Highlights
                  </h2>

                  <div className="space-y-5">
                    {itineraryDays.map((item, index) => (
                      <div
                        key={index}
                        className="grid md:grid-cols-[90px_1fr] gap-4"
                      >
                        <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-center text-(--gold-main) font-bold h-fit">
                          Day {item.day}
                        </div>

                        <div>
                          <h3 className="font-semibold text-white mb-1">
                            {item.title}
                          </h3>
                          <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "inclusions" && (
                <ListSection
                  title="Package Inclusions"
                  items={inclusions}
                  type="include"
                />
              )}

              {activeTab === "exclusions" && (
                <ListSection
                  title="Package Exclusions"
                  items={exclusions}
                  type="exclude"
                />
              )}

              {activeTab === "gallery" && (
                <div>
                  <h2 className="text-2xl font-(--font-heading) text-(--gold-main) mb-6">
                    Gallery
                  </h2>

                  {images.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {images.map((img, index) => (
                        <button
                          key={img.id || index}
                          onClick={() => setSelectedImage(img.image)}
                          className="h-56 rounded-2xl overflow-hidden border border-white/10 bg-black/30"
                        >
                          <img
                            src={img.image}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-110 transition duration-500"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">
                      No gallery images available.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {pkg.faqs?.length > 0 && (
            <div className="bg-(--bg-card) border border-white/10 rounded-2xl p-6 md:p-8">
              <h2 className="text-2xl font-(--font-heading) text-(--gold-main) mb-6">
                Frequently Asked Questions
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {pkg.faqs.map((faq, index) => (
                  <div
                    key={faq.id || index}
                    className="bg-black/25 border border-white/10 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setOpenFaq(openFaq === index ? null : index)
                      }
                      className="w-full flex items-center justify-between gap-3 p-4 text-left"
                    >
                      <span className="font-semibold">{faq.question}</span>
                      <ChevronDown
                        size={18}
                        className={`transition ${
                          openFaq === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {openFaq === index && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 text-gray-300 text-sm overflow-hidden"
                        >
                          {faq.answer}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-(--bg-card) border border-white/10 rounded-2xl p-5">
            <TrustCard
              icon={<ShieldCheck />}
              title="100% Secure Booking"
              small="Payments are safe with us"
            />
            <TrustCard
              icon={<Tag />}
              title="Best Price Guarantee"
              small="Get the best prices always"
            />
            <TrustCard
              icon={<Headphones />}
              title="24/7 Customer Support"
              small="We are always here to help"
            />
            <TrustCard
              icon={<Send />}
              title="Easy & Fast Booking"
              small="Book in just a few minutes"
            />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="bg-(--bg-card) border border-white/10 rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-1">Starting From</p>
              <p className="text-4xl font-bold text-(--gold-main)">
                ₹{formatPrice(pkg.price)}
                <span className="text-base text-white font-normal">
                  {" "}
                  / Per Person
                </span>
              </p>

              <div className="space-y-3 mt-6">
                <button
                  onClick={handleBookClick}
                  className="w-full bg-linear-to-r from-start to-end text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <CalendarDays size={18} />
                  Book Now
                </button>

                <button
                  onClick={handleWhatsappInquiry}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Enquire Now
                </button>

                <button
                  onClick={handleBookClick}
                  className="w-full border border-(--gold-main) text-(--gold-main) font-bold py-4 rounded-xl"
                >
                  Customize This Trip
                </button>
              </div>
            </div>

            <div className="bg-(--bg-card) border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-(--gold-main) mb-4">
                Why Book With FlyingLyte?
              </h3>

              <div className="space-y-3 text-sm text-gray-300">
                <WhyPoint text="Personalized Travel Planning" />
                <WhyPoint text="Best Price & No Hidden Charges" />
                <WhyPoint text="Comfortable Stays" />
                <WhyPoint text="Experienced Travel Experts" />
                <WhyPoint text="24/7 Assistance During Trip" />
                <WhyPoint text="Trusted by Thousands of Travelers" />
              </div>
            </div>

            <div className="bg-(--bg-card) border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold mb-2">Trusted Travel Partner</h3>
              <div className="flex text-(--gold-main) gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={17} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-gray-300">
                4.8/5 based on our service quality
              </p>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-(--bg-main)/95 backdrop-blur-xl border-t border-white/10 p-3 lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleWhatsappInquiry}
            className="border border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 text-green-400 font-semibold"
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>

          <a
            href="tel:+919667455591"
            className="border border-white/10 rounded-xl py-3 flex items-center justify-center gap-2 text-(--gold-main) font-semibold"
          >
            <Phone size={18} />
            Call
          </a>

          <button
            onClick={handleBookClick}
            className="border border-(--gold-main) rounded-xl py-3 flex items-center justify-center gap-2 text-(--gold-main) font-semibold"
          >
            <Plane size={18} />
            Plan Trip
          </button>
        </div>
      </div>

      <AnimatePresence>
        {openBookingForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-end md:items-center p-3 md:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-(--bg-card) border border-white/10 w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4 md:p-6 sticky top-0 bg-(--bg-card) z-10">
                <h2 className="text-xl md:text-2xl font-(--font-heading) text-(--gold-main)">
                  Book Package
                </h2>

                <button
                  onClick={() => setOpenBookingForm(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-4 md:p-6 space-y-6">
                <div className="bg-black/30 border border-white/10 p-4 rounded-xl space-y-2 text-sm">
                  <p>
                    <span className="text-gray-400">Package:</span>{" "}
                    <span className="font-semibold">{packageTitle}</span>
                  </p>

                  <p>
                    <span className="text-gray-400">Destination:</span>{" "}
                    {destination}
                  </p>

                  <p>
                    <span className="text-gray-400">Duration:</span> {pkg.days}{" "}
                    Days / {pkg.Number_of_nights} Nights
                  </p>

                  <p>
                    <span className="text-gray-400">Price:</span>{" "}
                    <span className="text-(--gold-main) font-semibold">
                      ₹{formatPrice(pkg.price)} / person
                    </span>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <InputField
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                    />
                    <InputField
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <CounterBox
                      label="Adults"
                      value={formData.adults}
                      onMinus={() => updateCount("adults", -1)}
                      onPlus={() => updateCount("adults", 1)}
                    />
                    <CounterBox
                      label="Children"
                      value={formData.children}
                      onMinus={() => updateCount("children", -1)}
                      onPlus={() => updateCount("children", 1)}
                    />
                  </div>

                  <InputField
                    label="Travel Date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                  />

                  <div>
                    <label className="text-sm text-gray-400">
                      Special Requests
                    </label>
                    <textarea
                      name="request"
                      value={formData.request}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Optional message..."
                      className="w-full mt-1 p-3 rounded-lg bg-black/30 border border-white/10 focus:border-(--gold-main) outline-none"
                    />
                  </div>

                  <div className="bg-black/30 border border-white/10 p-4 rounded-xl text-sm space-y-2">
                    <p>
                      <span className="text-gray-400">Passengers:</span>{" "}
                      {totalPassengers}
                    </p>

                    <p>
                      <span className="text-gray-400">Price Per Person:</span> ₹
                      {formatPrice(pricePerPerson)}
                    </p>

                    <p className="text-lg font-bold text-(--gold-main)">
                      Total Price: ₹{formatPrice(totalPrice)}
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={bookingMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-linear-to-r from-start to-end text-black py-3 rounded-xl font-semibold w-full disabled:opacity-60"
                  >
                    {bookingMutation.isPending
                      ? "Processing..."
                      : "Confirm Booking"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center"
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 w-11 h-11 rounded-full text-white"
            >
              ✕
            </button>

            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              alt="Selected package"
              className="max-w-full max-h-[86vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HeroInfo = ({ icon, title, subtitle }) => (
  <div className="bg-black/35 backdrop-blur-xl border border-white/15 rounded-2xl p-4 hover:bg-white/10 transition group">
    <div className="text-(--gold-main) mb-3 group-hover:scale-110 transition [&>svg]:w-7 [&>svg]:h-7">
      {icon}
    </div>

    <p className="font-bold text-white">{title}</p>
    <p className="text-sm text-gray-300">{subtitle}</p>
  </div>
);

const TrustPill = ({ icon, title }) => (
  <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/12 transition">
    <div className="text-(--gold-main) shrink-0 [&>svg]:w-5 [&>svg]:h-5">
      {icon}
    </div>
    <p className="text-sm font-semibold">{title}</p>
  </div>
);

const TrustCard = ({ icon, title, small }) => (
  <div className="flex items-center gap-3">
    <div className="text-(--gold-main) shrink-0 [&>svg]:w-7 [&>svg]:h-7">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-sm md:text-base">{title}</p>
      {small && <p className="text-xs text-gray-400 mt-1">{small}</p>}
    </div>
  </div>
);

const FeatureCard = ({ icon, title, text }) => (
  <div className="flex gap-4 items-start p-3">
    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-(--gold-main) shrink-0 [&>svg]:w-6 [&>svg]:h-6">
      {icon}
    </div>
    <div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-gray-300 mt-1">{text}</p>
    </div>
  </div>
);

const SmallBenefit = ({ title, text }) => (
  <div className="bg-black/25 border border-white/10 rounded-xl p-4">
    <div className="flex items-center gap-2 text-(--gold-main) font-semibold">
      <CheckCircle2 size={18} />
      {title}
    </div>
    <p className="text-sm text-gray-300 mt-1">{text}</p>
  </div>
);

const ListSection = ({ title, items, type }) => (
  <div>
    <h2 className="text-2xl font-(--font-heading) text-(--gold-main) mb-6">
      {title}
    </h2>

    {items.length === 0 ? (
      <p className="text-gray-400">No details available.</p>
    ) : (
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-black/25 border border-white/10 rounded-xl p-4 flex gap-3"
          >
            {type === "include" ? (
              <CheckCircle2
                className="text-green-400 shrink-0 mt-0.5"
                size={18}
              />
            ) : (
              <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            )}

            <p className="text-gray-300 text-sm">{item}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

const WhyPoint = ({ text }) => (
  <p className="flex items-center gap-2">
    <CheckCircle2 className="text-green-400 shrink-0" size={17} />
    {text}
  </p>
);

const QuoteInput = ({ type = "text", name, value, onChange, placeholder }) => (
  <input
    type={type}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full bg-black/35 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-(--gold-main) text-sm"
  />
);

const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}) => (
  <div>
    <label className="text-sm text-gray-400">{label}</label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className="w-full mt-1 p-3 rounded-lg bg-black/30 border border-white/10 focus:border-(--gold-main) outline-none"
    />
  </div>
);

const CounterBox = ({ label, value, onMinus, onPlus }) => (
  <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={onMinus}
        className="w-8 h-8 rounded bg-white/10 hover:bg-white/15"
      >
        −
      </button>

      <button
        type="button"
        onClick={onPlus}
        className="w-8 h-8 rounded bg-(--gold-main) text-black font-bold"
      >
        +
      </button>
    </div>
  </div>
);

export default PackageDetails;
