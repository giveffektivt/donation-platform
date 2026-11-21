import { render } from "@react-email/render";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Fragment, type CSSProperties } from "react";
import { buildNorwegianCauseAreaDistribution } from "src/helpers/norway-shim";
import { renderReceiptPdf } from "./pdf";
import type { ReceiptPayment } from "./repository";

const recipient = [
  "Giv Effektivt",
  "C/O Effective Altruism",
  "Denmark",
  "Vesterbrogade 149, 5.",
  "1620 København V",
  "CVR: 42490903",
];
const description = [
  "Donationen vil gøre en betydelig forskel i vores fælles bestræbelser på at skabe en bedre verden gennem vores forskningsbaserede anbefalinger.",
  "Giv Effektivt står til rådighed, hvis I har spørgsmål i forbindelse med donationen eller i øvrigt.",
];
const money = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});
const date = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const year = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
});
const logoCid = "company-receipt-logo@giveffektivt.dk";
const rule = "1.5px solid #111";
const thankYou = "Af hjertet tak.";
const amountStyle: CSSProperties = {
  textAlign: "right",
  whiteSpace: "nowrap",
  width: "24%",
};

export type ReceiptLayout = ReturnType<typeof buildReceiptLayout>;

function buildReceiptLayout(charge: ReceiptPayment, giver: string[]) {
  return {
    title: "Kvittering for donation",
    date: date.format(charge.charged_at).replaceAll(".", "-"),
    reference: charge.short_id,
    giver,
    recipient,
    description,
    rows: buildNorwegianCauseAreaDistribution(
      charge.earmarks,
      charge.amount,
    ).flatMap((area) =>
      area.standardSplit
        ? [
            {
              label: area.name,
              amount: money.format(area.amount),
              indented: false,
            },
          ]
        : [
            { label: area.name, amount: "", indented: false },
            ...area.organizations.map(({ name, amount }) => ({
              label: name,
              amount: money.format(amount),
              indented: true,
            })),
          ],
    ),
    total: money.format(charge.amount),
    notes: [
      ...(charge.tax_deductible
        ? [
            `Foreningen indrapporterer donationen til Skattestyrelsen primo ${Number(year.format(charge.charged_at)) + 1} i forbindelse med skattefradrag.`,
          ]
        : []),
      "Donationer til foreningen er momsfritaget, og der er ikke ydet varer eller tjenesteydelser som modydelse til dette bidrag.",
    ].join(" "),
    thankYou,
  };
}

function Address({ heading, lines }: { heading: string; lines: string[] }) {
  return (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1.2,
          marginBottom: 16,
        }}
      >
        {heading}
      </div>
      <strong>{lines[0]}</strong>
      {lines.slice(1).map((line, index) => (
        <Fragment key={index}>
          <br />
          {line}
        </Fragment>
      ))}
    </>
  );
}

function ReceiptEmail({
  receipt,
  logoSrc,
}: {
  receipt: ReceiptLayout;
  logoSrc: string;
}) {
  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          fontFamily: '"Open Sans", Arial, sans-serif',
          fontSize: 15,
          lineHeight: "20px",
          color: "#111",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{ maxWidth: 540, margin: "0 auto", padding: "28px 24px 54px" }}
        >
          <img
            src={logoSrc}
            width="270"
            alt="Giv Effektivt"
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
          <table
            aria-label="Betalingsoplysninger"
            cellPadding="0"
            cellSpacing="0"
            style={{ width: "100%", marginTop: 20, borderBottom: rule }}
          >
            <tbody>
              <tr>
                <td
                  style={{ fontSize: 14, letterSpacing: 1, paddingBottom: 12 }}
                >
                  <strong>Dato:</strong> {receipt.date}
                </td>
                <td align="right" style={{ fontSize: 14, paddingBottom: 12 }}>
                  <strong>Reference:</strong> {receipt.reference}
                </td>
              </tr>
            </tbody>
          </table>
          <table
            cellPadding="0"
            cellSpacing="0"
            style={{ width: "100%", marginTop: 22, marginBottom: 24 }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "61%",
                    paddingRight: 16,
                    verticalAlign: "top",
                  }}
                >
                  <Address heading="GIVER" lines={receipt.giver} />
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <Address heading="MODTAGER" lines={receipt.recipient} />
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ maxWidth: 485, marginBottom: 24 }}>
            <strong>Beskrivelse</strong>
            {receipt.description.map((paragraph, index) => (
              <p
                key={paragraph}
                style={{ margin: index === 0 ? 0 : "16px 0 0" }}
              >
                {paragraph}
              </p>
            ))}
          </div>
          <table
            cellPadding="0"
            cellSpacing="0"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  align="left"
                  style={{
                    borderTop: rule,
                    borderBottom: rule,
                    padding: "13px 0",
                    fontSize: 17,
                  }}
                >
                  Formål
                </th>
                <th
                  scope="col"
                  style={{
                    ...amountStyle,
                    borderTop: rule,
                    borderBottom: rule,
                    padding: "13px 0",
                    fontSize: 17,
                  }}
                >
                  Beløb
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.rows.map(({ label, amount, indented }, index) => {
                const padding = `${index === 0 ? 14 : 5}px 0 ${index === receipt.rows.length - 1 ? 14 : 5}px`;
                return (
                  <tr key={`${index}-${label}`}>
                    <td
                      style={{
                        padding,
                        paddingLeft: indented ? 18 : 0,
                        paddingRight: 16,
                      }}
                    >
                      {label}
                    </td>
                    <td style={{ ...amountStyle, padding }}>{amount}</td>
                  </tr>
                );
              })}
              {receipt.rows.length < 4 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={2}
                    height={30 * (4 - receipt.rows.length)}
                    style={{ fontSize: 0, lineHeight: 0 }}
                  />
                </tr>
              )}
              <tr>
                <th
                  scope="row"
                  align="left"
                  style={{ borderTop: rule, paddingTop: 14, fontSize: 17 }}
                >
                  TOTAL
                </th>
                <td style={{ ...amountStyle, borderTop: rule, paddingTop: 14 }}>
                  {receipt.total}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ maxWidth: 505, margin: "34px 0" }}>{receipt.notes}</p>
          <p
            style={{
              fontSize: 22,
              lineHeight: "26px",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {receipt.thankYou} <span style={{ color: "#009a70" }}>♥</span>
          </p>
        </div>
      </body>
    </html>
  );
}

export async function renderCompanyReceipt(
  charge: ReceiptPayment,
  giver: string[],
  preview = false,
) {
  const receipt = buildReceiptLayout(charge, giver);
  const logo = await readFile(
    path.join(process.cwd(), "src/company-receipts/logo.png"),
  );
  const html = await render(
    <ReceiptEmail
      receipt={receipt}
      logoSrc={
        preview
          ? `data:image/png;base64,${logo.toString("base64")}`
          : `cid:${logoCid}`
      }
    />,
  );
  const text = [
    receipt.title,
    `Dato: ${receipt.date}`,
    `Reference: ${receipt.reference}`,
    "",
    "GIVER",
    ...receipt.giver,
    "",
    "MODTAGER",
    ...receipt.recipient,
    "",
    "Beskrivelse",
    receipt.description.join("\n\n"),
    "",
    ...receipt.rows.map(
      ({ label, amount, indented }) =>
        `${indented ? "  " : ""}${label}${amount ? `: ${amount}` : ""}`,
    ),
    `TOTAL: ${receipt.total}`,
    "",
    receipt.notes,
    "",
    receipt.thankYou,
  ].join("\n");

  return {
    title: receipt.title,
    html,
    text,
    attachments: [
      {
        filename: "giv-effektivt.png",
        content: logo,
        cid: logoCid,
        contentType: "image/png",
      },
      {
        filename: `kvittering-${charge.short_id}.pdf`,
        content: await renderReceiptPdf(receipt, logo),
        contentType: "application/pdf",
      },
    ],
  };
}
