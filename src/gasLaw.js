export const VARIABLE_INFO = {
  p: { symbol: 'P', name: 'Pressure', siUnit: 'Pa' },
  v: { symbol: 'V', name: 'Volume', siUnit: 'm³' },
  n: { symbol: 'n', name: 'Amount of gas', siUnit: 'mol' },
  r: { symbol: 'R', name: 'Gas constant', siUnit: 'J/(mol·K)' },
  t: { symbol: 'T', name: 'Temperature', siUnit: 'K' },
};

export const UNIT_OPTIONS = {
  p: [
    { label: 'atm', factor: 101325 },
    { label: 'Pa', factor: 1 },
    { label: 'kPa', factor: 1000 },
    { label: 'MPa', factor: 1e6 },
    { label: 'mmHg', factor: 133.322368421 },
    { label: 'Torr', factor: 133.322368421 },
    { label: 'bar', factor: 1e5 },
    { label: 'mbar', factor: 100 },
    { label: 'psi', factor: 6894.757293168 },
  ],
  v: [
    { label: 'L', factor: 1e-3 },
    { label: 'mL', factor: 1e-6 },
    { label: 'µL', factor: 1e-9 },
    { label: 'm³', factor: 1 },
    { label: 'cm³', factor: 1e-6 },
    { label: 'dm³', factor: 1e-3 },
  ],
  n: [
    { label: 'mol', factor: 1 },
    { label: 'mmol', factor: 1e-3 },
    { label: 'µmol', factor: 1e-6 },
    { label: 'kmol', factor: 1e3 },
  ],
  r: [
    { label: 'L·atm/(mol·K)', factor: 101.325 },
    { label: 'L·mmHg/(mol·K)', factor: 0.133322368421 },
    { label: 'L·Torr/(mol·K)', factor: 0.133322368421 },
    { label: 'L·kPa/(mol·K)', factor: 1 },
    { label: 'L·bar/(mol·K)', factor: 100 },
    { label: 'L·mbar/(mol·K)', factor: 0.1 },
    { label: 'm³·Pa/(mol·K)', factor: 1 },
    { label: 'J/(mol·K)', factor: 1 },
    { label: 'cal/(mol·K)', factor: 4.184 },
    { label: 'erg/(mol·K)', factor: 1e-7 },
  ],
  t: [
    { label: 'K', factor: 1 },
    { label: '°C' },
    { label: '°F' },
  ],
};

const VARIABLE_KEYS = Object.keys(VARIABLE_INFO);

function unitFor(variable, unitLabel) {
  return UNIT_OPTIONS[variable].find(({ label }) => label === unitLabel);
}

export function toSI(variable, value, unitLabel) {
  const unit = unitFor(variable, unitLabel);
  if (!unit) throw new Error(`Choose a valid ${VARIABLE_INFO[variable].name.toLowerCase()} unit.`);
  if (variable === 't') {
    if (unitLabel === '°C') return value + 273.15;
    if (unitLabel === '°F') return ((value - 32) * 5) / 9 + 273.15;
  }
  return value * unit.factor;
}

export function fromSI(variable, value, unitLabel) {
  const unit = unitFor(variable, unitLabel);
  if (!unit) throw new Error(`Choose a valid ${VARIABLE_INFO[variable].name.toLowerCase()} unit.`);
  if (variable === 't') {
    if (unitLabel === '°C') return value - 273.15;
    if (unitLabel === '°F') return ((value - 273.15) * 9) / 5 + 32;
  }
  return value / unit.factor;
}

export function preferredRUnit(pressureUnit, volumeUnit) {
  const volumeIsLitres = ['L', 'dm³'].includes(volumeUnit);
  if (volumeIsLitres) {
    const matchedUnit = {
      atm: 'L·atm/(mol·K)',
      mmHg: 'L·mmHg/(mol·K)',
      Torr: 'L·Torr/(mol·K)',
      kPa: 'L·kPa/(mol·K)',
      bar: 'L·bar/(mol·K)',
      mbar: 'L·mbar/(mol·K)',
    }[pressureUnit];
    if (matchedUnit) return matchedUnit;
  }
  if (pressureUnit === 'Pa' && volumeUnit === 'm³') {
    return 'm³·Pa/(mol·K)';
  }
  return 'J/(mol·K)';
}

export function calculateGasLaw({ unknown, inputs, inputUnits, outputUnit }) {
  if (!VARIABLE_KEYS.includes(unknown)) throw new Error('Choose a variable to calculate.');

  const given = {};
  for (const variable of VARIABLE_KEYS.filter((key) => key !== unknown)) {
    const rawValue = String(inputs[variable] ?? '').trim();
    if (!rawValue) throw new Error(`Enter a value for ${VARIABLE_INFO[variable].name.toLowerCase()}.`);

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      throw new Error(`${VARIABLE_INFO[variable].name} must be a valid number.`);
    }

    const siValue = toSI(variable, numericValue, inputUnits[variable]);
    if (!Number.isFinite(siValue) || siValue <= 0) {
      throw new Error(
        variable === 't'
          ? 'Temperature must be above absolute zero.'
          : `${VARIABLE_INFO[variable].name} must be greater than zero.`,
      );
    }

    given[variable] = {
      value: numericValue,
      unit: inputUnits[variable],
      siValue,
      siUnit: VARIABLE_INFO[variable].siUnit,
    };
  }

  const p = given.p?.siValue;
  const v = given.v?.siValue;
  const n = given.n?.siValue;
  const r = given.r?.siValue;
  const t = given.t?.siValue;
  const formulaByUnknown = {
    p: { expression: 'P = nRT / V', calculate: () => (n * r * t) / v },
    v: { expression: 'V = nRT / P', calculate: () => (n * r * t) / p },
    n: { expression: 'n = PV / RT', calculate: () => (p * v) / (r * t) },
    r: { expression: 'R = PV / nT', calculate: () => (p * v) / (n * t) },
    t: { expression: 'T = PV / nR', calculate: () => (p * v) / (n * r) },
  };
  const resultSI = formulaByUnknown[unknown].calculate();
  if (!Number.isFinite(resultSI) || resultSI <= 0) {
    throw new Error('These values do not produce a finite, positive result. Check the inputs and units.');
  }

  const result = fromSI(unknown, resultSI, outputUnit);
  if (!Number.isFinite(result)) throw new Error('The result cannot be represented in that unit.');

  const si = Object.fromEntries(
    Object.entries(given).map(([variable, value]) => [variable, formatNumber(value.siValue)]),
  );
  const substitutionByUnknown = {
    p: `P = (${si.n} × ${si.r} × ${si.t}) / ${si.v}`,
    v: `V = (${si.n} × ${si.r} × ${si.t}) / ${si.p}`,
    n: `n = (${si.p} × ${si.v}) / (${si.r} × ${si.t})`,
    r: `R = (${si.p} × ${si.v}) / (${si.n} × ${si.t})`,
    t: `T = (${si.p} × ${si.v}) / (${si.n} × ${si.r})`,
  };

  return {
    unknown,
    formula: 'PV = nRT',
    rearrangedFormula: formulaByUnknown[unknown].expression,
    substitution: substitutionByUnknown[unknown],
    resultSI,
    result,
    outputUnit,
    given,
  };
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en', { maximumSignificantDigits: 8 }).format(value);
}