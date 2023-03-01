import { Dispatch, SetStateAction, useState } from "react";
import { Data } from "./Table";

type SelectProps = {
  item: Data;
  token: string;
  setTableError: Dispatch<SetStateAction<string>>;
};

export const StatusSelect = ({ item, token, setTableError }: SelectProps) => {
  const [value, setValue] = useState(item.status);
  const [isSaved, setIsSaved] = useState(false);
  const [isError, setIsError] = useState(false);

  const allowedValues = ["created", "signed", "rejected", "cancelled", "error"];

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setTableError("");
    setIsSaved(false);
    setIsError(false);
    try {
      const response = await fetch("/api/gavebrev", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (response.ok) {
        setIsSaved(true);
        setValue(newStatus);
      } else {
        throw new Error(await response.text());
      }
    } catch (e: any) {
      setTableError(e.toString());
      setIsError(true);
    }
  };

  return (
    <div>
      <select
        value={value}
        onChange={async (e) => {
          await handleUpdateStatus(item.id, e.target.value);
        }}
        className={`form-select select-gavebrev ${
          isError
            ? "select-gavebrev-red"
            : isSaved
            ? "select-gavebrev-green"
            : ""
        }`}
        name="options"
      >
        {allowedValues.map((el, index) => (
          <option key={index} value={el}>
            {el}
          </option>
        ))}
      </select>
    </div>
  );
};
