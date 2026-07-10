const Tabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "flights", label: "Flights" },
    { id: "hotels", label: "Hotels" },
    { id: "packages", label: "Packages" },
  ];

  return (
    <div
      className="
        flex
        gap-4
        md:gap-6
        border-b
        pb-4
        overflow-x-auto
        scrollbar-hide
      "
      style={{ borderColor: "var(--border-soft)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="
              relative
              pb-2
              text-sm
              md:text-base
              font-semibold
              transition-all
              duration-300
              whitespace-nowrap
              cursor-pointer
            "
            style={{
              fontFamily: "var(--font-heading)",
              color: isActive ? "var(--gold-main)" : "var(--text-muted)",
            }}
          >
            {tab.label}

            {isActive && (
              <span
                className="absolute left-0 bottom-0 h-0.5 w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-start), var(--color-end))",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
