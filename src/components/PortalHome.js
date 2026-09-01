import classes from "./PortalHome.module.scss";

const ICONS = {
  "capital-plan": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  ),
  "tif-cra": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3v15" />
      <path d="M15 6v15" />
    </svg>
  ),
  "debt-service": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
      <path d="M10 12h6M10 16h6M10 8h2" />
    </svg>
  ),
  "financial-demographics": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 4-6" />
    </svg>
  ),
};

// Accents are lightness steps off the active client accent so the home page
// re-themes with --client-accent instead of shipping a fixed palette.
const SECTIONS = [
  {
    id: "capital-plan",
    title: "Capital Plan",
    description:
      "Explore the 10-year Capital Plan that shows what is needed, when it's needed, and how to fund it.",
    accentMix: 100,
    active: true,
  },
  {
    id: "tif-cra",
    title: "TIF & CRA Tracking",
    description:
      "Monitor Tax Increment Financing districts and Community Reinvestment Area zones across the region.",
    accentMix: 78,
    active: false,
  },
  {
    id: "debt-service",
    title: "Debt Service / Lease Purchase",
    description:
      "Track bond series, annual debt schedules, lease obligations, and refunding opportunities.",
    accentMix: 58,
    active: false,
  },
  {
    id: "financial-demographics",
    title: "Financial Demographics",
    description:
      "Review enrollment trends, property valuations, ACFR data, and community financial indicators.",
    accentMix: 40,
    active: false,
  },
];

const cardAccent = (mix) =>
  mix >= 100
    ? "var(--client-accent)"
    : `color-mix(in srgb, var(--client-accent) ${mix}%, #4c545d)`;

const PortalHome = ({
  clientName,
  clientLogoUrl,
  fallbackLogoUrl,
  heroImageUrl,
  onOpenCapitalPlan,
  onOpenAdmin,
  showAdmin,
  districts = [],
  selectedDistrictId = "",
  onDistrictChange,
  districtSwitching = false,
  onLogout,
}) => {
  const handleLogoError = (event) => {
    if (fallbackLogoUrl) {
      event.target.src = fallbackLogoUrl;
    }
  };

  return (
    <div className={classes.home}>
      <header className={classes.topBar}>
        <div className={classes.brand}>
          <img
            className={classes.brandLogo}
            src={clientLogoUrl}
            alt={clientName}
            onError={handleLogoError}
          />
          <div className={classes.brandText}>
            <div className={classes.brandName}>{clientName}</div>
            <div className={classes.brandTagline}>Empower · Challenge · Support</div>
          </div>
        </div>
        <div className={classes.topBarActions}>
          {showAdmin && districts.length > 0 && (
            <label className={classes.clientSelect}>
              <span className={classes.clientSelectLabel}>Client</span>
              <select
                value={selectedDistrictId}
                onChange={(event) => onDistrictChange?.(event.target.value)}
                disabled={districtSwitching || !onDistrictChange}
                aria-label="Impersonate client district"
              >
                {districts.map((district) => (
                  <option key={district.district_id} value={district.district_id}>
                    {district.district_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showAdmin && (
            <button type="button" className={classes.adminBtn} onClick={onOpenAdmin}>
              Admin
            </button>
          )}
          <button type="button" className={classes.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <section
        className={classes.hero}
        style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined}
      >
        <div className={classes.heroScrim} />
        <div className={classes.heroContent}>
          <h1 className={classes.heroTitle}>Welcome to Your Advisory Portal</h1>
          <p className={classes.heroCopy}>
            Your financial planning data, debt obligations, and community analytics — all in
            one place. Because the best outcomes happen when we move forward together.
          </p>
        </div>
        <div className={classes.heroAccent} />
      </section>

      <section className={classes.cardsSection}>
        <div className={classes.cardsGrid}>
          {SECTIONS.map((section) => (
            <article
              key={section.id}
              className={`${classes.card} ${section.active ? classes.cardActive : classes.cardSoon}`}
              style={{ "--card-accent": cardAccent(section.accentMix) }}
            >
              {!section.active && <span className={classes.soonBadge}>Coming Soon</span>}
              <div className={classes.cardIcon} aria-hidden="true">
                {ICONS[section.id]}
              </div>
              <h2 className={classes.cardTitle}>{section.title}</h2>
              <p className={classes.cardCopy}>{section.description}</p>
              {section.active ? (
                <button
                  type="button"
                  className={classes.cardLink}
                  onClick={onOpenCapitalPlan}
                >
                  Open →
                </button>
              ) : (
                <span className={classes.cardLinkDisabled}>Open →</span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PortalHome;
