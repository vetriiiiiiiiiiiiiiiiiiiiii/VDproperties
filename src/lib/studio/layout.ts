/**
 * Property Studio layout engine.
 *
 * Produces a preliminary *conceptual* massing and zoning plan from plot geometry and the
 * customer's choices. It is deterministic and reflects every input, but it is not an
 * architectural drawing: setbacks, coverage and room sizes must be checked by a professional.
 */

/** House styles; display names live in the dictionaries. */
export const HOUSE_STYLES = { CONTEMPORARY: true, TRADITIONAL: true, COURTYARD: true, COMPACT: true } as const;
export type HouseStyle = keyof typeof HOUSE_STYLES;

export type StudioInputs = {
  bedrooms: number;
  floors: number;
  builtUpSqft: number;
  style: HouseStyle;
  parkingSlots: number;
  garden: boolean;
  study: boolean;
  finish: "BASIC" | "STANDARD" | "PREMIUM";
  targetBudget?: number | null;
};

export type ValueSource = "RECORD" | "ASSUMED" | "USER";

export type PlotGeometry = {
  widthFt: number;
  depthFt: number;
  setbacks: { front: number; rear: number; side: number };
  setbackSource: ValueSource;
  maxCoveragePct: number | null;
  coverageSource: ValueSource | null;
  /** Bearing the road-facing edge points to; null when orientation isn't on record. */
  frontBearing: number | null;
  /** True when the customer described the plot rather than it coming from a listing record. */
  illustrative: boolean;
};

/**
 * Neutral starting assumptions scaled to plot size (small plots usually carry smaller setbacks).
 * Always labelled as assumptions in the UI and editable by the customer.
 */
export function assumedSetbacks(widthFt: number, depthFt: number) {
  return {
    front: depthFt < 50 ? 5 : depthFt < 80 ? 8 : 10,
    rear: depthFt < 50 ? 3 : 5,
    side: widthFt < 35 ? 2 : widthFt < 60 ? 3 : 5,
  };
}

export const DEFAULT_INPUTS: StudioInputs = {
  bedrooms: 3,
  floors: 2,
  builtUpSqft: 1800,
  style: "CONTEMPORARY",
  parkingSlots: 1,
  garden: true,
  study: false,
  finish: "STANDARD",
  targetBudget: null,
};

export type Rect = { x: number; y: number; w: number; h: number };
export type RoomKind = "public" | "service" | "private" | "circulation" | "flex";
export type PlacedRoom = Rect & { name: string; kind: RoomKind; areaSqft: number };
export type FloorPlan = { level: number; rooms: PlacedRoom[]; areaSqft: number };

/** Message codes, rendered in the visitor's language by the interface (see i18n/dict/studio). */
export type WarningCode =
  | "tooSmall"
  | "noDepth"
  | "gardenReduced"
  | "parkingPartial"
  | "parkingCovered"
  | "shortfall"
  | "coverageExceeded"
  | "coverageUnchecked"
  | "compact"
  | "generous"
  | "setbacksRecord"
  | "setbacksAssumed"
  | "illustrative";
export type Warning = { level: "info" | "caution" | "blocker"; code: WarningCode; params?: Record<string, number | string>; /** Legacy saved scenarios only */ text?: string };

export type StudioResult = {
  feasible: boolean;
  plotAreaSqft: number;
  envelope: Rect;
  footprint: Rect;
  footprintSqft: number;
  achievedBuiltUpSqft: number;
  requestedBuiltUpSqft: number;
  maxBuiltUpSqft: number;
  coveragePct: number;
  floorAreaRatio: number;
  parking: Rect[];
  parkingInEnvelope: boolean;
  garden: Rect | null;
  gardenSqft: number;
  courtyard: Rect | null;
  floors: FloorPlan[];
  roomScale: number;
  warnings: Warning[];
};

const SLOT_W = 9;
const SLOT_D = 17;
const MIN_ROOM_DEPTH = 16;

export function clampInputs(i: StudioInputs): StudioInputs {
  const n = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));
  return {
    ...i,
    bedrooms: n(i.bedrooms, 1, 6),
    floors: n(i.floors, 1, 3),
    builtUpSqft: n(i.builtUpSqft, 400, 12000),
    parkingSlots: n(i.parkingSlots, 0, 4),
    style: i.style in HOUSE_STYLES ? i.style : "CONTEMPORARY",
  };
}

/** The room programme for the chosen home, before it is fitted to the available floor area. */
export function roomProgramme(i: StudioInputs) {
  const rooms: { name: string; kind: RoomKind; area: number; floor: "ground" | "upper" | "any" }[] = [
    { name: "foyer", kind: "circulation", area: 45, floor: "ground" },
    { name: "living", kind: "public", area: 190 + 15 * i.bedrooms, floor: "ground" },
    { name: "dining", kind: "public", area: 110, floor: "ground" },
    { name: "kitchen", kind: "service", area: 95 + 8 * i.bedrooms, floor: "ground" },
    { name: "utility", kind: "service", area: 40, floor: "ground" },
    { name: "commonBath", kind: "service", area: 38, floor: "ground" },
  ];
  for (let b = 0; b < i.bedrooms; b++) {
    const floor = i.floors === 1 || b === 0 ? "ground" : "upper";
    rooms.push({ name: b === 0 ? "mainBedroom" : `bedroom:${b + 1}`, kind: "private", area: b === 0 ? 165 : 125, floor });
    rooms.push({ name: b === 0 ? "ensuite" : `bath:${b + 1}`, kind: "service", area: 45, floor });
  }
  if (i.study) rooms.push({ name: "study", kind: "flex", area: 95, floor: i.floors > 1 ? "upper" : "ground" });
  if (i.floors > 1) {
    rooms.push({ name: "stair", kind: "circulation", area: 85, floor: "ground" });
    for (let f = 1; f < i.floors; f++) rooms.push({ name: f === 1 ? "familyLounge" : `lounge:${f + 1}`, kind: "flex", area: 130, floor: "upper" });
  }
  return rooms;
}

/**
 * Splits a rectangle among rooms in proportion to their areas by recursive halving of the
 * room list (balanced by area) along the rectangle's longer side.
 */
export function partition(rect: Rect, items: { name: string; kind: RoomKind; area: number }[]): PlacedRoom[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...rect, name: items[0].name, kind: items[0].kind, areaSqft: Math.round(rect.w * rect.h) }];
  const total = items.reduce((s, r) => s + r.area, 0);
  let acc = 0;
  let cut = 1;
  for (let k = 0; k < items.length - 1; k++) {
    acc += items[k].area;
    cut = k + 1;
    if (acc >= total / 2) break;
  }
  const a = items.slice(0, cut);
  const b = items.slice(cut);
  const ratio = a.reduce((s, r) => s + r.area, 0) / total;
  if (rect.w >= rect.h) {
    const w1 = rect.w * ratio;
    return [...partition({ x: rect.x, y: rect.y, w: w1, h: rect.h }, a), ...partition({ x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h }, b)];
  }
  const h1 = rect.h * ratio;
  return [...partition({ x: rect.x, y: rect.y, w: rect.w, h: h1 }, a), ...partition({ x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 }, b)];
}

/** Coordinates: x across the frontage (0 = left boundary), y from the road (0 = front boundary). */
export function generateLayout(plot: PlotGeometry, rawInputs: StudioInputs): StudioResult {
  const i = clampInputs(rawInputs);
  const W = plot.widthFt;
  const D = plot.depthFt;
  const { front, rear, side } = plot.setbacks;
  const warnings: Warning[] = [];
  const plotArea = W * D;

  const env: Rect = { x: side, y: front, w: Math.max(0, W - 2 * side), h: Math.max(0, D - front - rear) };
  const empty = (code: WarningCode): StudioResult => ({
    feasible: false, plotAreaSqft: plotArea, envelope: env, footprint: { x: env.x, y: env.y, w: 0, h: 0 }, footprintSqft: 0,
    achievedBuiltUpSqft: 0, requestedBuiltUpSqft: i.builtUpSqft, maxBuiltUpSqft: 0, coveragePct: 0, floorAreaRatio: 0,
    parking: [], parkingInEnvelope: false, garden: null, gardenSqft: 0, courtyard: null, floors: [], roomScale: 0,
    warnings: [{ level: "blocker", code }],
  });
  if (env.w < 12 || env.h < 12) return empty("tooSmall");

  // Parking: in the front setback when it is deep enough, otherwise as covered parking (porch/stilt)
  // within the ground floor of the house.
  const parking: Rect[] = [];
  let parkingInEnvelope = false;
  const slotsWanted = i.parkingSlots;
  if (slotsWanted > 0 && front >= SLOT_D && slotsWanted * SLOT_W <= W - 2) {
    for (let p = 0; p < slotsWanted; p++) parking.push({ x: W - 1 - slotsWanted * SLOT_W + p * SLOT_W, y: front - SLOT_D, w: SLOT_W, h: SLOT_D });
  } else if (slotsWanted > 0) {
    parkingInEnvelope = true;
  }

  // Garden reserved at the rear of the envelope.
  const envBottom = env.y + env.h;
  let gardenDepth = i.garden ? Math.max(8, Math.round(env.h * 0.18)) : 0;
  const minHouseDepth = parkingInEnvelope ? SLOT_D + 8 : MIN_ROOM_DEPTH;
  if (env.h - gardenDepth < minHouseDepth && gardenDepth > 0) {
    gardenDepth = Math.max(0, env.h - minHouseDepth);
    warnings.push({ level: "caution", code: "gardenReduced" });
  }
  const availDepth = env.h - gardenDepth;
  if (availDepth < minHouseDepth) return empty("noDepth");

  // Footprint sizing.
  const courtyardFactor = i.style === "COURTYARD" ? 1.15 : 1;
  const perFloor = (i.builtUpSqft / i.floors) * courtyardFactor;
  let fw = env.w;
  let fd = perFloor / fw;
  if (fd < minHouseDepth * 1.2) {
    fw = Math.min(env.w, Math.max(MIN_ROOM_DEPTH * 1.5, Math.sqrt(perFloor * 1.3)));
    fd = Math.max(perFloor / fw, minHouseDepth);
  }
  let shortfall = false;
  if (fd > availDepth) {
    fd = availDepth;
    fw = env.w;
    shortfall = true;
  }
  const footprint: Rect = { x: env.x + (env.w - fw) / 2, y: env.y, w: fw, h: fd };
  const footprintSqft = fw * fd;

  if (parkingInEnvelope) {
    const slots = Math.min(slotsWanted, Math.max(1, Math.floor((fw - 8) / SLOT_W)));
    if (slots < slotsWanted) warnings.push({ level: "caution", code: "parkingPartial", params: { slots, wanted: slotsWanted } });
    for (let p = 0; p < slots; p++) parking.push({ x: footprint.x + fw - (p + 1) * SLOT_W, y: footprint.y, w: SLOT_W, h: SLOT_D });
    warnings.push({ level: "info", code: "parkingCovered" });
  }
  const parkingArea = parkingInEnvelope ? parking.reduce((s, r) => s + r.w * r.h, 0) : 0;
  const courtyard = i.style === "COURTYARD" && fw > 24 && fd > 30 ? { x: footprint.x + fw * 0.15, y: footprint.y + fd * 0.55, w: fw * 0.3, h: fd * 0.22 } : null;
  const courtyardArea = courtyard ? courtyard.w * courtyard.h : 0;
  const usableTotal = (footprintSqft - courtyardArea) * i.floors - parkingArea;
  const maxBuiltUp = Math.round((env.w * availDepth - courtyardArea) * i.floors - parkingArea);
  const achieved = Math.round(Math.max(0, Math.min(i.builtUpSqft, usableTotal)));
  if (shortfall || achieved < i.builtUpSqft) {
    warnings.push({ level: "caution", code: "shortfall", params: { achieved, requested: i.builtUpSqft } });
  }

  const coveragePct = (footprintSqft / plotArea) * 100;
  if (plot.maxCoveragePct) {
    if (coveragePct > plot.maxCoveragePct) {
      warnings.push({ level: "blocker", code: "coverageExceeded", params: { pct: Math.round(coveragePct), limit: plot.maxCoveragePct, source: plot.coverageSource === "RECORD" ? "RECORD" : "USER" } });
    }
  } else {
    warnings.push({ level: "info", code: "coverageUnchecked" });
  }

  // Room zoning.
  const programme = roomProgramme(i);
  const programmeTotal = programme.reduce((s, r) => s + r.area, 0) * 1.1; // circulation allowance
  const roomScale = achieved / programmeTotal;
  if (roomScale < 0.8) warnings.push({ level: "caution", code: "compact" });
  if (roomScale > 1.5) warnings.push({ level: "info", code: "generous" });

  const levels: FloorPlan[] = [];
  for (let level = 0; level < i.floors; level++) {
    const rooms = programme.filter((r) => (level === 0 ? r.floor === "ground" : r.floor === "upper" && upperFloorFor(r, programme, i.floors) === level));
    if (level > 0 && i.floors > 1) rooms.unshift({ name: "stair", kind: "circulation", area: 85, floor: "upper" });
    // Public spaces face the road; private rooms sit towards the rear.
    const frontGroup = rooms.filter((r) => r.kind === "public" || r.name === "foyer" || (level > 0 && r.kind === "flex"));
    const backGroup = rooms.filter((r) => !frontGroup.includes(r));
    const fArea = frontGroup.reduce((s, r) => s + r.area, 0);
    const bArea = backGroup.reduce((s, r) => s + r.area, 0);
    const split = fArea + bArea > 0 ? fArea / (fArea + bArea) : 0.5;
    let placed: PlacedRoom[];
    if (level === 0 && parkingInEnvelope && parking.length) {
      // Covered parking takes the front-right corner; the rest of the ground floor wraps around it.
      const pw = parking.length * SLOT_W;
      placed = [
        ...partition({ x: footprint.x, y: footprint.y, w: fw - pw, h: SLOT_D }, frontGroup),
        ...partition({ x: footprint.x, y: footprint.y + SLOT_D, w: fw, h: fd - SLOT_D }, backGroup),
      ];
    } else {
      placed = [
        ...partition({ x: footprint.x, y: footprint.y, w: fw, h: fd * split }, frontGroup),
        ...partition({ x: footprint.x, y: footprint.y + fd * split, w: fw, h: fd * (1 - split) }, backGroup),
      ];
    }
    if (courtyard) placed = placed.filter((r) => !(r.x >= courtyard.x && r.y >= courtyard.y && r.x + r.w <= courtyard.x + courtyard.w && r.y + r.h <= courtyard.y + courtyard.h));
    levels.push({ level, rooms: placed, areaSqft: Math.round(achieved / i.floors) });
  }

  const garden = gardenDepth > 0 ? { x: env.x, y: envBottom - gardenDepth, w: env.w, h: gardenDepth } : null;
  warnings.push({ level: "info", code: plot.setbackSource === "RECORD" ? "setbacksRecord" : "setbacksAssumed" });
  if (plot.illustrative) warnings.push({ level: "info", code: "illustrative" });

  return {
    feasible: !warnings.some((w) => w.level === "blocker"),
    plotAreaSqft: plotArea,
    envelope: env,
    footprint,
    footprintSqft: Math.round(footprintSqft),
    achievedBuiltUpSqft: achieved,
    requestedBuiltUpSqft: i.builtUpSqft,
    maxBuiltUpSqft: maxBuiltUp,
    coveragePct: Math.round(coveragePct * 10) / 10,
    floorAreaRatio: Math.round((achieved / plotArea) * 100) / 100,
    parking,
    parkingInEnvelope,
    garden,
    gardenSqft: garden ? Math.round(garden.w * garden.h) : 0,
    courtyard,
    floors: levels,
    roomScale: Math.round(roomScale * 100) / 100,
    warnings,
  };
}

/** Spreads upper-floor rooms across floors 1..n-1 in programme order. */
function upperFloorFor(room: { name: string }, programme: { name: string; floor: string }[], floors: number) {
  const upper = programme.filter((r) => r.floor === "upper");
  const idx = upper.findIndex((r) => r.name === room.name);
  const perFloor = Math.ceil(upper.length / (floors - 1));
  return 1 + Math.floor(idx / perFloor);
}

/** Screen angle (degrees clockwise from up) for a north arrow when the road edge is drawn at the bottom. */
export function northArrowAngle(frontBearing: number) {
  return (((180 - frontBearing) % 360) + 360) % 360;
}
