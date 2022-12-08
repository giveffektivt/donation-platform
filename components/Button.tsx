import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

interface ButtonInterface
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  children?: any;
  style?: any;
  buttonStyle?: any;
  secondary?: boolean;
  className?: string;
  marginTop?: string;
  type?: "button" | "reset" | "submit";
  disabled?: any;
}

export const Button = ({
  children,
  secondary,
  className,
  marginTop,
  ...props
}: ButtonInterface): JSX.Element => {
  const marginTopObj = marginTop ? { marginTop } : {};

  return (
    <div className="form-group" style={{ ...marginTopObj }}>
      <button
        className={`button button-${
          secondary ? "secondary" : "primary"
        } custom-button ${className || ""}`}
        {...props}
      >
        {children}
      </button>
    </div>
  );
};
