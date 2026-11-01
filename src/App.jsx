import { useEffect, useState } from 'react';
import {
  calculateGasLaw,
  fromSI,
  formatNumber,
  preferredRUnit,
  toSI,
  UNIT_OPTIONS,
  VARIABLE_INFO,
} from './gasLaw.js';

const VARIABLE_ORDER = ['p', 'v', 'n', 'r', 't'];
const INITIAL_UNITS = {
  p: 'atm',
  v: 'L',
  n: 'mol',
  r: 'L·atm/(mol·K)',
  t: 'K',
};
const EMPTY_INPUTS = { p: '', v: '', n: '', r: '', t: '' };

function readHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('gaslaw-history') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function VariableField({ variable, value, unit, onValueChange, onUnitChange }) {
  const info = VARIABLE_INFO[variable];

  return (
    <label className="variable-field" htmlFor={`value-${variable}`}>
      <span className="field-heading">
        <span className="field-symbol">{info.symbol}</span>
        <span>{info.name}</span>
      </span>
      <span className="input-combo">
        <input
          id={`value-${variable}`}
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(event) => onValueChange(variable, event.target.value)}
          aria-label={`${info.name} value`}
        />
        <select
          value={unit}
          onChange={(event) => onUnitChange(variable, event.target.value)}
          aria-label={`${info.name} unit`}
        >
          {UNIT_OPTIONS[variable].map(({ label }) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </span>
      {variable === 'r' && (
        <span className="field-hint">
          Standard R = {formatNumber(fromSI('r', 8.314462618, unit))} {unit}
        </span>
      )}
    </label>
  );
}

function ResultPanel({ result, outputUnit, onOutputUnitChange }) {
  const info = VARIABLE_INFO[result.unknown];
  const resultValue = fromSI(result.unknown, result.resultSI, outputUnit);

  return (
    <section className="result-panel" aria-live="polite">
      <div className="section-kicker"><span className="status-dot" /> SOLUTION</div>
      <div className="answer-heading">
        <div>
          <p className="eyebrow">CALCULATED {info.name.toUpperCase()}</p>
          <p className="answer-value">
            <span>{formatNumber(resultValue)}</span>
            <select
              value={outputUnit}
              onChange={(event) => onOutputUnitChange(event.target.value)}
              aria-label="Result unit"
              className="result-unit-select"
            >
              {UNIT_OPTIONS[result.unknown].map(({ label }) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </p>
        </div>
        <span className="answer-symbol">{info.symbol}</span>
      </div>

      <div className="solution-divider" />
      <div className="solution-block">
        <p className="step-label">IDEAL GAS LAW</p>
        <p className="equation-line">{result.formula}</p>
      </div>
      <div className="solution-block">
        <p className="step-label">REARRANGED FOR {info.symbol}</p>
        <p className="equation-line">{result.rearrangedFormula}</p>
      </div>

      <div className="solution-block given-block">
        <p className="step-label">GIVEN VALUES & SI CONVERSIONS</p>
        <div className="given-list">
          {VARIABLE_ORDER.filter((variable) => variable !== result.unknown).map((variable) => {
            const value = result.given[variable];
            return (
              <div className="given-row" key={variable}>
                <span className="given-name">{VARIABLE_INFO[variable].symbol}</span>
                <span>{formatNumber(value.value)} {value.unit}</span>
                <span className="conversion-arrow">→</span>
                <span>{formatNumber(value.siValue)} {value.siUnit}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="solution-block substitution-block">
        <p className="step-label">SUBSTITUTE SI VALUES</p>
        <p className="equation-line substitution-line">{result.substitution}</p>
        <p className="result-conversion">
          {formatNumber(result.resultSI)} {info.siUnit} → {formatNumber(resultValue)} {outputUnit}
        </p>
        <p className="step-label final-step-label">FINAL ANSWER</p>
        <p className="final-equation">
          {info.symbol} = {formatNumber(resultValue)} {outputUnit}
        </p>
      </div>
    </section>
  );
}

function HistoryPanel({ history, onRestore, onClear }) {
  return (
    <section className="history-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR WORK</p>
          <h2>Recent calculations</h2>
        </div>
        {history.length > 0 && (
          <button className="text-button" type="button" onClick={onClear}>Clear</button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="empty-history">Your calculations will be saved here on this device.</p>
      ) : (
        <ul className="history-list">
          {history.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="history-item" onClick={() => onRestore(entry)}>
                <span className="history-result">
                  {VARIABLE_INFO[entry.unknown].symbol} = {formatNumber(entry.result.result)} {entry.result.outputUnit}
                </span>
                <span className="history-meta">
                  {new Date(entry.createdAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                  <span aria-hidden="true">↗</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FormulaReference() {
  return (
    <section className="reference-section" aria-labelledby="reference-title">
      <div className="reference-intro">
        <p className="eyebrow">A QUICK REFERENCE</p>
        <h2 id="reference-title">One equation.<br />Five ways to solve.</h2>
        <p>For an ideal gas, pressure times volume equals the amount of gas times the gas constant times absolute temperature.</p>
        <div className="reference-equation">PV <span>=</span> nRT</div>
      </div>
      <dl className="variable-reference">
        {VARIABLE_ORDER.map((variable) => (
          <div className="reference-row" key={variable}>
            <dt>{VARIABLE_INFO[variable].symbol}</dt>
            <dd>
              <strong>{VARIABLE_INFO[variable].name}</strong>
              <span>{variable === 'r' ? '8.314462618 J/(mol·K)' : `SI unit: ${VARIABLE_INFO[variable].siUnit}`}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function App() {
  const [unknown, setUnknown] = useState('p');
  const [inputs, setInputs] = useState(EMPTY_INPUTS);
  const [inputUnits, setInputUnits] = useState(INITIAL_UNITS);
  const [outputUnit, setOutputUnit] = useState(INITIAL_UNITS.p);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(readHistory);

  useEffect(() => {
    try {
      window.localStorage.setItem('gaslaw-history', JSON.stringify(history));
    } catch {
      setError('Calculation history could not be saved in this browser.');
    }
  }, [history]);

  function handleValueChange(variable, value) {
    setInputs((current) => ({ ...current, [variable]: value }));
    setResult(null);
    setError('');
  }

  function handleUnitChange(variable, unit) {
    const nextUnits = { ...inputUnits, [variable]: unit };
    if (variable === 'p' || variable === 'v') {
      const previousRUnit = inputUnits.r;
      nextUnits.r = preferredRUnit(nextUnits.p, nextUnits.v);
      if (inputs.r.trim() && Number.isFinite(Number(inputs.r))) {
        const rInSI = toSI('r', Number(inputs.r), previousRUnit);
        const convertedR = fromSI('r', rInSI, nextUnits.r);
        setInputs((current) => ({ ...current, r: String(convertedR) }));
      }
      if (unknown === 'r') setOutputUnit(nextUnits.r);
    }
    setInputUnits(nextUnits);
    setResult(null);
    setError('');
  }

  function handleSelectUnknown(variable) {
    setUnknown(variable);
    setOutputUnit(variable === 'r'
      ? preferredRUnit(inputUnits.p, inputUnits.v)
      : inputUnits[variable]);
    setResult(null);
    setError('');
  }

  function handleCalculate(event) {
    event.preventDefault();
    try {
      const calculation = calculateGasLaw({
        unknown,
        inputs,
        inputUnits,
        outputUnit,
      });
      setResult(calculation);
      setError('');
      setHistory((current) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        unknown,
        inputs: { ...inputs },
        inputUnits: { ...inputUnits },
        result: calculation,
      }, ...current].slice(0, 12));
    } catch (calculationError) {
      setResult(null);
      setError(calculationError.message);
    }
  }

  function handleOutputUnitChange(unit) {
    setOutputUnit(unit);
    setError('');
  }

  function handleReset() {
    setUnknown('p');
    setInputs(EMPTY_INPUTS);
    setInputUnits(INITIAL_UNITS);
    setOutputUnit(INITIAL_UNITS.p);
    setResult(null);
    setError('');
  }

  function handleRestore(entry) {
    setUnknown(entry.unknown);
    setInputs(entry.inputs);
    setInputUnits(entry.inputUnits);
    setOutputUnit(entry.result.outputUnit);
    setResult(entry.result);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Gaslaw Calculator home">
          <span className="brand-mark" aria-hidden="true"><span>P</span><i>V</i></span>
          <span className="brand-name">GASLAW <b>CALCULATOR</b></span>
        </a>
        <span className="header-note">IDEAL GAS LAW · PV = nRT</span>
      </header>

      <main id="top">
        <section className="intro-row">
          <div>
            <p className="eyebrow">A CLEARER WAY THROUGH CHEMISTRY</p>
            <h1>Make the unknown<br /><em>known.</em></h1>
          </div>
          <p className="intro-copy">Choose what you need to find. Bring your own units. We’ll take care of the conversions and show every step.</p>
        </section>

        <section className="equation-banner" aria-label="Ideal gas law equation">
          <div className="equation-copy">
            <span className="equation-label">THE IDEAL GAS LAW</span>
            <span className="equation-main">PV = nRT</span>
          </div>
          <p>Five variables, one relationship.<br />Find any one from the other four.</p>
          <div className="equation-mark" aria-hidden="true">R</div>
        </section>

        <div className="workspace-grid">
          <section className="calculator-panel" aria-labelledby="calculator-title">
            <div className="panel-heading calculator-heading">
              <div>
                <p className="eyebrow">STEP 01 / SET YOUR UNKNOWN</p>
                <h2 id="calculator-title">What are you solving for?</h2>
              </div>
              <span className="step-number">01</span>
            </div>

            <div className="variable-tabs" role="tablist" aria-label="Variable to calculate">
              {VARIABLE_ORDER.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  role="tab"
                  aria-selected={unknown === variable}
                  className={`variable-tab${unknown === variable ? ' is-active' : ''}`}
                  onClick={() => handleSelectUnknown(variable)}
                >
                  <span>{VARIABLE_INFO[variable].symbol}</span>
                  <small>{VARIABLE_INFO[variable].name.replace('Amount of gas', 'Moles')}</small>
                </button>
              ))}
            </div>

            <form onSubmit={handleCalculate} noValidate>
              <div className="input-section-heading">
                <p className="eyebrow">STEP 02 / ENTER THE OTHER FOUR</p>
                <p className="unit-note">Mixed units convert automatically</p>
              </div>
              <div className="fields-grid">
                {VARIABLE_ORDER.filter((variable) => variable !== unknown).map((variable) => (
                  <VariableField
                    key={variable}
                    variable={variable}
                    value={inputs[variable]}
                    unit={inputUnits[variable]}
                    onValueChange={handleValueChange}
                    onUnitChange={handleUnitChange}
                  />
                ))}
              </div>

              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="form-actions">
                <button type="submit" className="calculate-button">
                  Calculate <span aria-hidden="true">↗</span>
                </button>
                <button type="button" className="reset-button" onClick={handleReset}>
                  <span aria-hidden="true">↺</span> Reset
                </button>
              </div>
            </form>
            <p className="constant-note"><span>R</span> = 8.314462618 J/(mol·K) <i>·</i> Gas constant shown in your chosen units</p>
          </section>

          <div className="side-column">
            {result ? (
              <ResultPanel
                result={result}
                outputUnit={outputUnit}
                onOutputUnitChange={handleOutputUnitChange}
              />
            ) : (
              <div className="result-placeholder">
                <div className="placeholder-equation">P <span>·</span> V <span>=</span> n <span>·</span> R <span>·</span> T</div>
                <p>Your worked solution<br />will appear here.</p>
                <span className="placeholder-caption">CONVERSIONS INCLUDED</span>
              </div>
            )}
            <HistoryPanel
              history={history}
              onRestore={handleRestore}
              onClear={() => setHistory([])}
            />
          </div>
        </div>

        <FormulaReference />
      </main>

      <footer className="site-footer">
        <span>GASLAW CALCULATOR</span>
        <span>Built around PV = nRT</span>
      </footer>
    </div>
  );
}