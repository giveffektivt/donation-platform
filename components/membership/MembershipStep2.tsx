import { Button, Input } from "comps";

export const MembershipStep2 = () => {
  return (
    <>
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
