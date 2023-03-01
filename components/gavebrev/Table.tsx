import { useState } from "react";
import { StatusSelect } from "./StatusSelect";

export type Data = {
  id: string;
  status: string;
};

type Props = {
  data: Data[];
  token: string;
};

export const Table = ({ data, token }: Props) => {
  const [searchValue, setSearchValue] = useState("");
  const [tableError, setTableError] = useState("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const filteredData = (() => {
    return data.filter((item) =>
      item.id.toLowerCase().includes(searchValue.toLowerCase())
    );
  })();

  if (data.length === 0) {
    return <></>;
  }

  return (
    <>
      {tableError ? (
        <div style={{ marginTop: "24px" }}>
          <div
            className="alert alert-error mt-0 mb-8"
            role="alert"
            aria-atomic="true"
            data-module="error-summary"
          >
            <div className="alert-body">
              <p className="alert-heading">{tableError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="form-group search">
        <input
          onChange={handleSearch}
          className="form-input full-width-100"
          placeholder="Skriv gavebrevs ID"
          name="search-button"
          title="Search"
          type="search"
        />
        <button className="button button-search">
          <svg className="icon-svg m-0" aria-hidden="true">
            <use xlinkHref="#search"></use>
          </svg>
        </button>
      </div>

      <div className="table--responsive-scroll">
        <table
          className="table--borderless width-100 margin-top"
          id="searchTable"
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>STATUS</th>
            </tr>
            <tr></tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <div className="form-group">
                    <StatusSelect
                      token={token}
                      item={item}
                      setTableError={setTableError}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
