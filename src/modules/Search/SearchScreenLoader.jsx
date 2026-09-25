const SearchScreenLoader = ({ type = "flights" }) => {
  const isFlight = type === "flights";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col items-center px-6 text-center">
        {/* Loader */}
        <div className="relative w-20 h-20 mb-6">
          <div
            className="
              absolute inset-0
              rounded-full
              border-4
              border-white/10
              border-t-[#E6B35C]
              animate-spin
            "
          />

          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            {isFlight ? "✈️" : "🏨"}
          </div>
        </div>

        <h2
          className="text-xl md:text-2xl font-semibold text-[#E6B35C]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isFlight ? "Searching Flights" : "Searching Hotels"}
        </h2>

        <p className="mt-2 text-sm text-gray-300">
          {isFlight
            ? "Finding the best flights for your journey..."
            : "Finding the best hotels for your stay..."}
        </p>

        {/* Animated dots */}
        <div className="flex gap-2 mt-5">
          <span className="w-2 h-2 rounded-full bg-[#E6B35C] animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-[#E6B35C] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#E6B35C] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};

export default SearchScreenLoader;