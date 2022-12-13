import { Button } from "./Button";

interface AmountButtonInterface {
  amount: string;
  lastClicked: string;
  setLastClicked(v: string): void;
  setVisibleValue(v: string): void;
  setValue(v: number): void;
}

export const AmountButton = ({
  amount,
  lastClicked,
  setLastClicked,
  setVisibleValue,
  setValue,
}: AmountButtonInterface): JSX.Element => {
  return (
    <Button
      type="button"
      onClick={(e) => {
        setVisibleValue("");
        setValue(parseInt(amount));
        setLastClicked(amount);
        e.currentTarget.blur();
      }}
      secondary
      marginTop={"0"}
      className={`amount-button ${
        lastClicked === amount ? "button-active" : ""
      }`}
    >
      {amount}
    </Button>
  );
};
