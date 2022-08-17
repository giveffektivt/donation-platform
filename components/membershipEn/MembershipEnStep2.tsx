import { Button, Input, Select } from "comps";

interface StepInterface {
  handlePrevious: () => void;
}

const countries = [
  "Belgium",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
].sort((a, b) => a.localeCompare(b));

export const MembershipEnStep2 = ({ handlePrevious }: StepInterface) => {
  const options = countries.map((country, index) => (
    <option value={country} key={index}>
      {country}
    </option>
  ));
  options.unshift(<option value="">Select</option>);

  return (
    <>
      {/* <div className="form-group" style={{ padding: "2px 17px 2px 17px" }}>
        <h5 style={{ marginTop: "15px" }}>
          Kurv{" "}
          <span
            onClick={handlePrevious}
            className="custom-back-link"
            style={{ fontWeight: "normal" }}
          >
            (redigér)
          </span>
        </h5>
      </div> */}
      <Input
        label={<>Address</>}
        name="address"
        type="text"
        style={{ maxWidth: "32rem" }}
      />
      <Input
        label={<>Post code</>}
        name="zip"
        type="string"
        style={{ maxWidth: "9rem" }}
      />
      <Input
        label={<>City</>}
        name="city"
        type="text"
        style={{ maxWidth: "16rem" }}
      />
      <Select label={"Country"} name="country" id="id">
        {options}
      </Select>

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Pay 6,72 euro</span>
        </div>
      </Button>
    </>
  );
};
