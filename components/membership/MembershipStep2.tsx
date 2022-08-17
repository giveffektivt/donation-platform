import { Button, Input } from "comps";

interface StepInterface {
  handlePrevious: () => void;
}

export const MembershipStep2 = ({ handlePrevious }: StepInterface) => {
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
        label={<>Adresse</>}
        name="address"
        type="text"
        style={{ maxWidth: "32rem" }}
      />
      <Input
        label={<>Postnummer</>}
        name="zip"
        type="number"
        style={{ maxWidth: "7rem" }}
      />
      <Input
        label={<>By</>}
        name="city"
        type="text"
        style={{ maxWidth: "16rem" }}
      />

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Betal 50 kr.</span>
        </div>
      </Button>
    </>
  );
};
