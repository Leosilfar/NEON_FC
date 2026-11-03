import { BR, PR, VH, VW } from "@/constants/physics"
export const REGROUP_SPEED_FACTOR = 0.95
export const REGROUP_ARRIVAL_DISTANCE = 8
export const CENTER_CIRCLE_RADIUS = VH * 0.18

export const STEERING_LOOKAHEAD = 0.65
export const STEERING_SAFE_DISTANCE = PR * 2 + 6
export const KICKOFF_YIELD_DISTANCE = PR * 6
export const KICKOFF_YIELD_LATERAL_LIMIT = PR * 2.2
export const KICKOFF_YIELD_OFFSET = PR * 2.6
export const KICKOFF_BALL_CONTACT_RADIUS = PR + BR + 5
export const KICKOFF_PURSUIT_SPEED_FACTOR = 1.6
export const KICKOFF_REPOSITION_ARRIVAL = 8
export const KICKOFF_REPLAN_BALL_DISTANCE = 20
export const KICKOFF_PROGRESS_DISTANCE = 5
export const KICKOFF_STRIKE_RETRY_TIME = 0.4
export const KICKOFF_REPOSITION_RETRY_TIME = 0.65
export const KICKOFF_AIM_ADJUSTMENTS = [-0.24, -0.12, 0, 0.12, 0.24]
// Leave enough room behind the ball for the largest piece to line up a kickoff
// strike without being pushed outside the field by the back wall.
export const REGROUP_BALL_X_MIN = PR * 2.4 + BR + 12
export const REGROUP_BALL_X_MAX = VW - REGROUP_BALL_X_MIN
