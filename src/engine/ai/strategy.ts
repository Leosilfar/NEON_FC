export type {
  AiAction,
  AiTarget,
  StrategyContext,
  TargetIntent,
  TeamPlan,
  TeamState,
} from "./strategy/context"
export { makeStrategyContext } from "./strategy/context"
export { coordinateTeam } from "./strategy/coordination"
export { chooseAction } from "./strategy/actions"
export { avoidTeammateCrowding } from "./strategy/targets"
