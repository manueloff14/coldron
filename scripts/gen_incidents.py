import csv, json, os

SRC = "public/coldron_seed.csv"
OUT = "lib/incidents.ts"

os.makedirs("lib", exist_ok=True)

rows = []
with open(SRC, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for r in reader:
        try:
            lat = float(r["latitude"])
            lon = float(r["longitude"])
        except (TypeError, ValueError):
            continue
        # Fix: una fila de Meta tiene longitud positiva por error (74.14 -> -74.14)
        if lon > 0:
            lon = -lon

        def num(key):
            try:
                return int(float(r.get(key) or 0))
            except ValueError:
                return 0

        rows.append({
            "id": r["incident_id"],
            "date": r["date"],
            "departamento": (r["departamento"] or "").strip(),
            "municipio": (r["municipio"] or "").strip(),
            "lat": lat,
            "lon": lon,
            "perpetrator": (r["perpetrator"] or "").strip(),
            "status": (r["event_status"] or "").strip(),
            "method": (r["attack_method"] or "").strip(),
            "target": (r["target_class"] or "").strip(),
            "fatalities": num("fatalities_total"),
            "injuries": num("injuries_total"),
            "civKilled": num("civ_killed"),
            "milKilled": num("mil_killed"),
            "notes": (r.get("other_harm") or "").strip().replace("\n", " "),
        })

ts = (
    "// AUTO-GENERADO desde data/coldrone_seed_v0.4 por scripts/gen_incidents.py\n"
    "// No editar a mano.\n\n"
    "export type Incident = {\n"
    "  id: string;\n  date: string;\n  departamento: string;\n  municipio: string;\n"
    "  lat: number;\n  lon: number;\n  perpetrator: string;\n  status: string;\n"
    "  method: string;\n  target: string;\n  fatalities: number;\n  injuries: number;\n"
    "  civKilled: number;\n  milKilled: number;\n  notes: string;\n};\n\n"
    "export const incidents: Incident[] = "
    + json.dumps(rows, ensure_ascii=False, indent=2)
    + ";\n"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(ts)

print(f"OK: {len(rows)} incidentes -> {OUT}")
