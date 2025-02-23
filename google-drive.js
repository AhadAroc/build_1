const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function uploadFile(authClient, filePath, fileName) {
  const drive = google.drive({version: 'v3', auth: authClient});
  const requestBody = {
    name: fileName,
    fields: 'id',
  };
  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath),
  };
  try {
    const file = await drive.files.create({
      requestBody,
      media: media,
    });
    console.log('File Id:', file.data.id);
    return file.data.id;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
}

async function downloadFile(authClient, fileId, destPath) {
  const drive = google.drive({version: 'v3', auth: authClient});
  const dest = fs.createWriteStream(destPath);

  try {
    const res = await drive.files.get(
      {fileId: fileId, alt: 'media'},
      {responseType: 'stream'}
    );
    return new Promise((resolve, reject) => {
      res.data
        .on('end', () => {
          console.log('File downloaded successfully');
          resolve();
        })
        .on('error', err => {
          console.error('Error downloading file');
          reject(err);
        })
        .pipe(dest);
    });
  } catch (err) {
    console.error('Error downloading file:', err);
    throw err;
  }
}

module.exports = {
  authorize,
  uploadFile,
  downloadFile,
};