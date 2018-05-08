import GoogleSpreadsheet from 'google-spreadsheet';
import multipart from 'aws-lambda-multipart-parser';
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
              invitations: row.invitations,
              rsvp: row.rsvpd
            }));
            const data = people.filter(
              person => event.queryStringParameters.code === person.code
            );

            response.body = JSON.stringify({
              data
            });

            return cb(null, response);
          });
        });
      })
      .catch(err => cb(err));
  }
};