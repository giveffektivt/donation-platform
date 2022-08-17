interface ButtonInterface {
  children?: any;
  style?: any;
  buttonStyle?: any;
  secondary?: boolean;
  className?: string;
  marginTop?: string;
  onClick?: () => void;
  buttonMargin?: string;
  type?: "button" | "reset" | "submit";
  disabled?: any;
}

export const Button = ({
  children,
  secondary,
  className,
  marginTop,
  buttonMargin,
  ...props
}: ButtonInterface): JSX.Element => {
  const marginTopObj = marginTop ? { marginTop } : {};
  const buttonMarginObj = buttonMargin ? { margin: buttonMargin } : {};

  return (
    <div className="form-group" style={{ ...marginTopObj }}>
      <button
        className={`button button-${
          secondary ? "secondary" : "primary"
        } custom-button ${className}`}
        {...props}
      >
        <div className="button-box" style={{ ...buttonMarginObj }}>
          {children}
        </div>
      </button>
    </div>
  );
};
