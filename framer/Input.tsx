// @ts-nocheck
import * as React from "react";
import {
  ControlType,
  addPropertyControls,
  RenderTarget,
  withCSS,
} from "framer";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  fontStack,
  fontControls,
  fontSizeOptions,
  useOnEnter,
  useFontControls,
  useIsInPreview,
  usePadding,
  useRadius,
  paddingControl,
  borderRadiusControl,
  useControlledState,
} from "https://framer.com/m/framer/default-utils.js@^0.45.0";
import { useIsomorphicLayoutEffect } from "https://framer.com/m/framer/useIsomorphicLayoutEffect.js@0.2.0";

export interface Props {
  isError?: boolean;
  value?: string;
  placeholder?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  radius?: number;
  padding?: number;
  border?: string;
  borderError?: string;
  borderWidth?: number;
  multiLine?: boolean;
  type?: string;

  textAlign?: string;
  disabled?: boolean;
  maxLength?: number;
  enableLimit?: boolean;
  style?: React.CSSProperties;
  fontFamily?: string;
  blurOnSubmit?: boolean;
  placeholderColor?: string;

  focused?: boolean;
  inputStyle?: React.CSSProperties;
  caretColor?: string;
  keyboard?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  truncate?: boolean;
  lineHeight?: number;
  isRTL?: boolean;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  children?: React.ReactNode;
}

/**
 * INPUT
 *
 * @framerIntrinsicWidth 260
 * @framerIntrinsicHeight 50
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight any
 */
export const Input: React.ComponentType = withCSS<Props>(
  function Input(props) {
    const {
      isError,
      placeholder,
      backgroundColor,
      textColor,
      border,
      borderError,
      borderWidth,
      type,
      onSubmit,
      onFocus,
      onBlur,
      value,
      textAlign,
      multiLine,
      placeholderColor,
      focused,
      inputStyle,
      caretColor,
      fontFamily,
      blurOnSubmit,
      disabled,
      keyboard,
      truncate,
      onChange,
      onValueChange,
      maxLength,
      lineHeight,
      enableLimit,
      isRTL,
      style,
    } = props;

    const [inputValue, setValue] = useControlledState(value);
    const inputEle = useRef<HTMLInputElement | HTMLTextAreaElement>();
    const Tag = useMemo(() => (multiLine ? "textarea" : "input"), [multiLine]);

    const inPreview = useIsInPreview();
    const fontStyles = useFontControls(props);
    const paddingValue = usePadding(props);
    const borderRadius = useRadius(props);

    const handleChange = useCallback(
      (event: React.ChangeEvent) => {
        const element = multiLine
          ? (event.nativeEvent.target as HTMLTextAreaElement)
          : (event.nativeEvent.target as HTMLInputElement);
        const value = element.value;

        setValue(value);
        if (onChange) onChange(value);
        if (onValueChange) onValueChange(value);
      },
      [onChange, multiLine]
    );

    useOnEnter(() => {
      if (inPreview && focused) inputEle.current.focus();
    });

    useEffect(() => {
      if (inPreview && focused) inputEle.current.focus();
    }, [focused]);

    useIsomorphicLayoutEffect(() => {
      // I only want to control my own height is auto-sizing is enabled
      if (multiLine && props.style.height !== "100%") {
        // Autosizing hack for multi-line textareas, may have perf impact
        inputEle.current.style.height = "auto";
        inputEle.current.style.height = inputEle.current.scrollHeight + "px";
      }
    }, [inputValue, multiLine, style?.height, placeholder]);

    return (
      <Tag
        onChange={handleChange}
        ref={inputEle as any}
        value={inputValue}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.keyCode === 13) {
            if (blurOnSubmit && inputEle.current) inputEle.current.blur();
            if (onSubmit) onSubmit();
          }
        }}
        disabled={disabled}
        onFocus={() => {
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        maxLength={enableLimit ? maxLength : 524288}
        autoFocus={inPreview && focused}
        className="framer-default-input"
        rows={1}
        style={{
          "--framer-default-input-border-width": `${props.borderWidth}px`,
          "--framer-default-input-border-color": border,
          "--framer-default-input-placeholder-color": props.placeholderColor,
          ...baseInputStyles,
          color: textColor,
          backgroundColor,
          borderRadius,
          textAlign,
          lineHeight,
          caretColor,
          margin: 0,
          display: "flex",
          height: "auto",
          padding: paddingValue,
          direction: isRTL ? "rtl" : "ltr",
          overflow: "show",
          textOverflow: truncate ? "ellipsis" : "unset",
          boxShadow: `inset 0 0 0 ${borderWidth}px ${
            isError ? borderError : border
          }`,
          ...inputStyle,
          ...style,
          ...fontStyles,
        }}
        type={type}
        inputMode={keyboard}
      />
    );
  },
  [
    ".framer-default-input { --framer-default-input-border-width: 1px; --framer-default-input-border-color: #09f; --framer-default-input-placeholder-color: #aaa; }",
    ".framer-default-input:focus { box-shadow: inset 0 0 0 var(--framer-default-input-border-width) var(--framer-default-input-border-color) !important; }",
    ".framer-default-input::placeholder { color: var(--framer-default-input-placeholder-color) !important; }",
  ]
);

Input.defaultProps = {
  value: "",
  placeholder: "Type something…",
  width: 260,
  height: 50,
  backgroundColor: "#EBEBEB",
  textColor: "#333",
  fontSize: 16,
  fontWeight: 400,
  borderRadius: 8,
  lineHeight: 1.4,
  padding: 15,
  border: "rgba(0,0,0,0)",
  borderError: "rgba(255,0,0,255)",
  placeholderColor: "#aaa",
  borderWidth: 1,
  truncate: false,
  alignment: "left",
  caretColor: "#333",
  multiLine: false,
  maxLength: 10,
  type: "text",
  keyboard: "",
};

addPropertyControls(Input, {
  placeholder: { type: ControlType.String, title: "Placeholder" },
  value: { type: ControlType.String, title: "Value" },
  textColor: { type: ControlType.Color, title: "Text" },
  caretColor: { type: ControlType.Color, title: "Caret" },
  placeholderColor: { type: ControlType.Color, title: "Placeholder" },
  backgroundColor: { type: ControlType.Color, title: "Background" },
  border: { type: ControlType.Color, title: "Border" },
  borderError: {
    type: ControlType.Color,
    title: "Border on error",
  },
  borderWidth: {
    type: ControlType.Number,
    title: " ",
    min: 1,
    max: 5,
    displayStepper: true,
  },
  focused: {
    type: ControlType.Boolean,
    title: "Focused",
    defaultValue: false,
    disabledTitle: "No",
    enabledTitle: "Yes",
  },
  ...fontControls,
  fontSize: {
    ...(fontSizeOptions as any),
  },
  lineHeight: {
    type: ControlType.Number,
    min: 0,
    step: 0.1,
    max: 2,
    displayStepper: true,
  },
  ...paddingControl,
  ...borderRadiusControl,
  textAlign: {
    title: "Text Align",
    type: ControlType.Enum,
    displaySegmentedControl: true,
    optionTitles: ["Left", "Center", "Right"],
    options: ["left", "center", "right"],
  },
  isRTL: {
    type: ControlType.Boolean,
    title: "Direction",
    enabledTitle: "RTL",
    disabledTitle: "LTR",
    defaultValue: false,
  },
  disabled: {
    type: ControlType.Boolean,
    title: "Disabled",
    defaultValue: false,
    disabledTitle: "No",
    enabledTitle: "Yes",
  },
  multiLine: {
    type: ControlType.Boolean,
    title: "Text Area",
    defaultValue: false,
    disabledTitle: "No",
    enabledTitle: "Yes",
  },
  truncate: {
    type: ControlType.Boolean,
    title: "Truncate",
    defaultValue: false,
    disabledTitle: "No",
    enabledTitle: "Yes",
    hidden: ({ multiLine }) => multiLine,
  },
  type: {
    type: ControlType.Enum,
    title: "Type",
    hidden: ({ multiLine }) => multiLine,
    defaultValue: "text",
    options: ["text", "password", "email"],
  },
  enableLimit: {
    title: "Limit",
    type: ControlType.Boolean,
    displayStepper: true,
    defaultValue: false,
    disabledTitle: "No",
    enabledTitle: "Yes",
  },
  maxLength: {
    title: " ",
    type: ControlType.Number,
    // @ts-ignore
    defaultValue: Input.defaultProps.maxLength,
    displayStepper: true,
    min: 1,
    hidden: ({ enableLimit }) => !enableLimit,
  },
  keyboard: {
    type: ControlType.Enum,
    title: "Keyboard",
    defaultValue: "",
    options: ["", "numeric", "tel", "decimal", "email", "url", "search"],
    optionTitles: [
      "Default",
      "Numeric",
      "Phone",
      "Decimal",
      "Email",
      "URL",
      "Search",
    ],
  },
  onChange: { type: ControlType.EventHandler },
  onSubmit: { type: ControlType.EventHandler },
  onFocus: { type: ControlType.EventHandler },
  onBlur: { type: ControlType.EventHandler },
} as any);

const baseInputStyles: React.CSSProperties = {
  pointerEvents: "auto",
  border: "none",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  resize: "none",
  margin: 0,
  fontFamily: fontStack,
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
  WebkitAppearance: "none",
};
