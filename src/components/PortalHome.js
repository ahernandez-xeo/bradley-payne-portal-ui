import classes from "./PortalHome.module.scss";

const SECTIONS = [
  {
    id: "capital-plan",
    title: "Capital Plan",
    description:
      "Explore the 10-year Capital Plan that shows what is needed, when it's needed, and how to fund it.",
    accent: "#1f6feb",
    active: true,
  },
  {
    id: "tif-cra",
    title: "TIF & CRA Tracking",
    description:
      "Monitor Tax Increment Financing districts and Community Reinvestment Area zones across the region.",
    accent: "#2ea44f",
    active: false,
  },
  {
    id: "debt-service",
    title: "Debt Service / Lease Purchase",
    description:
      "Track bond series, annual debt schedules, lease obligations, and refunding opportunities.",
    accent: "#8250df",
    active: false,
  },
  {
    id: "financial-demographics",
    title: "Financial Demographics",
    description:
      "Review enrollment trends, property valuations, ACFR data, and community financial indicators.",
    accent: "#bf8700",
    active: false,
  },
];

const PortalHome = ({
  clientName,
  clientLogoUrl,
  fallbackLogoUrl,
  heroImageUrl,
  onOpenCapitalPlan,
  onOpenAdmin,
  showAdmin,
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
              style={{ "--card-accent": section.accent }}
            >
              {!section.active && <span className={classes.soonBadge}>Coming Soon</span>}
              <div className={classes.cardIcon} aria-hidden="true" />
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
