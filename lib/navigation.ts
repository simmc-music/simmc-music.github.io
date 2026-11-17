const views = new Set(["activities", "livehouses", "bands", "songs", "artists", "shops", "mine"]);

export function readNavigation(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const requested = params.get("view");
  const tab = requested && views.has(requested) ? requested : params.has("livehouse") ? "livehouses" : "activities";
  return {
    tab,
    venueId: tab === "livehouses" ? params.get("livehouse") : null,
    shopViewId: tab === "shops" ? params.get("shop") : null,
    activityId: tab === "activities" ? params.get("activity") : null,
  };
}
