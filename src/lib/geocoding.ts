export interface Coordinates {
  lat: number;
  lng: number;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

export async function getCoordinatesForLabel(label: string): Promise<Coordinates | null> {
  const cleaned = label.replace(/\s+·\s+/g, " · ").trim();
  if (!cleaned) return null;

  // Tentar com o label completo e, em caso de falha, ir simplificando
  const parts = cleaned.split("·").map((p) => p.trim()).filter(Boolean);

  const queries: string[] = [];

  // 1) Label completo (ex: "Luanda · Viana · Zango 3")
  queries.push(parts.join(", "));

  // 2) Ir removendo o último nível (ex: "Luanda, Viana") depois "Luanda"
  for (let i = parts.length - 1; i >= 1; i--) {
    const partial = parts.slice(0, i).join(", ");
    if (!queries.includes(partial)) {
      queries.push(partial);
    }
  }

  // 3) Fallback genérico para o país
  queries.push("Angola");

  for (const q of queries) {
    try {
      const url = `${NOMINATIM_BASE_URL}?format=json&q=${encodeURIComponent(q + ", Angola")}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error("Nominatim error", response.statusText);
        continue;
      }

      const data: Array<{ lat: string; lon: string }> = await response.json();
      if (!data.length) continue;

      const best = data[0];
      return {
        lat: parseFloat(best.lat),
        lng: parseFloat(best.lon),
      };
    } catch (error) {
      console.error("Erro ao geocodificar com Nominatim", error);
      continue;
    }
  }

  return null;
}
