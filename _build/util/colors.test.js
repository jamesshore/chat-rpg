// Copyright Titanium I.T. LLC.

import { strict as assert } from 'node:assert';
import { describe, it } from "node:test";
import colors from "./colors.js";


describe("Colors", () => {

	const { red } = colors;    // see production code for other supported colors

	it("color-codes text", () => {
		// assert.equal(red("text"), "\u001b[31mtext\u001b[0mx");		// FAIL
		assert.equal(red("text"), "\u001b[31mtext\u001b[0m");			// PASS
	});

	it("has styling", () => {
		// note that support for styles depends on terminal emulator

		// assert.equal(red.bold("text"), "\u001b[1;31mtext\u001b[0mx");		// FAIL
		assert.equal(red.bold("text"), "\u001b[1;31mtext\u001b[0m");		// PASS

		assert.equal(red.dim("text"), "\u001b[2;31mtext\u001b[0m", "dim");
		assert.equal(red.underline("text"), "\u001b[4;31mtext\u001b[0m", "underline");
		assert.equal(red.blink("text"), "\u001b[5;31mtext\u001b[0m", "blink");
		assert.equal(red.inverse("text"), "\u001b[7;31mtext\u001b[0m", "inverse");
	});

	it("can chain styles", () => {
		assert.equal(red.bold.underline("text"), "\u001b[1;4;31mtext\u001b[0m", "multiple styles");
		assert.equal(red.underline.bold("text"), "\u001b[4;1;31mtext\u001b[0m", "use any order");

		assert.equal(red.bold.bold, undefined, "doesn't repeat styles");
		assert.equal(red.bold.underline.bold, undefined, "doesn't repeat styles even recursively");
	});

});
