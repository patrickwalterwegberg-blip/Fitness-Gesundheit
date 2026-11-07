// Quoting handles separators, quotes and line breaks; the prefix prevents
// spreadsheet formulas, including values preceded by whitespace/control bytes.
export function csvCell(value){
 const text=String(value??'');
 const formula=/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(text)||/^[\t\r\n]/.test(text);
 return '"'+(formula?"'":'')+text.replaceAll('"','""')+'"';
}
export const csvText=rows=>rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
