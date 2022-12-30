import { useFormikContext } from "formik";
import { Button } from "./Button";

export const BankTransferStep = () => {
  const formik = useFormikContext<any>();

  return (
    <>
      <p>Du kan nu åbne din netbank eller mobilbank og overføre til:</p>

      <table className="table">
        <tbody>
          <tr>
            <td width="40%">Beløb:</td>
            <td>
              <b>{formik.values.amount} kr.</b>
            </td>
          </tr>
          <tr>
            <td>Konto:</td>
            <td>
              <b>{formik.values.bank.account}</b>
            </td>
          </tr>
          <tr>
            <td>Besked til modtager:</td>
            <td>
              <b>{formik.values.bank.message}</b>
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        Du kan lave en eller flere overførsler med ovenstående besked i din
        netbank eller mobilbank. Så sender vi donationen til det valgte
        velgørende formål og indberetter evt. fradrag. Vi indrapporterer kun
        det, der faktisk er overført.
      </p>

      <div style={{ display: "flex", alignItems: "center" }}>
        <Button type="submit">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span>OK</span>
          </div>
        </Button>
      </div>
    </>
  );
};
