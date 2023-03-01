import { Button, GEFrame, Input } from "comps";
import { Table } from "comps/gavebrev/Table";
import { Formik } from "formik";
import { NextPage } from "next";
import { useState } from "react";

type GavebrevValues = {
  token: string;
};

type Data = {
  id: string;
  status: string;
};

const GavebrevStatus: NextPage = () => {
  const [data, setData] = useState<Data[]>([]);
  const [sendToken, setSendToken] = useState("");
  const [fetchError, setFetchError] = useState("");

  const initialValues: GavebrevValues = {
    token: "",
  };

  const handleSubmit = async (values: GavebrevValues, bag: any) => {
    bag.setTouched({});
    setSendToken(values.token);
    setFetchError("");

    try {
      const response = await fetch("/api/gavebrev", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + values.token,
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        setData(
          (responseData.data as Data[]).sort((a, b) => {
            return a.id < b.id ? -1 : 1;
          })
        );
      } else {
        throw new Error(await response.text());
      }
    } catch (e: any) {
      setFetchError(e.toString());
    }
  };

  return (
    <Formik onSubmit={handleSubmit} initialValues={initialValues}>
      {(props) => (
        <GEFrame text="Gavebrev status" className="gavebrev-status">
          <form onSubmit={props.handleSubmit}>
            {data.length === 0 ? (
              <Input
                label="Adgangskode"
                name="token"
                type="password"
                className="full-width form-input"
              />
            ) : null}

            {fetchError ? (
              <div className="margin-top">
                <div
                  className="alert alert-error mt-0 mb-8"
                  role="alert"
                  aria-atomic="true"
                  data-module="error-summary"
                >
                  <div className="alert-body">
                    <p className="alert-heading">{fetchError}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {data.length === 0 ? (
              <Button type="submit">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Forsæt</span>
                </div>
              </Button>
            ) : null}

            <Table data={data} token={sendToken} />
          </form>
        </GEFrame>
      )}
    </Formik>
  );
};

export default GavebrevStatus;
