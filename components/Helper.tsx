import { useFormikContext } from "formik";

export const Helper = () => {
  const formik = useFormikContext();

  return (
    <div style={{ margin: "1rem 0" }}>
      <pre
        style={{
          background: "#f6f8fa",
          fontSize: "1.65rem",
          padding: ".5rem",
        }}
      >
        <strong>values</strong> = {JSON.stringify(formik.values, null, 2)}
        <strong>errors</strong> = {JSON.stringify(formik.errors, null, 2)}
        <strong>touched</strong> = {JSON.stringify(formik.touched, null, 2)}
      </pre>
    </div>
  );
};
