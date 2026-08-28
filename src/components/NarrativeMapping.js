import { useEffect, useMemo, useState } from "react";

import classes from "./NarrativeMapping.module.scss";
import { htmlToPlainText } from "./SimpleRichTextEditor";
import {
  fetchAdminDistricts,
  fetchDistrictBranding,
  fetchDistrictLocations,
  fetchLocationNarrative,
  generateAllMissingNarratives,
  generateLocationNarrative,
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
      category: item.category || "",
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

const patchPairStatus = (list, categoryName, locationName, patch) =>
  (list || []).map((item) =>
    item.category === categoryName && item.location === locationName
      ? { ...item, ...patch }
      : item
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
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [narrativeText, setNarrativeText] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [savingNarrative, setSavingNarrative] = useState(false);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [generatingAllNarratives, setGeneratingAllNarratives] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedDistrict = districts.find((d) => d.district_id === districtId);

  const categories = useMemo(() => {
    const names = [];
    const seen = new Set();
    for (const item of locations) {
      const name = (item.category || "").trim();
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      names.push(name);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const locationsForCategory = useMemo(
    () => locations.filter((item) => item.category === category),
    [locations, category]
  );

  const locationGroups = useMemo(
    () => groupLocationsByType(locationsForCategory),
    [locationsForCategory]
  );

  const selectedLocationMeta = useMemo(
    () =>
      locations.find(
        (item) => item.category === category && item.location === location
      ) || null,
    [locations, category, location]
  );
  const selectedMissingImage = selectedLocationMeta
    ? !selectedLocationMeta.has_image
    : !imageUrl;
  const selectedMissingNarrative = selectedLocationMeta
    ? !selectedLocationMeta.has_narrative
    : !(narrativeText || "").trim();

  const missingNarrativeCount = useMemo(
    () => locations.filter((item) => !item.has_narrative).length,
    [locations]
  );

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
    setCategory("");
    setLocation("");
    setLocations([]);
    setImageUrl("");
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
        const firstCategory = list[0]?.category || "";
        setCategory(firstCategory);
        const firstLocation =
          list.find((item) => item.category === firstCategory)?.location ||
          list[0]?.location ||
          "";
        setLocation(firstLocation);
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
    if (!category) {
      setLocation("");
      return;
    }
    const stillValid = locations.some(
      (item) => item.category === category && item.location === location
    );
    if (stillValid) {
      return;
    }
    const nextLocation =
      locations.find((item) => item.category === category)?.location || "";
    setLocation(nextLocation);
  }, [category, locations, location]);

  useEffect(() => {
    if (!districtId || !category || !location) return undefined;
    let cancelled = false;
    setLoadingNarrative(true);
    setError("");
    fetchLocationNarrative(districtId, category, location)
      .then((data) => {
        if (cancelled) return;
        const narrative = data.narrative || {};
        const nextImage = narrative.image_url || "";
        const nextText =
          (narrative.narrative_text || "").trim() ||
          htmlToPlainText(narrative.narrative_html || "");
        setImageUrl(nextImage);
        setNarrativeText(nextText);
        setLocations((current) =>
          patchPairStatus(current, category, location, {
            has_image: !!nextImage.trim(),
            has_narrative: !!nextText.trim(),
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
  }, [districtId, category, location]);

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

  const handleSaveNarrative = async (event) => {
    event.preventDefault();
    if (!districtId || !category || !location) return;
    setSavingNarrative(true);
    setError("");
    setNotice("");
    try {
      const plain = (narrativeText || "").trim();
      const result = await saveLocationNarrative({
        district_id: districtId,
        category,
        location,
        image_url: imageUrl || undefined,
        narrative_html: "",
        narrative_text: plain,
      });
      const narrative = result.narrative || {};
      const nextImage = narrative.image_url || imageUrl;
      const nextText = narrative.narrative_text || plain;
      setImageUrl(nextImage);
      setNarrativeText(nextText);
      setLocations((current) =>
        patchPairStatus(current, category, location, {
          has_image: !!(nextImage || "").trim(),
          has_narrative: !!(nextText || "").trim(),
        })
      );
      setNotice(`Narrative saved for ${category} / ${location}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNarrative(false);
    }
  };

  const handleGenerateNarrative = async () => {
    if (!districtId || !category || !location) return;
    setGeneratingNarrative(true);
    setError("");
    setNotice("");
    try {
      const result = await generateLocationNarrative({
        district_id: districtId,
        category,
        location,
        district_name: selectedDistrict?.district_name || "",
        custom_instructions: customInstructions.trim() || undefined,
      });
      const draft = (result.narrative_text || "").trim();
      if (!draft) {
        throw new Error("AI returned an empty narrative.");
      }
      setNarrativeText(draft);
      setNotice(
        `Draft ready for ${category} / ${location}. Review the text, then save.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingNarrative(false);
    }
  };

  const handleGenerateAllNarratives = async () => {
    if (!districtId || generatingAllNarratives) return;
    if (missingNarrativeCount === 0) {
      setNotice("All category/location pairs already have narratives.");
      return;
    }
    const confirmed = window.confirm(
      `Fill and save narratives for ${missingNarrativeCount} missing ` +
        `category/location pair${missingNarrativeCount === 1 ? "" : "s"}?\n\n` +
        "Existing narratives will be skipped. This may take a few minutes."
    );
    if (!confirmed) return;

    setGeneratingAllNarratives(true);
    setError("");
    setNotice(
      `Generating ${missingNarrativeCount} missing narrative${
        missingNarrativeCount === 1 ? "" : "s"
      }… This can take a while.`
    );
    try {
      const result = await generateAllMissingNarratives({
        district_id: districtId,
        district_name: selectedDistrict?.district_name || "",
        custom_instructions: customInstructions.trim() || undefined,
      });
      const locationsData = await fetchDistrictLocations(districtId);
      setLocations(locationsData.locations || []);

      if (category && location) {
        const refreshed = await fetchLocationNarrative(
          districtId,
          category,
          location
        );
        const narrative = refreshed.narrative || {};
        setImageUrl(narrative.image_url || "");
        setNarrativeText(
          (narrative.narrative_text || "").trim() ||
            htmlToPlainText(narrative.narrative_html || "")
        );
      }

      const generated = result.generated || 0;
      const skipped = result.skipped_existing || 0;
      const failed = result.failed || 0;
      const failureHint =
        failed > 0
          ? ` ${failed} failed${
              result.failures?.[0]?.error
                ? ` (e.g. ${result.failures[0].category} / ${result.failures[0].location}: ${result.failures[0].error})`
                : ""
            }.`
          : "";
      setNotice(
        `Bulk generate finished: ${generated} saved, ${skipped} skipped (already had text).${failureHint}`
      );
      if (failed > 0 && generated === 0) {
        setError(
          result.failures?.[0]?.error ||
            "All bulk narrative generations failed."
        );
      }
    } catch (err) {
      setError(err.message);
      setNotice("");
    } finally {
      setGeneratingAllNarratives(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !districtId || !category || !location) return;

    setUploadingImage(true);
    setError("");
    setNotice("");
    try {
      const { file: uploadFile, compressed } = await prepareImageForUpload(file);
      const result = await uploadLocationNarrativeImage(
        districtId,
        category,
        location,
        uploadFile
      );
      const narrative = result.narrative || {};
      const nextImage = narrative.image_url || "";
      setImageUrl(nextImage);
      setLocations((current) =>
        patchPairStatus(current, category, location, {
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
            District branding and per-category location narrative content.
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
            <div className={classes.sectionIntro}>
              <h3 className={classes.sectionTitle}>Location narratives</h3>
              <p className={classes.sectionLead}>
                Choose a category and location to edit its image and text, or use
                bulk AI below to fill every pair that is still missing narrative
                text.
              </p>
              {!loadingLocations && locations.length > 0 && (
                <p className={classes.progressMeta} aria-live="polite">
                  <strong>
                    {locations.length - missingNarrativeCount} of {locations.length}
                  </strong>{" "}
                  pairs have narrative text
                  {missingNarrativeCount > 0
                    ? ` · ${missingNarrativeCount} still missing`
                    : " · all complete"}
                </p>
              )}
            </div>

            {loadingLocations ? (
              <div className={classes.placeholder}>Loading categories and locations…</div>
            ) : locations.length === 0 ? (
              <div className={classes.placeholder}>
                No category/location pairs with non-zero expense found for this district.
              </div>
            ) : (
              <>
                <div className={classes.workBlock}>
                  <div className={classes.workBlockHeader}>
                    <h4 className={classes.workBlockTitle}>Edit one pair</h4>
                    <p className={classes.workBlockHint}>
                      Changes here apply only to the selected category and location.
                    </p>
                  </div>

                  <form className={classes.form} onSubmit={handleSaveNarrative}>
                    <div className={classes.pairGrid}>
                      <label className={classes.field}>
                        <span>Category / Department</span>
                        <select
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                          required
                          disabled={generatingAllNarratives}
                        >
                          {categories.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={classes.field}>
                        <span>Location</span>
                        <select
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                          required
                          disabled={!category || generatingAllNarratives}
                        >
                          {locationGroups.map((group) => (
                            <optgroup
                              key={group.locationType}
                              label={group.locationType}
                            >
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
                    </div>

                    {(selectedMissingImage || selectedMissingNarrative) && (
                      <div className={classes.statusRow} aria-live="polite">
                        {selectedMissingImage && (
                          <span className={classes.statusChipMissing}>
                            Missing image
                          </span>
                        )}
                        {selectedMissingNarrative && (
                          <span className={classes.statusChipMissing}>
                            Missing text
                          </span>
                        )}
                        <span className={classes.statusHint}>
                          Upload an image and save narrative text for this pair.
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
                                <span className={classes.fieldBadgeMissing}>
                                  Missing
                                </span>
                              ) : (
                                <span className={classes.fieldBadgeReady}>Saved</span>
                              )}
                            </span>
                            <p className={classes.hint}>
                              Saved immediately on upload for this pair.
                            </p>
                            <label className={classes.uploadBtn}>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                                onChange={handleImageChange}
                                disabled={
                                  uploadingImage ||
                                  !category ||
                                  !location ||
                                  generatingAllNarratives
                                }
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
                              <img
                                src={imageUrl}
                                alt={`${category} / ${location} visual`}
                              />
                            ) : (
                              <div className={classes.logoEmpty}>
                                No image saved yet
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={classes.editorBlock}>
                          <div className={classes.editorHeader}>
                            <div>
                              <span className={classes.editorLabel}>
                                Narrative text
                                {selectedMissingNarrative ? (
                                  <span className={classes.fieldBadgeMissing}>
                                    Missing
                                  </span>
                                ) : (
                                  <span className={classes.fieldBadgeReady}>
                                    Saved
                                  </span>
                                )}
                              </span>
                              <p className={classes.hint}>
                                Plain text only — Tableau cannot render HTML.
                                Draft with AI fills the box; Save writes it to
                                BigQuery.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={classes.secondaryBtn}
                              onClick={handleGenerateNarrative}
                              disabled={
                                savingNarrative ||
                                generatingNarrative ||
                                generatingAllNarratives ||
                                uploadingImage ||
                                !districtId ||
                                !category ||
                                !location
                              }
                            >
                              {generatingNarrative
                                ? "Drafting…"
                                : "Draft with AI"}
                            </button>
                          </div>
                          <textarea
                            className={classes.plainText}
                            value={narrativeText}
                            onChange={(event) =>
                              setNarrativeText(event.target.value)
                            }
                            rows={10}
                            disabled={
                              savingNarrative ||
                              generatingNarrative ||
                              generatingAllNarratives ||
                              uploadingImage
                            }
                            placeholder="Write or draft the narrative for this category and location…"
                          />
                          <div className={classes.formActionsStart}>
                            <button
                              type="submit"
                              className={classes.primaryBtn}
                              disabled={
                                savingNarrative ||
                                generatingNarrative ||
                                generatingAllNarratives ||
                                uploadingImage ||
                                !districtId ||
                                !category ||
                                !location
                              }
                            >
                              {savingNarrative
                                ? "Saving…"
                                : "Save this narrative"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </form>
                </div>

                <div className={classes.aiPanel}>
                  <div className={classes.workBlockHeader}>
                    <h4 className={classes.workBlockTitle}>
                      Fill missing narratives with AI
                    </h4>
                    <p className={classes.workBlockHint}>
                      Runs Gemini for every category/location that still has no
                      text, then saves each result automatically. Pairs that
                      already have a narrative are skipped. Does not change
                      images.
                    </p>
                  </div>

                  <label className={classes.field}>
                    <span>Custom AI instructions (optional)</span>
                    <p className={classes.hint}>
                      Used by both Draft with AI and Fill missing. Example:
                      “Keep under 80 words” or “Emphasize safety-related work.”
                    </p>
                    <textarea
                      className={classes.plainText}
                      value={customInstructions}
                      onChange={(event) =>
                        setCustomInstructions(event.target.value)
                      }
                      rows={3}
                      maxLength={2000}
                      disabled={
                        generatingAllNarratives ||
                        generatingNarrative ||
                        savingNarrative
                      }
                      placeholder="Optional guidance for how Gemini should write…"
                    />
                  </label>

                  <div className={classes.formActionsStart}>
                    <button
                      type="button"
                      className={classes.secondaryBtn}
                      onClick={handleGenerateAllNarratives}
                      disabled={
                        !districtId ||
                        loadingLocations ||
                        generatingAllNarratives ||
                        generatingNarrative ||
                        savingNarrative ||
                        uploadingImage ||
                        locations.length === 0 ||
                        missingNarrativeCount === 0
                      }
                    >
                      {generatingAllNarratives
                        ? "Filling missing…"
                        : missingNarrativeCount > 0
                          ? `Fill ${missingNarrativeCount} missing narrative${
                              missingNarrativeCount === 1 ? "" : "s"
                            }`
                          : "Nothing missing to fill"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default NarrativeMapping;
