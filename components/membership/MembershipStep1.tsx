import { Button, CprInput, Input } from "comps";

export const MembershipStep1 = () => {
  return (
    <>
      <div style={{ lineHeight: "1.5" }}>
        Bliv medlem for 50 kr. om året og hjælp med at gøre donationer til Giv
        Effektivt fradragsberettigede.{" "}
        <a
          target={"_blank"}
          rel="noreferrer"
          href="https://giveffektivt.dk/medlemskab/"
        >
          Læs mere her.
        </a>
      </div>
      <Input
        label="Fuldt navn"
        name="name"
        type="text"
        style={{ maxWidth: "32rem" }}
      />
      <CprInput
        label={
          <>
            CPR-nr.
            <span className="weight-normal">
              {" "}
              (bruges kun når medlemslisten indrapporteres til SKAT)
            </span>
          </>
        }
        name="tin"
        type="text"
        style={{ maxWidth: "14rem" }}
      />
      <Input
        label={
          <>
            Email
            <span className="weight-normal"> (til kvittering, ikke spam)</span>
          </>
        }
        name="email"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

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
