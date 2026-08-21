// Physics and display constants
export const VW = 1000;
export const VH = 580;
export const PR = 18; // piece radius
export const BR = 9;  // ball radius
export const MOVE_SPD = 300;
export const BALL_FRIC = 0.975;
export const GOAL_Y0 = VH * 0.38;
export const GOAL_Y1 = VH * 0.62;
export const MATCH_SECS = 5 * 60;
export const FIXED_DT = 1 / 120;
export const MAX_FRAME_DT = 0.08;
export const MAX_STEPS_PER_FRAME = 8;
export const TOP_HUD_HEIGHT = 58;
export const BOTTOM_HUD_HEIGHT = 104;
export const FIELD_SAFE_GAP = 6;

// Utility functions
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const vdist = (ax: number, ay: number, bx: number, by: number) => 
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
