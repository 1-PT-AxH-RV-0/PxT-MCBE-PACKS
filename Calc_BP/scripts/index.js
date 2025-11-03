import { system } from '@minecraft/server';
import { create, all, BigNumber } from './math.min.js';

const math = create(all);
math.config({ number: 'BigNumber' });
math.import(
  {
    arcsin: math.asin,
    arccos: math.acos,
    arctan: math.atan,
    arccot: math.acot,
    arcsec: math.asec,
    arccsc: math.acsc,

    arsinh: math.asinh,
    arcosh: math.acosh,
    artanh: math.atanh,
    arcoth: math.acoth,
    arsech: math.asech,
    arcsch: math.acsch,

    arctan2: math.atan2,
    π: math.evaluate('pi'),
    φ: math.evaluate('phi'),
    Γ: math.gamma,
    ζ: math.zeta
  },
  { override: true }
);

function autoRound(value, tolerance = 1e-10) {
  if (!math.isNumeric(value) && !math.isComplex(value)) return value;

  if (math.isComplex(value)) {
    const re = math.re(value);
    const im = math.im(value);

    const roundedRe = autoRoundRealPart(re, tolerance);
    const roundedIm = autoRoundRealPart(im, tolerance);
    
    return math.complex(roundedRe, roundedIm);
  }

  return autoRoundRealPart(value, tolerance);
}

function autoRoundRealPart(value, tolerance) {
  if (math.abs(value).lt(tolerance)) {
    return math.bignumber(0);
  }

  return value;
}

system.beforeEvents.startup.subscribe(e => {
  e.customCommandRegistry.registerCommand(
    {
      name: 'math:calc',
      description: 'command.math.calc.description',
      permissionLevel: 0,
      cheatsRequired: false,
      mandatoryParameters: [{ name: 'expression', type: 'String' }]
    },
    (_, expression) => {
      let status = 0;
      let res = void 0;

      try {
        res = autoRound(math.evaluate(expression)).toString();
      } catch (e) {
        res = e.message;
        status = 1;
      }

      return {
        status: status,
        message: res
      };
    }
  );
});
