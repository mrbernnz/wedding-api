import GoogleSpreadsheet from 'google-spreadsheet';
import { parse } from 'aws-lambda-multipart-parser';
import axios from 'axios';

import creds from './client_secret.json';

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_KEY);

export const rsvps = (event, context, cb) => {
  const p = new Promise(resolve => {
    resolve('success');
  });

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  };

  if (event.queryStringParameters && event.queryStringParameters.code) {
    p
      .then(() => {
        return doc.useServiceAccountAuth(creds, docErr => {
          if (docErr) return cb(docErr);

          return doc.getRows(1, (rowsErr, rows) => {
            if (rowsErr) return cb(rowsErr);

            const people = rows.map(row => ({
              code: row.code,
              name: `${row.firstnames} ${row.lastname}`,
              party: row.weddingparty,
              invited: row.invited
            }));

            const data = people.filter(
              person => event.queryStringParameters.code === person.code
            );

            response.body = JSON.stringify({ data });

            return cb(null, response);
          });
        });
      })
      .catch(err => cb(err));
  }

  if (event.httpMethod === 'POST') {
    p
      .then(() =>
        doc.useServiceAccountAuth(creds, docErr => {
          if (docErr) return cb(docErr);

          return doc.getRows(1, (rowsErr, rows) => {
            if (rowsErr) return cb(rowsErr);

            const payload = parse(event, true);
            rows.forEach(row => {
              if (row.code === payload.code) {
                row.rsvpd = payload.rsvp.toUpperCase();
                row.guests = payload.guests;
                row.guestone = payload.guestone;
                row.guesttwo = payload.guesttwo;
                row.email = payload.email;
                row.save();

                const buffer = Buffer.from(
                  `anystring:${process.env.MAILCHIMP_API_KEY}`
                ).toString('base64');

                axios({
                  method: 'post',
                  url: `https://us16.api.mailchimp.com/3.0/lists/${
                    process.env.MAILCHIMP_LIST_ID
                  }/members/`,
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${buffer}`
                  },
                  data: {
                    email_address: payload.email,
                    status: 'subscribed',
                    merge_fields: {
                      FNAME: row.firstnames,
                      LNAME: row.lastname
                    }
                  }
                });
              }
            });

            response.body = JSON.stringify({ message: 'SUCCESS' });

            return cb(null, response);
          });
        })
      )
      .catch(err => cb(err));
  }
};
