import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvLine, parseCsv, parseCsvObjects } from "./csv";

test("csvCell quotes only when it has to", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(0), "0");
});

test("parseCsv handles quotes, commas and newlines inside fields", () => {
  const text = 'name,summary\nOutlier,"Pays well, apparently"\nScale,"He said ""yes"""';
  assert.deepEqual(parseCsv(text), [
    ["name", "summary"],
    ["Outlier", "Pays well, apparently"],
    ["Scale", 'He said "yes"'],
  ]);
});

test("parseCsv handles CRLF, a trailing newline and a BOM", () => {
  const text = '﻿name,url\r\nOutlier,https://outlier.ai\r\n';
  assert.deepEqual(parseCsv(text), [
    ["name", "url"],
    ["Outlier", "https://outlier.ai"],
  ]);
});

test("parseCsv keeps a newline inside a quoted field", () => {
  assert.deepEqual(parseCsv('name,summary\nA,"one\ntwo"'), [
    ["name", "summary"],
    ["A", "one\ntwo"],
  ]);
});

test("parseCsv drops blank lines and returns [] for empty input", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("\n\n"), []);
  assert.deepEqual(parseCsv("a,b\n\nc,d"), [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("parseCsvObjects keys by lowercased header and trims", () => {
  const rows = parseCsvObjects(" Name , URL \nOutlier, https://outlier.ai ");
  assert.deepEqual(rows, [{ name: "Outlier", url: "https://outlier.ai" }]);
});

test("parseCsvObjects fills missing trailing columns with empty strings", () => {
  const rows = parseCsvObjects("name,url,summary\nOnlyName");
  assert.deepEqual(rows, [{ name: "OnlyName", url: "", summary: "" }]);
});

test("a round trip survives a field with every troublesome character", () => {
  const nasty = 'Site "X", Ltd.\nsecond line';
  const text = [csvLine(["name"]), csvLine([nasty])].join("\n");
  assert.deepEqual(parseCsvObjects(text), [{ name: nasty }]);
});
