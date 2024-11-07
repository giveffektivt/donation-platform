// @ts-nocheck
import * as React from "react";
import { useState } from "react";
import { addPropertyControls, ControlType } from "framer";

export function Slider(props) {
  const { min, max, step, onChange, value } = props;
  const [currentValue, setCurrentValue] = useState(value);

  const handleChange = (event) => {
    const newValue = Number.parseInt(event.target.value);
    setCurrentValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "14px",
          overflow: "visible",
        }}
      >
        <input
          name="slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          style={{
            width: "100%",
            height: "14px",
            appearance: "none",
            background: "white",
            border: "1px solid #000000",
            backgroundImage: "linear-gradient(#000, #000)",
            backgroundRepeat: "no-repeat",
            backgroundSize: `${((Math.round(currentValue) - min) / (max - min)) * 100}% 100%`,
          }}
        />
      </div>

      <style>
        {`
          input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              background-color: #000000;
              border: 1px solid white;
              border-radius: 50%;
              cursor: pointer;
          }

          input[type='range']::-moz-range-thumb {
              width: 20px;
              height: 20px;
              background-color: #000000;
              border: 1px solid white;
              border-radius: 50%;
              cursor: pointer;
          }

          input[type='range']::-ms-thumb {
              width: 20px;
              height: 20px;
              background-color: #000000;
              border: 1px solid white;
              border-radius: 50%;
              cursor: pointer;
          }
        `}
      </style>

      <span
        style={{
          marginTop: 8,
          fontFamily: "'Satoshi Regular', sans-serif",
          fontWeight: 400,
          fontSize: 24,
        }}
      >
        {`${Math.round(currentValue)}%`}
      </span>
    </div>
  );
}

Slider.defaultProps = {
  value: 1,
  min: 0,
  max: 100,
  step: 5,
};

addPropertyControls(Slider, {
  min: {
    type: ControlType.Number,
    title: "Min value",
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  max: {
    type: ControlType.Number,
    title: "Max value",
    defaultValue: 100,
    min: 0,
    max: 100,
    step: 1,
  },
  step: {
    type: ControlType.Number,
    title: "Step",
    defaultValue: 5,
    min: 1,
    max: 100,
    step: 1,
  },
  onChange: {
    type: ControlType.EventHandler,
    title: "On value change",
  },
});
