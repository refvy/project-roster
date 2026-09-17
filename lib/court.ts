/**
 * Schematic NBA half-court, hoop at the top (baseline).
 * Inner width 356 ≈ 50 ft, so ~7.12 units per foot.
 */
export const HALF_COURT = {
  viewW: 400,
  viewH: 510,
  left: 22,
  top: 18,
  right: 378,
  bottom: 478,
  hoopX: 200,
  hoopY: 55,
  hoopR: 9,
  restR: 28,
  keyW: 114,
  keyH: 135,
  ftR: 43,
  cornerInset: 22,
  threeR: 169,
} as const;

export function halfCourtGeometry() {
  const {
    left,
    top,
    right,
    bottom,
    hoopX,
    hoopY,
    restR,
    keyW,
    keyH,
    ftR,
    cornerInset,
    threeR,
  } = HALF_COURT;
  const keyX = hoopX - keyW / 2;
  const keyBottom = top + keyH;
  const c1 = left + cornerInset;
  const c2 = right - cornerInset;
  const lateral = hoopX - c1;
  const rise = Math.sqrt(Math.max(0, threeR * threeR - lateral * lateral));
  const cornerY = hoopY + rise;

  return {
    left,
    top,
    right,
    bottom,
    hoopX,
    hoopY,
    restR,
    ftR,
    threeR,
    keyX,
    keyW,
    keyH,
    keyBottom,
    c1,
    c2,
    cornerY,
    restrictedBulgeY: hoopY + restR,
    ftBulgeY: keyBottom + ftR,
    restricted: `M${hoopX - restR} ${hoopY} A ${restR} ${restR} 0 0 0 ${hoopX + restR} ${hoopY}`,
    freeThrow: `M${hoopX - ftR} ${keyBottom} A ${ftR} ${ftR} 0 0 0 ${hoopX + ftR} ${keyBottom}`,
    threeLeft: `M${c1} ${top} V${Number(cornerY.toFixed(2))}`,
    threeRight: `M${c2} ${top} V${Number(cornerY.toFixed(2))}`,
    threeArc: `M${c1} ${Number(cornerY.toFixed(2))} A ${threeR} ${threeR} 0 0 1 ${c2} ${Number(cornerY.toFixed(2))}`,
  };
}
