onst fs = require('fs');
const path = require('path');
const axios = require('axios');
const winston = require('winston');
const { parseSearchResultsFromHtml } = require('./utils/parser');
const { exportToJson } = require('./exporters/dataset_exporter');
const { validatePropertyRecord } = require('./utils/property_mapper');

// Configure logger
const logger = winston.createLogger({
level: process.env.LOG_LEVEL || 'info',
format: winston.format.combine(
winston.format.timestamp(),
winston.format.printf(
({ level, message, timestamp }) => `${timestamp} [${level.toUpperCase()}] ${message}`
)
),
transports: [new winston.transports.Console()]
});

function loadSettings() {
const configDir = path.join(__dirname, 'config');
const primaryPath = path.join(configDir, 'settings.json');
const examplePath = path.join(configDir, 'settings.example.json');

const chosenPath = fs.existsSync(primaryPath) ? primaryPath : examplePath;

try {
const raw = fs.readFileSync(chosenPath, 'utf-8');
const settings = JSON.parse(raw);

if (settings.proxy && settings.proxy.enabled) {
if (settings.proxy.http) {
process.env.HTTP_PROXY = settings.proxy.http;
}
if (settings.proxy.https) {
process.env.HTTPS_PROXY = settings.proxy.https;
}
}

return settings;
} catch (err) {
logger.error(`Failed to load settings from ${chosenPath}: ${err.message}`);
throw err;
}
}

function loadInputConfig(inputFile) {
try {
const resolved = path.isAbsolute(inputFile)
? inputFile
: path.join(process.cwd(), inputFile);
const raw = fs.readFileSync(resolved, 'utf-8');
return JSON.parse(raw);
} catch (err) {
logger.error(`Failed to load input config from ${inputFile}: ${err.message}`);
throw err;
}
}

async function fetchHtml(url, timeoutMs = 15000) {
try {
const response = await axios.get(url, {
timeout: timeoutMs,
headers: {
'User-Agent':
'RealtorScraper/1.0 (+https://bitbash.dev; contact: sale@bitbash.dev)'
},
maxRedirects: 5
});

return response.data;
} catch (err) {
logger.error(`Failed to fetch ${url}: ${err.message}`);
throw err;
}
}

function buildSearchUrlFromKeyword(keyword, mode) {
// Very simple URL builder; Realtor.com has more complex URL patterns in reality.
const base = 'https://www.realtor.com/realestateandhomes-search/';
const encoded = encodeURIComponent(keyword.replace(/\s+/g, '-'));
let suffix = '';
if (mode === 'RENT') suffix = '/rentals';
if (mode === 'SOLD') suffix = '/sold';
return `${base}${encoded}${suffix}`;
}

async function scrapeFromUrl(url, settings) {
logger.info(`Scraping URL: ${url}`);
const html = await fetchHtml(url, settings.requestTimeoutMs || 15000);
const properties = parseSearchResultsFromHtml(html, { defaultStatus: settings.mode });

logger.info(`Parsed ${properties.length} properties from ${url}`);
return properties;
}

async function scrapeFromKeyword(keyword, settings) {
const url = buildSearchUrlFromKeyword(keyword, settings.mode);
logger.info(`Resolved keyword "${keyword}" to search URL: ${url}`);
return scrapeFromUrl(url, settings);
}

function mergeAndLimitProperties(propertyLists, maxItems) {
const flat = propertyLists.flat();
const uniqueMap = new Map();

for (const prop of flat) {
if (!prop || !prop.id) continue;
if (!uniqueMap.has(prop.id)) {
uniqueMap.set(prop.id, prop);
}
}

const merged = Array.from(uniqueMap.values());
if (typeof maxItems === 'number' && maxItems > 0) {
return merged.slice(0, maxItems);
}
return merged;
}

function validateAll(properties) {
const valid = [];
const invalid = [];

for (const prop of properties) {
const result = validatePropertyRecord(prop);
if (result.valid) {
valid.push(prop);
} else {
invalid.push({ property: prop, errors: result.errors });
}
}

if (invalid.length > 0) {
logger.warn(`Detected ${invalid.length} invalid property records.`);
invalid.slice(0, 5).forEach((item, idx) => {
logger.warn(
`Invalid #${idx + 1} (id=${item.property.id || 'N/A'}): ${item.errors.join(
'; '
)}`
);
});
}

return valid;
}

async function main() {
const settings = loadSettings();

const inputConfig = loadInputConfig(
settings.inputFile || 'data/input.sample.json'
);

const keywordList = Array.isArray(inputConfig.keywords)
? inputConfig.keywords
: [];
const urlList = Array.isArray(inputConfig.urls) ? inputConfig.urls : [];

if (keywordList.length === 0 && urlList.length === 0) {
logger.warn(
'Input configuration does not contain any "keywords" or "urls". Nothing to scrape.'
);
return;
}

logger.info(
`Starting scrape in mode=${settings.mode} for ${keywordList.length} keywords and ${urlList.length} URLs.`
);

const allResults = [];

for (const url of urlList) {
try {
const props = await scrapeFromUrl(url, settings);
allResults.push(props);
} catch (err) {
logger.error(`Error scraping URL ${url}: ${err.message}`);
}
}

for (const keyword of keywordList) {
try {
const props = await scrapeFromKeyword(keyword, settings);
allResults.push(props);
} catch (err) {
logger.error(`Error scraping keyword "${keyword}": ${err.message}`);
}
}

const merged = mergeAndLimitProperties(allResults, settings.maxItems);
const validRecords = validateAll(merged);

if (validRecords.length === 0) {
logger.warn('No valid property records found. Nothing will be exported.');
return;
}

const outputFile =
settings.outputFile || path.join('data', 'output.sample.json');

await exportToJson(validRecords, outputFile);

logger.info(
`Successfully exported ${validRecords.length} properties to ${outputFile}.`
);
}

if (require.main === module) {
main().catch((err) => {
logger.error(`Fatal error: ${err.message}`);
process.exitCode = 1;
});
}

module.exports = {
main,
loadSettings,
loadInputConfig,
scrapeFromUrl,
scrapeFromKeyword,
mergeAndLimitProperties
};