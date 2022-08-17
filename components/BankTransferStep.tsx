import { useFormikContext } from "formik";
import { Button } from "./Button";

export const BankTransferStep = () => {
  const formik = useFormikContext<any>();
  const totalAmount =
    formik.values.amount + (formik.values.membership ? 50 : 0);

  return (
    <>
      <p>Du kan nu åbne din netbank eller mobilbank og overføre til:</p>

      <table className="table">
        <tbody>
          <tr>
            <td width="40%">Beløb:</td>
            <td>
              <b>{totalAmount} kr.</b>
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
        Du kan opsætte månedlige overførsler i din netbank eller mobilbank med
        den samme besked. Så sender vi donationen til den valgte velgørende
        organisation og indberetter evt. fradrag.
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
