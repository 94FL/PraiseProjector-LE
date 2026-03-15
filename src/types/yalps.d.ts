declare module "yalps" {
  export type ConstraintDirection = "minimize" | "maximize";

  export interface ConstraintLimit {
    min?: number;
    max?: number;
    equal?: number;
  }

  export interface Model {
    direction: ConstraintDirection;
    objective: string;
    variables: Record<string, Record<string, number>>;
    constraints: Record<string, ConstraintLimit>;
  }

  export type SolveVariables = Record<string, number> & Iterable<[string, number]>;

  export interface SolveResult {
    status: string;
    variables: SolveVariables;
  }

  export function solve(model: Model): SolveResult;
}
