import { Button, Input } from "comps";

export const MembershipEnStep1 = () => {
  return (
    <>
      <div style={{ lineHeight: "1.5" }}>
        Become a member for 6,72 euro annually and help us to make donations to
        Giv Effektivt tax deductible.{" "}
        <a
          target={"_blank"}
          rel="noreferrer"
          href="https://giveffektivt.dk/medlemskab/"
        >
          Read more here.
        </a>
      </div>
      <Input
        label="Full name"
        name="name"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

      <Input
        label={
          <>
            TIN
            <span className="weight-normal">
              {" "}
              (Tax Identification Number or Person ID in your country)
            </span>
          </>
        }
        name="tin"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

      <Input
        label={<>Date of Birth</>}
        name="birthday"
        type="date"
        style={{ maxWidth: "18rem" }}
      />

      <Input
        label={
          <>
            E-mail
            <span className="weight-normal"> (Only for receipt, no spam)</span>
          </>
        }
        name="email"
        type="text"
        style={{ maxWidth: "32rem" }}
      />

      <Button type="submit">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Next step</span>
        </div>
      </Button>
    </>
  );
};
