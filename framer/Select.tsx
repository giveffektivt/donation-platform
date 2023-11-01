// @ts-nocheck
import * as React from "react";
import {
  addPropertyControls,
  ControlType,
  EnumControlDescription,
  NumberControlDescription,
  RenderTarget,
  Color,
} from "framer";
import {
  getVariantControls,
  colorTokentoValue,
  useUniqueClassName,
  fontSizeOptions,
  containerStyles,
  fontControls,
  useFontControls,
} from "https://framer.com/m/framer/default-utils.js";

/**
 * SELECT
 *
 * TODO
 * - Allow keyboard focus
 * - Aria labels in an object
 * - Shadow object control
 * - Hover color
 *
 * @framerIntrinsicWidth 140
 * @framerIntrinsicHeight 50
 */
export function Select(props) {
  const {
    disabled,
    focused,
    options = [],
    defaultTextColor,
    defaultIconColor,
    defaultBackgroundColor,
    defaultBorderColor,
    defaultBorderWidth,
    focusTextColor,
    focusIconColor,
    focusBackgroundColor,
    focusBorderColor,
    focusBorderWidth,
    disabledTextColor,
    disabledIconColor,
    disabledBackgroundColor,
    disabledBorderColor,
    disabledBorderWidth,
    disabledOpacity,
    radius,
    fontSize,
    fontFamily,
    fontWeight,
    value,
    variant,
    onFocus,
    onBlur,
    onChange,
    onSelectOption1,
    onSelectOption2,
    onSelectOption3,
    onSelectOption4,
    onSelectOption5,
    onSelectOption6,
    onSelectOption7,
    onSelectOption8,
    onSelectOption9,
    onSelectOption10,
    ...rest
  } = props;
  const [currentValue, setCurrentValue] = React.useState(value - 1);
  const className = useUniqueClassName("select", [
    defaultBackgroundColor,
    defaultBorderColor,
    defaultBorderWidth,
  ]);
  const isInPreview = RenderTarget.current() === RenderTarget.preview;

  const handleSelectChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const index = parseInt(event.currentTarget.value, 10);
      const label = options[index];

      // This shouldn't happen!
      if (!label) {
        console.error(`Could not find option label at index ${index}`);
      }

      setCurrentValue(index);

      if (onChange) {
        onChange(index, label);
      }

      switch (index) {
        case 0:
          onSelectOption1();
          break;
        case 1:
          onSelectOption2();
          break;
        case 2:
          onSelectOption3();
          break;
        case 3:
          onSelectOption4();
          break;
        case 4:
          onSelectOption5();
          break;
        case 5:
          onSelectOption6();
          break;
        case 6:
          onSelectOption7();
          break;
        case 7:
          onSelectOption8();
          break;
        case 8:
          onSelectOption9();
          break;
        case 9:
          onSelectOption10();
          break;
      }
    },
    [
      options,
      onSelectOption1,
      onSelectOption2,
      onSelectOption3,
      onSelectOption4,
      onSelectOption5,
      onSelectOption6,
      onSelectOption7,
      onSelectOption8,
      onSelectOption9,
      onSelectOption10,
    ],
  );

  const handleFocus = React.useCallback(() => {
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);

  const handleBlur = React.useCallback(() => {
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  React.useEffect(() => setCurrentValue(value - 1), [value]);

  const variants = {
    default: {
      backgroundColor: colorTokentoValue(defaultBackgroundColor),
      caretColor: colorTokentoValue(defaultTextColor),
      color: colorTokentoValue(defaultTextColor),
      boxShadow: `inset 0 0 0 ${defaultBorderWidth}px ${colorTokentoValue(
        defaultBorderColor,
      )}`,
    },
    disabled: {
      backgroundColor: colorTokentoValue(disabledBackgroundColor),
      color: colorTokentoValue(disabledTextColor),
      caretColor: colorTokentoValue(disabledTextColor),
      boxShadow: `inset 0 0 0 ${disabledBorderWidth}px ${colorTokentoValue(
        disabledBorderColor,
      )}`,
      opacity: disabledOpacity / 100,
    },
    focus: {
      backgroundColor: colorTokentoValue(focusBackgroundColor),
      color: colorTokentoValue(focusTextColor),
      caretColor: colorTokentoValue(focusTextColor),
      boxShadow: `inset 0 0 0 ${focusBorderWidth}px ${colorTokentoValue(
        focusBorderColor,
      )}`,
    },
  };

  const currentVariantStyle = disabled ? variants.disabled : variants[variant];

  const fontStyles = useFontControls(props);

  return (
    <div style={containerStyles}>
      <style>
        {`
                    @media (max-width: 767px) and (min-width: 0px) { .${className} { --framer-font-size: 14px; } }
                    @media (max-width: 1299px) and (min-width: 768px) { .${className} { --framer-font-size: 16px; } }
                    .${className} { font-size: var(--framer-font-size, 20px); }


                    .${className}:focus {
                        background-color: ${variants.focus.backgroundColor};
                        color: ${variants.focus.color};
                        box-shadow: ${variants.focus.boxShadow};
                    }

                    .${className}:disabled {
                        opacity: ${variants.disabled.opacity};
                        cursor: default;
                    }
                `}
      </style>
      <select
        className={className}
        disabled={variant === "disabled" || disabled}
        autoFocus={focused && isInPreview}
        style={{
          ...(selectStyles as any),
          width: "100%",
          height: "100%",
          borderRadius: radius,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                        <path d="M 0 9 L 4.5 4.5 L 0 0" transform="translate(5.75 3.75) rotate(90 2.25 4.5)" fill="transparent" stroke-width="2" stroke="${defaultIconColor}" stroke-linecap="round"></path>
                      </svg>`,
          )}")`,
          fontFamily: "'Satoshi Regular', sans-serif",
          fontWeight: "400",
          letterSpacing: "0em",
          lineHeight: "1.2em",
          ...currentVariantStyle,
        }}
        value={currentValue}
        onChange={handleSelectChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {options.map((option, index) => (
          <option key={`option-${index}`} value={index}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

Select.defaultProps = {
  height: 50,
  width: 140,
  value: 1,
  disabled: false,
  focused: false,
  defaultTextColor: "#444444",
  defaultIconColor: "#999999",
  defaultBackgroundColor: "#EBEBEB",
  defaultBorderColor: "#09F",
  defaultBorderWidth: 0,
  focusTextColor: "#444444",
  focusIconColor: "#999999",
  focusBackgroundColor: "#f2f2f2",
  focusBorderColor: "#09F",
  focusBorderWidth: 1,
  disabledTextColor: "#444444",
  disabledIconColor: "#999999",
  disabledBackgroundColor: "#f2f2f2",
  disabledBorderColor: "#09F",
  disabledBorderWidth: 0,
  disabledOpacity: 60,
  radius: 8,
  fontWeight: 500,
  fontSize: 16,
  options: ["Option 1", "Option 2"],
  onChange: (index: number, label: string) => {},
  onFocus: () => {},
  onBlur: () => {},
  onSelectOption1: (index: number, label: string) => {},
  onSelectOption2: (index: number, label: string) => {},
  onSelectOption3: (index: number, label: string) => {},
  onSelectOption4: (index: number, label: string) => {},
  onSelectOption5: (index: number, label: string) => {},
  onSelectOption6: (index: number, label: string) => {},
  onSelectOption7: (index: number, label: string) => {},
  onSelectOption8: (index: number, label: string) => {},
  onSelectOption9: (index: number, label: string) => {},
  onSelectOption10: (index: number, label: string) => {},
};

const selectStyles: React.CSSProperties = {
  WebkitAppearance: "none",
  appearance: "none",
  position: "relative",
  border: "none",
  margin: 0,
  cursor: "pointer",
  outline: 0,
  outlineWidth: 0,
  display: "inline-block",
  backgroundRepeat: "no-repeat",
  boxSizing: "border-box",
  backgroundPosition: "right 15px center",
  padding: "15px 40px 15px 15px",
  transition: "box-shadow 0.12s, background-color 0.12s, color 0.12s",
  transitionTimingFunction: "ease-in-out",
  textOverflow: "ellipsis",
};

addPropertyControls(Select, {
  value: {
    type: ControlType.Number,
    title: "Default",
    min: 1,
    displayStepper: true,
    step: 1,
    defaultValue: Select.defaultProps.value,
  },
  disabled: {
    type: ControlType.Boolean,
    title: "Disabled",
    defaultValue: Select.defaultProps.disabled,
    enabledTitle: "Yes",
    disabledTitle: "No",
  },
  variant: {
    title: "Variant",
    type: ControlType.Enum,
    options: ["default", "focus", "disabled"],
    optionTitles: ["Default", "Focus", "Disabled"],
  },
  ...getVariantControls(Select, "default"),
  ...getVariantControls(Select, "focus"),
  ...getVariantControls(Select, "disabled", {
    disabledOpacity: {
      title: "Opacity",
      type: ControlType.Number,
      min: 0,
      max: 100,
      unit: "%",
      defaultValue: Select.defaultProps.disabledOpacity,
      hidden: (props) => props.variant !== "disabled",
    },
  }),
  radius: {
    title: "Radius",
    type: ControlType.FusedNumber,
    defaultValue: Select.defaultProps.radius,
    toggleKey: "isMixed",
    toggleTitles: ["Radius", "Radius per corner"],
    valueKeys: ["topLeft", "topRight", "bottomRight", "bottomLeft"],
    valueLabels: ["TL", "TR", "BR", "BL"],
    min: 0,
  },
  ...fontControls,
  fontSize: {
    ...(fontSizeOptions as NumberControlDescription),
    defaultValue: Select.defaultProps.fontSize,
  },
  fontWeight: {
    ...(fontControls.fontWeight as EnumControlDescription),
    defaultValue: Select.defaultProps.fontWeight,
  },
  focused: {
    type: ControlType.Boolean,
    title: "Focused",
    defaultValue: Select.defaultProps.focused,
    enabledTitle: "Yes",
    disabledTitle: "No",
  },
  options: {
    type: ControlType.Array,
    title: "Options",
    defaultValue: Select.defaultProps.options,
    propertyControl: {
      type: ControlType.String,
      placeholder: "Option…",
    },
  },
  onFocus: {
    type: ControlType.EventHandler,
  },
  onBlur: {
    type: ControlType.EventHandler,
  },
  onSelectOption1: {
    type: ControlType.EventHandler,
  },
  onSelectOption2: {
    type: ControlType.EventHandler,
  },
  onSelectOption3: {
    type: ControlType.EventHandler,
  },
  onSelectOption4: {
    type: ControlType.EventHandler,
  },
  onSelectOption5: {
    type: ControlType.EventHandler,
  },
  onSelectOption6: {
    type: ControlType.EventHandler,
  },
  onSelectOption7: {
    type: ControlType.EventHandler,
  },
  onSelectOption8: {
    type: ControlType.EventHandler,
  },
  onSelectOption9: {
    type: ControlType.EventHandler,
  },
  onSelectOption10: {
    type: ControlType.EventHandler,
  },
});
