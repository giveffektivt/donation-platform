import {
  BankTransferInfo,
  DonationFrequency,
  donationPurpose,
  DonationRecipient,
  DonationToEmail,
  FailedRecurringDonationToEmail,
} from "src";

export function paymentReceipt(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const { id, amount, frequency, tax_deductible } = donation;

  const bankInfo = bank
    ? `<li>Beløb: <b>${bank.amount} DKK</b></li>
       <li>Konto: <b>5351-0000242661</b></li>
       <li>Besked til modtager: <b>d-${bank.msg}</b></li>`
    : "";

  // TODO this no longer uses recipient
  const text = `<li>${amount} DKK <a href="https://giveffektivt.dk/anbefalinger/" target="_blank">fordelt efter Giv Effektivts anbefaling</a>.</li>
  ${
    frequency === DonationFrequency.Monthly
      ? `<li>Donationen er månedlig.</li>`
      : ""
  }
  ${
    tax_deductible
      ? `<li> Du har ønsket <a href="https://giveffektivt.dk/fradrag/">fradrag</a>. Vi indrapporterer din donation til SKAT.</li>`
      : ""
  }
  <li>Donations-ID: ${id}.</li>`;

  return paymentTemplate(text, bankInfo);
}

export function membershipReceipt(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const { id, amount } = donation;

  const text = `<li>Dit "medlemsnummer" er dit CPR-nummer.</li>
  ${
    bank
      ? `<li>Kontingentet på ${amount} DKK trækkes årligt fra dine overførsler i det år.</li>`
      : `<li>Kontingentet på ${amount} DKK trækkes nu og herefter årligt (automatisk).</li>`
  }
  <li>Skriv til <a href="mailto:donation@giveffektivt.dk">donation@giveffektivt.dk</a>, hvis du ønsker at opsige medlemskabet.</li>
  <li>Donations-ID: ${id}.</li>`;
  return membershipTemplate(text);
}

export function paymentTemplate(text: string, bankInfo?: string) {
  return `<!DOCTYPE html>
  <html>
      <head>
          <meta http-equiv="x-ua-compatible" content="ie=edge">
          <meta charset="utf-8">

          <style type="text/css">

          body {
              font-family: 'Poppins',Helvetica,Arial,Lucida,sans-serif;
              font-weight: 300;
              line-height: 1.7em;
              -webkit-font-smoothing: antialiased;

              padding: 20px;
          }

          .row {
              clear: both;
              display: block;

              margin: auto;
              max-width: 600px;
          }

          .header_container {
              background-color: white;
              color: black;

              padding: 30px;
              overflow: auto;
          }

          .header_heading {
              font-weight: 600;
              font-size: 40px;
              color: #000000!important;
              line-height: 1.3em;

              padding-bottom: 10px;
          }

          .share_container {
              background-color: #CCCCCC;
              padding: 20px;
              padding-top: 1px;
              margin-top: 16px;
          }

          .header_text {
              font-size: 16px;
              color: #000000!important;
          }

          h1 {
              font-weight: 500;
              font-size: 26px;

              margin-bottom: 6px;
              margin-top: 40px;
          }

          ul {
              margin-top: -9px;
              padding-top: 0px;
          }

          p {
              margin-top: 0px;
          }

          /* latin from https://fonts.googleapis.com/css2?family=Poppins&display=swap */
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
          }
          </style>
      </head>

      <body style=

              "font-family: 'Poppins',Helvetica,Arial,Lucida,sans-serif;
              font-weight: 300;
              line-height: 1.7em;
              -webkit-font-smoothing: antialiased;

              padding: 20px;"
      >
  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="background-color:  black";>
  <tr>
  <td>
  <![endif]-->

          <div class="row">

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <![endif]-->

              <div class="header_container">
  <!--[if mso]>
  </td>
  <td style="padding: 30px;">
  <![endif]-->

                  <div style="float: left; padding-right: 30px;">
                      <a href="https://giveffektivt.dk" target="_blank"><img alt="Giv Effektivt logo" src='cid:giveffektivtLogo'></img></a>
                  </div>
  <!--[if mso]>
  </td>
  <td>
  <![endif]-->

                  <div style="float: left;">
                          <div class="header_heading">
                              Tak for din støtte!
                          </div>
                          <div class="header_text">
                              Du gør en markant og beviselig forskel
                          </div>
                  </div>
                  <!--[if mso]>
                  </td>
                  <![endif]-->
              </div>
              <!--[if mso]>
  </tr>
  </table>
  <![endif]-->
          </div>

  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
  <![endif]-->

          ${
            bankInfo &&
            `
            <div class="row">
              <h1>Du kan nu åbne din netbank eller mobilbank og overføre til:</h1>
              <p>
                  <ul>
                  ${bankInfo}
                  </ul>
              </p>
              <p>
                  Du kan lave en eller flere overførsler med ovenstående besked i din netbank eller mobilbank.
                  Så sender vi donationen til det valgte velgørende formål og indberetter evt. fradrag.
                  Vi indrapporterer kun det, der faktisk er overført.
              </p>
          </div>
          `
          }
          <!--[if mso]>
          </table>
          <![endif]-->

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
  <![endif]-->

          <div class="row">
              <h1>Din donation</h1>
              <p>
                  <ul >
                  ${text}
                  </ul>
              </p>
          </div>

  <!--[if mso]>
  </table>
  <![endif]-->

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
  <![endif]-->
          <div class="row">
              <h1>Bliv medlem</h1>
              <p>
                  Medlemskabet er en <a href="https://giveffektivt.dk/fradrag/" target="_blank">lovmæssig formalitet omkring fradragsberettigelse</a> og derfor kommer du som medlem ikke til at høre meget fra os. Bliv medlem for kun 50 kr om året på <a href="https://giveffektivt.dk/medlemskab" target="_blank">vores hjemmeside</a>.
              </p>
              <p>
                  <a href="http://eepurl.com/hZhf_D" target="_blank">Tilmeld dig vores nyhedsbrev</a>, hvor vi årligt sender 4-6 emails med seneste nyt om Giv Effektivt og hvordan du kan hjælpe med at fremme effektiv velgørenhed i Danmark.
              </p>
          </div>
  <!--[if mso]>
  </table>
  <![endif]-->

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
  <![endif]-->

          <div class="row">
              <h1>Kontakt os</h1>
              <p>
                  Hvis du har spørgsmål, forbedringsforslag eller ønsker at ændre månedlige donationer, er du altid velkommen til at kontakte os på <a href="mailto:donation@giveffektivt.dk">donation@giveffektivt.dk</a> eller tlf. 60 90 89 82.
              </p>
          </div>

  <!--[if mso]>
  </table>
  <![endif]-->

  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="20px" cellspacing="0" border="0" style="background-color: #CCCCCC;">
  <tr>
  <td>
  <![endif]-->

          <div class="row">
  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="20px" cellspacing="0" border="0">
  <tr>
  <![endif]-->

              <div class="share_container">
  <!--[if mso]>
  </td>
  <td style="padding-left: 20px;">
  <![endif]-->


                  <h1>Inspirér andre til at give effektivt</h1>
                  <p>
                      Du kan øge effekten af din donation ved at inspirere andre til at give effektivt. Nævn effektiv velgørenhed for familie eller en god ven, som deler dit ønske om at hjælpe andre i nød.
                      <br /><br />
                      Du kan fx dele linket til <a href="https://giveffektivt.dk">giveffektivt.dk</a>:
                  </p>
                  <div id="share-buttons">
                      <p>
                          <!-- Twitter -->
                          <a href="https://twitter.com/intent/tweet?text=Jeg%20har%20lige%20doneret%20til%20verdens%20mest%20effektive%20velgørende%20organisationer%20via%20%40GivEffektivt.%20Effekten%20er%20100x%20større%20end%20typiske%20organisationer.%20Læs%20mere%20på%20https://GivEffektivt.dk." target="_blank">
                              <img alt="Twitter" src='cid:twitterLogo' ></img>
                          </a>

                          &nbsp;&nbsp;
                          <!-- Facebook -->
                          <a href="https://www.facebook.com/sharer/sharer.php?u=https://giveffektivt.dk" target="_blank">
                              <img alt="Facebook" src='cid:facebookLogo'></img>
                          </a>

                          &nbsp;&nbsp;
                          <!-- LinkedIn -->
                          <a href="https://www.linkedin.com/shareArticle?mini=true&url=https%3A//giveffektivt.dk&title=Giv%20Effektivt&summary=Giv%20til%20verdens%20mest%20effektive%20velg%C3%B8rende%20organisationer%20og%20g%C3%B8r%20en%20st%C3%B8rre%20forskel.&source=" target="_blank">
                              <img alt="LinkedIn" src='cid:linkedinLogo' ></img></a>
                      </p>
                  </div>
                  <!--[if mso]>
  </td>
  <![endif]-->
              </div>

  <!--[if mso]>
  </tr>
  </table>
  <![endif]-->
  </div>

  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->

  </body>
  </html>`;
}

export function membershipTemplate(text: string) {
  return `<!DOCTYPE html>
  <html>
      <head>
          <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet">

          <style type="text/css">

          body {
              font-family: 'Poppins',Helvetica,Arial,Lucida,sans-serif;
              font-weight: 300;
              line-height: 1.7em;
              -webkit-font-smoothing: antialiased;

              padding: 20px;
          }

          .row {
              clear: both;
              display: block;

              margin: auto;
              max-width: 600px;
          }

          .header_container {
              background-color: white;
              color: black;

              padding: 30px;
              overflow: auto;
          }

          .header_heading {
              font-weight: 600;
              font-size: 40px;
              color: #000000!important;
              line-height: 1.3em;

              padding-bottom: 10px;
          }

          .share_container {
              background-color: #CCCCCC;
              padding: 20px;
              padding-top: 1px;
              margin-top: 16px;
          }

          .header_text {
              font-size: 16px;
              color: #000000!important;
          }

          h1 {
              font-weight: 500;
              font-size: 26px;

              margin-bottom: 6px;
              margin-top: 40px;
          }

          ul {
              margin-top: -9px;
              padding-top: 0px;
          }

          p {
              margin-top: 0px;
          }
          </style>
      </head>

      <body>
          <div class="row">
              <div class="header_container">
                  <div style="float: left; padding-right: 30px;">
                      <a href="https://giveffektivt.dk" target="_blank"><img alt="Giv Effektivt logo" src='cid:giveffektivtLogo'></img></div>
                  <div style="float: left;">
                      <div class="header_heading">
                          Tak for din støtte!
                      </div>
                      <div class="header_text">
                          Dit medlemskab gør Giv Effektivt stærkere.
                      </div>
                  </div>
              </div>
          </div>

          <div class="row">
              <h1>Dit medlemskab</h1>
              <p>
                  <ul >
                      ${text}
                  </ul>
              </p>
          </div>

          <div class="row">
              <h1>Hvad er et medlemskab?</h1>
              <p>
                  Medlemskabet er en <a href="https://giveffektivt.dk/fradrag/" target="_blank">lovmæssig formalitet omkring fradragsberettigelse</a> og derfor kommer du som medlem ikke til at høre meget fra os.
              </p>
              <p>
                  <a href="http://eepurl.com/hZhf_D" target="_blank">Tilmeld dig vores nyhedsbrev</a>, hvor vi årligt sender 4-6 emails med seneste nyt om Giv Effektivt og hvordan du kan hjælpe med at fremme effektiv velgørenhed i Danmark.
              </p>
          </div>

          <div class="row">
              <h1>Kontakt os</h1>
              <p>
                  Hvis du har spørgsmål, kommentarer eller forbedringsforslag, er du altid velkommen til at kontakte os på <a href="mailto:donation@giveffektivt.dk">donation@giveffektivt.dk</a> eller tlf. 60 90 89 82.
                  <br /><br />
              </p>
          </div>

          <div class="row">
              <div class="share_container">
                  <h1>Inspirér andre til at give effektivt</h1>
                  <p>
                      Du kan øge effekten af din donation ved at inspirere andre til at blive medlemmer og at give effektivt. Nævn effektiv velgørenhed for familie eller en god ven, som deler dit ønske om at hjælpe andre i nød.
                      <br /><br />
                      Du kan fx dele linket til <a href="https://giveffektivt.dk">giveffektivt.dk</a>:
                  </p>
                  <div id="share-buttons">
                      <p>
                          <!-- Twitter -->
                          <a href="https://twitter.com/intent/tweet?text=Jeg%20har%20lige%20doneret%20til%20verdens%20mest%20effektive%20velgørende%20organisationer%20via%20%40GivEffektivt.%20Effekten%20er%20100x%20større%20end%20typiske%20organisationer.%20Læs%20mere%20på%20https://GivEffektivt.dk." target="_blank">
                              <img alt="Twitter" src='cid:twitterLogo' ></img>
                          </a>

                          &nbsp;&nbsp;
                          <!-- Facebook -->
                          <a href="https://www.facebook.com/sharer/sharer.php?u=https://giveffektivt.dk" target="_blank">
                              <img alt="Facebook" src='cid:facebookLogo'></img>
                          </a>

                          &nbsp;&nbsp;
                          <!-- LinkedIn -->
                          <a href="https://www.linkedin.com/shareArticle?mini=true&url=https%3A//giveffektivt.dk&title=Giv%20Effektivt&summary=Giv%20til%20verdens%20mest%20effektive%20velg%C3%B8rende%20organisationer%20og%20g%C3%B8r%20en%20st%C3%B8rre%20forskel.&source=" target="_blank">
                              <img alt="LinkedIn" src='cid:linkedinLogo' ></img>
                          </a>
                      </p>
                  </div>
              </div>
          </div>
      </body>
  </html>`;
}

export function failedRecurringDonationTemplate(
  info: FailedRecurringDonationToEmail,
) {
  const isMembership = info.recipient === DonationRecipient.GivEffektivt;
  const donorName = (info.donor_name || "").split(" ")[0];

  return `Hej ${donorName}

Dit betalingskort er udløbet eller lukket. Du kan opdatere dit betalingskort her: ${
    info.payment_link
  }

Betalingskortet bruges til ${
    isMembership ? "dit årlige medlemskontingent" : "din månedlige donation"
  } på ${info.amount} kr. til Giv Effektivt${
    isMembership ? ", som hjælper os med at forblive fradragsberettigede" : ""
  }. Når du opdaterer kortinformationen, vil den manglende betaling blive gennemført og ${
    isMembership
      ? "medlemskabet fortsætter"
      : "de månedlige donationer vil herefter fortsætte"
  } som normalt.

Hvis du intet foretager dig, stopper ${
    isMembership ? "dit medlemskab" : "dine donationer"
  } og du hører ikke mere fra os. ${
    isMembership
      ? "Du kan altid oprette et medlemskab på https://giveffektivt.dk/medlemskab"
      : "Hvis du ønsker at oprette en ny donation, kan du som altid gøre det på https://giveffektivt.dk"
  }

Du er velkommen til at besvare denne mail, hvis du har spørgsmål.

Vh og tak for din støtte!
Giv Effektivt`;
}
