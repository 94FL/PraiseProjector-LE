import { solve, Model } from "yalps";

export const debug_lp_solver = 0;

// Type aliases for dynamic LP model construction
// These match the yalps types but are defined locally for easier use with dynamic indexing
type LPConstraint = { equal?: number; min?: number; max?: number };
type LPCoefficients = Record<string, number>;
type LPVariables = Record<string, LPCoefficients>;
type LPConstraints = Record<string, LPConstraint>;

class FactorMapper {
  private readonly factors: { constraint: string; variable: string; multiplier: number }[] = [];
  private constraintIndex = 0;
  constructor(private readonly constraintPrefix = "_c") {}
  getNextConstraint() {
    return this.constraintPrefix + this.constraintIndex++;
  }
  addConstraintFactor(constraint: string, variable: string, multiplier: number) {
    this.factors.push({ constraint, variable, multiplier });
  }
  flushVariables(model: Model) {
    const variables = model.variables as LPVariables;
    for (const factor of this.factors) {
      let v = variables[factor.variable] as LPCoefficients | undefined;
      if (!v) variables[factor.variable] = v = {};
      v[factor.constraint] = factor.multiplier;
    }
  }
}

export function optimizePlacement(pos_array: number[], width_array: number[], forward_scale: number, min_value: number) {
  if (!forward_scale) forward_scale = 1;
  if (!min_value) min_value = 0;

  if (pos_array.length < 2) return pos_array;

  const objectiveName = "_obj";
  const moving = {};
  const variables: LPVariables = {};
  const constraints: LPConstraints = { moving };
  const model: Model = {
    direction: "minimize",
    objective: objectiveName,
    variables,
    constraints,
  };

  const factors = new FactorMapper();

  for (let i = 0; i < pos_array.length; ++i) {
    const x = "x" + i,
      y = "y" + i;
    factors.addConstraintFactor(objectiveName, x, forward_scale);
    factors.addConstraintFactor(objectiveName, y, 1);
    constraints[x] = { min: 0 };
    if (i > 0) {
      constraints[y] = { min: 0 };
      const px = "x" + (i - 1),
        py = "y" + (i - 1),
        p = pos_array[i - 1] + width_array[i - 1] - pos_array[i],
        c = factors.getNextConstraint();
      factors.addConstraintFactor(c, x, 1);
      factors.addConstraintFactor(c, y, -1);
      factors.addConstraintFactor(c, px, -1);
      factors.addConstraintFactor(c, py, 1);
      constraints[c] = { min: p };
    } else constraints[y] = { min: 0, max: pos_array[i] - min_value };
  }

  factors.flushVariables(model);

  const res = solve(model);
  if (res.status !== "optimal" || res.variables.length === 0) return pos_array;

  const npa: number[] = [];
  const vars = Object.fromEntries(res.variables);
  for (let i = 0; i < pos_array.length; ++i) npa.push(pos_array[i] + (vars["x" + i] || 0) - (vars["y" + i] || 0));
  return npa;
}

export type ItemToPosition = { pos: number; width: number; expandCost?: number; inplaceSize?: number };
type OverLayItemInfo = { index: number; pidx: number; nidx: number; a: string };

export function calcBestPositions(
  left: number,
  items: ItemToPosition[],
  options: { overlayRevMoveCost: number; overlayFwdMoveCost: number; moveChordsOnly?: boolean }
) {
  if (items.length <= 1) return;

  if (!options.moveChordsOnly) {
    let constraintIndex = 0;

    const overlayItems = new Map<number, OverLayItemInfo>();
    const objectiveName = "_obj";
    const variables: LPVariables = {};
    const constraints: LPConstraints = {};
    const lp: Model = {
      direction: "minimize",
      objective: objectiveName,
      variables,
      constraints,
    };
    constraints[objectiveName] = {};
    const objConstraint = constraints[objectiveName] as LPCoefficients;
    let pp = "",
      pw = 0,
      prevExpandCost = -1;
    let lastp = 0;
    let cn = "";
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.expandCost !== undefined) {
        const p = "p" + i;
        const pv: LPCoefficients = (variables[p] = {});

        if (prevExpandCost < 0) {
          pv[(cn = "__" + ++constraintIndex)] = 1;
          if (pp) (variables[pp] as LPCoefficients)[cn] = -1;
          constraints[cn] = { max: pw };
        }

        if (!pp || prevExpandCost <= 0) {
          pv[(cn = "__" + ++constraintIndex)] = 1;
          if (pp) (variables[pp] as LPCoefficients)[cn] = -1;
          constraints[cn] = { min: pw };
        } else {
          const intvar = "i" + i;
          objConstraint[intvar] = prevExpandCost;
          const iv: LPCoefficients = (variables[intvar] = { _obj: prevExpandCost });
          pv[(cn = "__" + ++constraintIndex)] = 1;
          (variables[pp] as LPCoefficients)[cn] = -1;
          iv[cn] = -pw;
          constraints[cn] = { equal: 0 };

          iv[(cn = "__" + ++constraintIndex)] = 1;
          constraints[cn] = { min: 1 };

          ++constraintIndex; // only for comparing string version
        }
        pp = p;
        pw = item.width;
        prevExpandCost = item.expandCost;
        lastp = i;
      } else overlayItems.set(i, { index: i, pidx: 0, nidx: 0, a: "" });
    }

    overlayItems.forEach((ol) => {
      let i = ol.index + 1;
      while (i < items.length && items[i].expandCost === undefined) ++i;
      if (i < items.length) {
        ol.pidx = i++;
        while (i < items.length && items[i].expandCost === undefined) ++i;
        if (i < items.length) ol.nidx = i;
      } else ol.pidx = lastp;
    });

    let pol: OverLayItemInfo | undefined = undefined;
    overlayItems.forEach((ol) => {
      const x = "x" + ol.index;
      const y = "y" + ol.index;
      const xv: LPCoefficients = (variables[x] = {});
      xv[(cn = "__" + ++constraintIndex)] = 1;
      constraints[cn] = { min: 0 };

      const yv: LPCoefficients = (variables[y] = {});

      if (ol.pidx < ol.nidx) {
        ol.a = "a" + ol.index;
        const ips = items[ol.index].inplaceSize ?? 0;
        yv[(cn = "__" + ++constraintIndex)] = 1;
        constraints[cn] = { min: 0 };

        let av = variables[ol.a] as LPCoefficients | undefined;
        if (av === undefined) av = variables[ol.a] = {};
        av[(cn = "__" + ++constraintIndex)] = 1;
        constraints[cn] = { min: -Math.min(pw / 2, items[ol.index].width / 4) };

        av[(cn = "__" + ++constraintIndex)] = 1;

        const pnv = variables["p" + ol.nidx] as LPCoefficients;
        pnv[cn] = -0.5;
        const ppv = variables["p" + ol.pidx] as LPCoefficients;
        ppv[cn] = 0.5;
        constraints[cn] = { max: 0 };
        if (ips > 0) {
          av[(cn = "__" + ++constraintIndex)] = 1;
          xv[cn] = 1;
          yv[cn] = -1;
          ppv[cn] = 0;
          pnv[cn] = -1;
          constraints[cn] = { max: -ips };
        }
        objConstraint[x] = options.overlayFwdMoveCost;
        objConstraint[y] = options.overlayRevMoveCost;
      } else {
        objConstraint[x] = options.overlayFwdMoveCost / 1000;
        yv[(cn = "__" + ++constraintIndex)] = 1;
        constraints[cn] = { equal: 0 };
      }
      if (pol) {
        xv[(cn = "__" + ++constraintIndex)] = 1;
        yv[cn] = -1;
        (variables["x" + pol.index] as LPCoefficients)[cn] = -1;
        (variables["y" + pol.index] as LPCoefficients)[cn] = 1;
        if (ol.a) {
          let av = variables[ol.a] as LPCoefficients | undefined;
          if (av === undefined) av = variables[ol.a] = {};
          av[cn] = 1;
        }
        if (pol.a) {
          let pav = variables[pol.a] as LPCoefficients | undefined;
          if (pav === undefined) pav = variables[pol.a] = {};
          pav[cn] = 1;
        }
        if (pol.pidx !== ol.pidx) {
          (variables["p" + ol.pidx] as LPCoefficients)[cn] = 1;
          (variables["p" + pol.pidx] as LPCoefficients)[cn] = -1;
        }
        constraints[cn] = { min: items[pol.index].width };
      }
      pol = ol;
    });

    if (debug_lp_solver) console.log(lp);

    const res = solve(lp);

    if (res.status === "optimal") {
      if (debug_lp_solver) console.log(res);
      const variables = new Map(res.variables);
      for (let i = 0; i < items.length; ++i) {
        let calced = 0;
        if (items[i].expandCost === undefined) {
          const ol = overlayItems.get(i);
          if (ol) calced = variables.get("p" + ol.pidx) ?? 0;
          calced += (variables.get("a" + i) ?? 0) + (variables.get("x" + i) ?? 0) - (variables.get("y" + i) ?? 0);
        } else calced = variables.get("p" + i) ?? 0;
        items[i].pos = left + calced;
      }
      return;
    }

    console.log("Unfeasable model", lp);
  }

  const posArray: number[] = [];
  const widthArray: number[] = [];
  for (const item of items)
    if (item.expandCost === undefined) {
      posArray.push(item.pos);
      widthArray.push(item.width);
    }

  const opted = optimizePlacement(posArray, widthArray, options.overlayFwdMoveCost / options.overlayRevMoveCost, left);
  if (opted) {
    let i = 0;
    for (const item of items) if (item.expandCost === undefined) item.pos = opted[i++];
  }
}
