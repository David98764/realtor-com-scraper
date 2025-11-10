onst fs = require('fs');
const path = require('path');

/**
* Ensure the directory for a file path exists.
*/
async function ensureDirForFile(filePath) {
const dir = path.dirname(filePath);
await fs.promises.mkdir(dir, { recursive: true });
}

/**
* Export an array of property records to a JSON file.
*/
async function exportToJson(records, filePath) {
const absolute = path.isAbsolute(filePath)
? filePath
: path.join(process.cwd(), filePath);
await ensureDirForFile(absolute);

const payload = JSON.stringify(records, null, 2);
await fs.promises.writeFile(absolute, payload, 'utf-8');
return absolute;
}

/**
* Export an array of property records to CSV.
* Not used directly in the CLI but provided as utility.
*/
async function exportToCsv(records, filePath) {
const absolute = path.isAbsolute(filePath)
? filePath
: path.join(process.cwd(), filePath);
await ensureDirForFile(absolute);

if (!Array.isArray(records) || records.length === 0) {
await fs.promises.writeFile(absolute, '', 'utf-8');
return absolute;
}

const headers = [
'url',
'status',
'id',
'soldOn',
'listPrice',
'beds',
'baths',
'sqft',
'year_built',
'street',
'locality',
'region',
'postalCode',
'latitude',
'longitude'
];

const lines = [headers.join(',')];

for (const r of records) {
const coords = r.coordinates || {};
const addr = r.address || {};
const row = [
r.url || '',
r.status || '',
r.id || '',
r.soldOn || '',
r.listPrice != null ? r.listPrice : '',
r.beds != null ? r.beds : '',
r.baths != null ? r.baths : '',
r.sqft != null ? r.sqft : '',
r.year_built != null ? r.year_built : '',
addr.street || '',
addr.locality || '',
addr.region || '',
addr.postalCode || '',
coords.latitude != null ? coords.latitude : '',
coords.longitude != null ? coords.longitude : ''
]
.map((v) => {
const str = String(v);
if (str.includes(',') || str.includes('"')) {
return `"${str.replace(/"/g, '""')}"`;
}
return str;
})
.join(',');

lines.push(row);
}

const payload = lines.join('\n');
await fs.promises.writeFile(absolute, payload, 'utf-8');
return absolute;
}

module.exports = {
exportToJson,
exportToCsv
};