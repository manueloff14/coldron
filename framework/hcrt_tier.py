#!/usr/bin/env python3
"""
hcrt_tier.py — Implementacion de referencia del Human-Control Risk Tiering (HCRT).
Lee un manifiesto WABOM y devuelve (tier, justificacion).
Incluye la logica de mitigacion de la matriz tarea x efector x entorno (Protocolo, seccion 5.1).
"""
import json, sys


def hcrt_tier(w):
    ta = w["targeting_autonomy"]
    hil = w["human_in_loop"]
    eff = w.get("effector_type", "kinetic")
    env = w.get("engagement_environment_constraint", "none")
    override = w.get("human_override", False)
    logging = w.get("decision_logging", False)

    # Seleccion y ataque autonomos sin humano en el bucle
    if ta == "autonomous" and hil == "none":
        mitigado = (eff == "non_kinetic" or env == "geofenced_unpopulated") and override and logging
        if mitigado:
            return "T2", "Autonomia mitigada por efector/entorno + override humano + trazabilidad"
        return "T0", "Seleccion y ataque autonomos sin control humano significativo: PROHIBIDO"

    # Autonomia significativa con control humano apenas nominal
    if ta in ("semi_autonomous", "autonomous") or hil == "partial":
        return "T1", "Autonomia significativa con control humano nominal: ALTO RIESGO"

    # Humano selecciona y ejecuta
    if ta == "remote_operated" and hil == "full":
        return "T3", "Humano selecciona y ejecuta: LINEA BASE (operado por humano)"

    return "T2", "Autonomia acotada con control humano sustantivo: MODERADO"


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "wabom_examples.json"
    examples = json.load(open(path, encoding="utf-8"))
    if isinstance(examples, dict):
        examples = [examples]
    for w in examples:
        tier, why = hcrt_tier(w)
        print(f"{tier} | {w['system_name']}\n      -> {why}\n")
