
const sheetId = '1tTsl6rnYg7xiHOzzlCkKb4Wr8s6s0QF01dbvLnnWa-0';
const gid = '1798405832';
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

async function fetchCsv() {
    try {
        const response = await fetch(url);
        const text = await response.text();
        console.log('--- RAW CSV START ---');
        console.log(text);
        console.log('--- RAW CSV END ---');
    } catch (error) {
        console.error('Error fetching CSV:', error);
    }
}

fetchCsv();
