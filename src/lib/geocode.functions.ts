import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        language: z.enum(["ar", "ku", "en"]).default("ar"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Missing Google Maps connector credentials");

    const lang = data.language === "ku" ? "ckb" : data.language;
    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.latitude},${data.longitude}&language=${lang}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });

    if (response.status === 403) {
      const details: Array<{ reason?: string }> =
        (await response.json().catch(() => null))?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED")
        throw new Error(
          'Google Maps server key is referrer-restricted. Set its application restrictions to "None" or "IP addresses".',
        );
      if (reason === "API_KEY_SERVICE_BLOCKED")
        throw new Error("Google Maps server key does not allow the Geocoding API.");
      throw new Error("Google Maps request was denied (403).");
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`Geocode failed [${response.status}]: ${body}`);
      throw new Error(`Geocode failed [${response.status}]: ${body}`);
    }

    const json = (await response.json()) as {
      status: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };

    if (json.status !== "OK" || !json.results?.length) {
      return { city: "", addressLine: "", label: "" };
    }

    const best = json.results[0]!;
    const components = json.results.flatMap((r) => r.address_components ?? []);
    const pick = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? "";

    const city =
      pick("locality") ||
      pick("administrative_area_level_2") ||
      pick("administrative_area_level_1");
    const label = pick("neighborhood") || pick("sublocality") || pick("route") || city;

    return {
      city,
      addressLine: best.formatted_address ?? "",
      label,
    };
  });
