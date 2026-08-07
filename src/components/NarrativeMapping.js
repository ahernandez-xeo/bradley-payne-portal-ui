import { useEffect, useMemo, useState } from "react";

import classes from "./NarrativeMapping.module.scss";
import SimpleRichTextEditor, { htmlToPlainText } from "./SimpleRichTextEditor";
import {
  fetchAdminDistricts,
  fetchDistrictBranding,
  fetchDistrictLocations,
  fetchLocationNarrative,
  saveDistrictBranding,
  saveLocationNarrative,
  uploadDistrictLogo,
  uploadLocationNarrativeImage,
} from "./ApiService";
import { prepareImageForUpload } from "../prepareImageUpload";

const DEFAULT_COLOR = "#e6b422";

const groupLocationsByType = (items) => {
  const groups = [];
  const indexByType = new Map();
  for (const item of items || []) {
    const locationName = (item.location || "").trim();
    if (!locationName) {
      continue;
    }
    const locationType = (item.location_type || "").trim() || "Other";
    if (!indexByType.has(locationType)) {
      indexByType.set(locationType, groups.length);
      groups.push({ locationType, locations: [] });
    }
    groups[indexByType.get(locationType)].locations.push({
      location: locationName,
      has_image: !!item.has_image,
      has_narrative: !!item.has_narrative,
    });
  }
  return groups;
};

const locationOptionLabel = (item) => {
  const missing = [];
  if (!item.has_image) {
    missing.push("image");
  }
  if (!item.has_narrative) {
    missing.push("text");
  }
  if (missing.length === 0) {
    return item.location;
  }
  return `${item.location} — missing ${missing.join(" & ")}`;
};

const patchLocationStatus = (list, locationName, patch) =>
  (list || []).map((item) =>
    item.location === locationName ? { ...item, ...patch } : item
  );

const NarrativeMapping = () => {
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState("");
  const [customColor, setCustomColor] = useState(DEFAULT_COLOR);
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [narrativeHtml, setNarrativeHtml] = useState("");
  const [narrativeText, setNarrativeText] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedDistrict = districts.find((d) => d.district_id === districtId);
  const locationGroups = useMemo(
    () => groupLocationsByType(locations),
    [locations]
  );
  const selectedLocationMeta = useMemo(
    () => locations.find((item) => item.location === location) || null,
    [locations, location]
  );
  const selectedMissingImage = selectedLocationMeta
    ? !selectedLocationMeta.has_image
    : !imageUrl;
  const selectedMissingNarrative = selectedLocationMeta
    ? !selectedLocationMeta.has_narrative
    : !htmlToPlainText(narrativeHtml || "").trim() &&
      !(narrativeText || "").trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAdminDistricts()
      .then((data) => {
        if (cancelled) return;
        const list = data.districts || [];
        setDistricts(list);
        setDistrictId((current) => current || list[0]?.district_id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!districtId) return undefined;
    let cancelled = false;
    setLoadingBranding(true);
    setLoadingLocations(true);
    setError("");
    setNotice("");
    setLocation("");
    setLocations([]);
    setImageUrl("");
    setNarrativeHtml("");
    setNarrativeText("");

    Promise.all([
      fetchDistrictBranding({ districtId }),
      fetchDistrictLocations(districtId),
    ])
      .then(([brandingData, locationsData]) => {
        if (cancelled) return;
        const branding = brandingData.branding || {};
        setCustomColor(branding.custom_color || DEFAULT_COLOR);
        setLogoUrl(branding.logo_url || "");
        const list = locationsData.locations || [];
        setLocations(list);
        setLocation(list[0]?.location || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingBranding(false);
          setLoadingLocations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  useEffect(() => {
    if (!districtId || !location) return undefined;
    let cancelled = false;
    setLoadingNarrative(true);
    setError("");
    fetchLocationNarrative(districtId, location)
      .then((data) => {
        if (cancelled) return;
        const narrative = data.narrative || {};
        const nextImage = narrative.image_url || "";
        const nextHtml = narrative.narrative_html || "";
        const nextText = narrative.narrative_text || "";
        setImageUrl(nextImage);
        setNarrativeHtml(nextHtml);
        setNarrativeText(nextText);
        setLocations((current) =>
          patchLocationStatus(current, location, {
            has_image: !!nextImage.trim(),
            has_narrative:
              !!htmlToPlainText(nextHtml).trim() || !!nextText.trim(),
          })
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingNarrative(false);
      });
    return () => {
      cancelled = true;
    };
  }, [districtId, location]);

  const handleSaveBranding = async (event) => {
    event.preventDefault();
    if (!districtId) return;
    setSavingBranding(true);
    setError("");
    setNotice("");
    try {
      const result = await saveDistrictBranding({
        district_id: districtId,
        custom_color: customColor,
        logo_url: logoUrl || undefined,
      });
      const branding = result.branding || {};
      setCustomColor(branding.custom_color || customColor);
      setLogoUrl(branding.logo_url || logoUrl);
      setNotice(
        `Branding saved for ${result.district_name || selectedDistrict?.district_name || "district"}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !districtId) return;

    setUploadingLogo(true);
    setError("");
    setNotice("");
    try {
      const { file: uploadFile, compressed } = await prepareImageForUpload(file);
      const result = await uploadDistrictLogo(districtId, uploadFile);
      const branding = result.branding || {};
      setLogoUrl(branding.logo_url || "");
      setNotice(
        compressed
          ? "Logo compressed under 200 KB, uploaded to Cloud Storage, and saved."
          : "Logo uploaded to Cloud Storage and saved."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleNarrativeChange = (html, plain) => {
    setNarrativeHtml(html);
    setNarrativeText(plain);
  };

  const handleSaveNarrative = async (event) => {
    event.preventDefault();
    if (!districtId || !location) return;
    setSavingNarrative(true);
    setError("");
    setNotice("");
    try {
      const plain = narrativeText || htmlToPlainText(narrativeHtml);
      const result = await saveLocationNarrative({
        district_id: districtId,
        location,
        image_url: imageUrl || undefined,
        narrative_html: narrativeHtml,
        narrative_text: plain,
      });
      const narrative = result.narrative || {};
      const nextImage = narrative.image_url || imageUrl;
      const nextHtml = narrative.narrative_html || narrativeHtml;
      const nextText = narrative.narrative_text || plain;
      setImageUrl(nextImage);
      setNarrativeHtml(nextHtml);
      setNarrativeText(nextText);
      setLocations((current) =>
        patchLocationStatus(current, location, {
          has_image: !!(nextImage || "").trim(),
          has_narrative:
            !!htmlToPlainText(nextHtml || "").trim() || !!(nextText || "").trim(),
        })
      );
      setNotice(`Narrative saved for ${location}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNarrative(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !districtId || !location) return;

    setUploadingImage(true);
    setError("");
    setNotice("");
    try {
      const { file: uploadFile, compressed } = await prepareImageForUpload(file);
      const result = await uploadLocationNarrativeImage(
        districtId,
        location,
        uploadFile
      );
      const narrative = result.narrative || {};
      const nextImage = narrative.image_url || "";
      setImageUrl(nextImage);
      setLocations((current) =>
        patchLocationStatus(current, location, {
          has_image: !!(nextImage || "").trim(),
        })
      );
      setNotice(
        compressed
          ? "Location image compressed under 200 KB, uploaded to Cloud Storage, and saved."
          : "Location image uploaded to Cloud Storage and saved."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className={classes.panel}>
      <div className={classes.panelHeader}>
        <div>
          <h2 className={classes.title}>Narrative Mapping</h2>
          <p className={classes.subtitle}>
            District branding and per-location narrative content.
          </p>
        </div>
      </div>

      {error && <div className={classes.error}>{error}</div>}
      {notice && <div className={classes.notice}>{notice}</div>}

      {loading ? (
        <div className={classes.placeholder}>Loading districts…</div>
      ) : (
        <>
          <label className={classes.field}>
            <span>School district</span>
            <select
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
              required
            >
              {districts.map((district) => (
                <option key={district.district_id} value={district.district_id}>
                  {district.district_name}
                </option>
              ))}
            </select>
          </label>

          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>District branding</h3>
            {loadingBranding ? (
              <div className={classes.placeholder}>Loading branding…</div>
            ) : (
              <form className={classes.form} onSubmit={handleSaveBranding}>
                <div className={classes.optionsGrid}>
                  <label className={classes.field}>
                    <span>Custom color</span>
                    <div className={classes.colorRow}>
                      <input
                        type="color"
                        value={customColor}
                        onChange={(event) => setCustomColor(event.target.value)}
                        aria-label="Pick brand color"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(event) => setCustomColor(event.target.value)}
                        pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                        required
                      />
                    </div>
                  </label>

                  <div className={classes.previewSwatch} style={{ background: customColor }}>
                    <span>Accent preview</span>
                  </div>
                </div>

                <div className={classes.logoSection}>
                  <div className={classes.field}>
                    <span>District logo</span>
                    <p className={classes.hint}>
                      Uploads to the <code>bp_portal_artifacts</code> bucket.
                    </p>
                    <label className={classes.uploadBtn}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleLogoChange}
                        disabled={uploadingLogo || !districtId}
                      />
                      {uploadingLogo ? "Uploading…" : "Upload logo"}
                    </label>
                  </div>

                  <div className={classes.logoPreview}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={`${selectedDistrict?.district_name || "District"} logo`}
                      />
                    ) : (
                      <div className={classes.logoEmpty}>No logo saved yet</div>
                    )}
                  </div>
                </div>

                <div className={classes.formActions}>
                  <button
                    type="submit"
                    className={classes.primaryBtn}
                    disabled={savingBranding || uploadingLogo || !districtId}
                  >
                    {savingBranding ? "Saving…" : "Save branding"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className={classes.section}>
            <h3 className={classes.sectionTitle}>Location narratives</h3>
            {loadingLocations ? (
              <div className={classes.placeholder}>Loading locations…</div>
            ) : locations.length === 0 ? (
              <div className={classes.placeholder}>
                No locations found in dim_locations for this district.
              </div>
            ) : (
              <form className={classes.form} onSubmit={handleSaveNarrative}>
                <label className={classes.field}>
                  <span>Location</span>
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                  >
                    {locationGroups.map((group) => (
                      <optgroup key={group.locationType} label={group.locationType}>
                        {group.locations.map((item) => (
                          <option
                            key={`${group.locationType}:${item.location}`}
                            value={item.location}
                          >
                            {locationOptionLabel(item)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                {(selectedMissingImage || selectedMissingNarrative) && (
                  <div className={classes.statusRow} aria-live="polite">
                    {selectedMissingImage && (
                      <span className={classes.statusChipMissing}>Missing image</span>
                    )}
                    {selectedMissingNarrative && (
                      <span className={classes.statusChipMissing}>Missing text</span>
                    )}
                    <span className={classes.statusHint}>
                      Complete both for this location.
                    </span>
                  </div>
                )}

                {loadingNarrative ? (
                  <div className={classes.placeholder}>Loading narrative…</div>
                ) : (
                  <>
                    <div className={classes.logoSection}>
                      <div className={classes.field}>
                        <span>
                          Location image
                          {selectedMissingImage ? (
                            <span className={classes.fieldBadgeMissing}>Missing</span>
                          ) : (
                            <span className={classes.fieldBadgeReady}>Saved</span>
                          )}
                        </span>
                        <p className={classes.hint}>
                          Uploads to <code>bp_portal_artifacts</code> under this
                          district/location.
                        </p>
                        <label className={classes.uploadBtn}>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={handleImageChange}
                            disabled={uploadingImage || !location}
                          />
                          {uploadingImage ? "Uploading…" : "Upload image"}
                        </label>
                      </div>
                      <div
                        className={`${classes.logoPreview} ${
                          selectedMissingImage ? classes.logoPreviewMissing : ""
                        }`}
                      >
                        {imageUrl ? (
                          <img src={imageUrl} alt={`${location} visual`} />
                        ) : (
                          <div className={classes.logoEmpty}>No image saved yet</div>
                        )}
                      </div>
                    </div>

                    <label className={classes.field}>
                      <span>
                        Narrative
                        {selectedMissingNarrative ? (
                          <span className={classes.fieldBadgeMissing}>Missing</span>
                        ) : (
                          <span className={classes.fieldBadgeReady}>Saved</span>
                        )}
                      </span>
                      <p className={classes.hint}>
                        Rich HTML is stored for display; plain text is saved
                        automatically as a fallback.
                      </p>
                      <SimpleRichTextEditor
                        value={narrativeHtml}
                        onChange={handleNarrativeChange}
                        disabled={savingNarrative || uploadingImage}
                      />
                    </label>

                    <label className={classes.field}>
                      <span>Plain text fallback</span>
                      <textarea
                        className={classes.plainText}
                        value={narrativeText}
                        onChange={(event) => setNarrativeText(event.target.value)}
                        rows={5}
                      />
                    </label>

                    <div className={classes.formActions}>
                      <button
                        type="submit"
                        className={classes.primaryBtn}
                        disabled={
                          savingNarrative || uploadingImage || !districtId || !location
                        }
                      >
                        {savingNarrative ? "Saving…" : "Save narrative"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default NarrativeMapping;
