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
            E-mail
            <span className="weight-normal"> (til kvittering, ikke spam)</span>
          </>
        }
        name="email"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Næste</span>
        </div>
      </Button>
    </>
  );
};
