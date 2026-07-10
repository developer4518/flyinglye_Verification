import { useEffect, useState } from "react";
import Tabs from "./Tabs";
import FlightsForm from "./FlightsForm";
import { useNavigate } from "react-router-dom";
import HotelsForm from "./HotelsForm";

const SearchBox = () => {
  const [activeTab, setActiveTab] = useState("flights");
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === "packages") {
      navigate("/packages");
    }
  }, [activeTab, navigate]);

  const renderForm = () => {
    switch (activeTab) {
      case "flights":
        return <FlightsForm />;

      case "hotels":
        return <HotelsForm />;

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto group">
      {/* Outer Glow Effect */}
      <div
        className="absolute -inset-px rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500"
        style={{
          background:
            "linear-gradient(90deg, var(--color-start), var(--color-end))",
        }}
      />

      {/* Main Card */}
      <div
        className="
          relative
          rounded-3xl
          p-4 md:p-8
          border
          backdrop-blur-2xl
          shadow-[0_20px_80px_rgba(0,0,0,0.6)]
          transition-all duration-500
          hover:-translate-y-1
        "
        style={{
          background: "rgba(18, 24, 33, 0.85)",
          borderColor: "var(--border-soft)",
          color: "var(--text-main)",
        }}
      >
        {/* Decorative Gold Highlight */}
        <div
          className="absolute top-0 right-0 w-36 h-32 rounded-full opacity-10 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-start), transparent 70%)",
          }}
        />

        {/* Heading */}
        <div className="mb-3">
          <h2
            className="text-2xl md:text-3xl tracking-wide"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--gold-main)",
            }}
          >
            Plan Your Journey
          </h2>
        </div>

        {/* Tabs */}
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Form Area */}
        <div className="mt-8 transition-all duration-500">{renderForm()}</div>
      </div>
    </div>
  );
};

export default SearchBox;
