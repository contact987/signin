// Sugar Shot Studio OS — reimbursement bill backup to Google Drive.
//
// DEPLOY ONCE (on the Google account that owns the Drive folder):
//   1. Go to https://script.google.com → New project
//   2. Delete the default code, paste THIS whole file, name the project
//      e.g. "Studio OS Bill Backup"
//   3. Click Deploy → New deployment → type: Web app
//        - Execute as:      Me
//        - Who has access:  Anyone
//   4. Click Deploy, authorize when Google asks (it only touches Drive),
//      and copy the Web app URL (ends in /exec)
//   5. Paste that URL into DRIVE_BACKUP_URL in client/public/studio.html
//
// The Studio calls this right after a bill uploads to Supabase Storage.
// Files land in the shared folder named with date/person/category/amount.

const FOLDER_ID = '1oOO_mgaEvhZbo-DQH_gblOsJI9y2jdkD'; // "Reimbursement Bills" folder

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.b64) throw new Error('No file data');
    const bytes = Utilities.base64Decode(data.b64);
    const blob = Utilities.newBlob(bytes, data.mime || 'application/octet-stream',
                                   data.name || ('bill_' + Date.now()));
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: file.getId(), url: file.getUrl() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
