/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/base/common/charCode';
import { splitLines } from 'vs/base/common/strings';
import { Range } from 'vs/editor/common/core/range';
import { ValidAnnotatedEditOperation } from 'vs/editor/common/model';

export function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomEOLSequence(): string {
	const rnd = getRandomInt(1, 3);
	if (rnd === 1) {
		return '\n';
	}
	if (rnd === 2) {
		return '\r';
	}
	return '\r\n';
}

export function getRandomString(minLength: number, maxLength: number): string {
	const length = getRandomInt(minLength, maxLength);
	let r = '';
	for (let i = 0; i < length; i++) {
		r += String.fromCharCode(getRandomInt(CharCode.a, CharCode.z));
	}
	return r;
}

export function generateRandomEdits(chunks: string[], editCnt: number): ValidAnnotatedEditOperation[] {
	const lines: string[] = [];
	for (const chunk of chunks) {
		const newLines = splitLines(chunk);
		if (lines.length === 0) {
			lines.push(...newLines);
		} else {
			newLines[0] = lines[lines.length - 1] + newLines[0];
			lines.splice(lines.length - 1, 1, ...newLines);
		}
	}

	const ops: ValidAnnotatedEditOperation[] = [];

	for (let i = 0; i < editCnt; i++) {
		const line = getRandomInt(1, lines.length);
		const startColumn = getRandomInt(1, Math.max(lines[line - 1].length, 1));
		const endColumn = getRandomInt(startColumn, Math.max(lines[line - 1].length, startColumn));
		let text: string = '';
		if (Math.random() < 0.5) {
			text = getRandomString(5, 10);
		}

		ops.push(new ValidAnnotatedEditOperation(null, new Range(line, startColumn, line, endColumn), text, false, false, false));
		lines[line - 1] = lines[line - 1].substring(0, startColumn - 1) + text + lines[line - 1].substring(endColumn - 1);
	}

	return ops;
}

export function generateSequentialInserts(chunks: string[], editCnt: number): ValidAnnotatedEditOperation[] {
	const lines: string[] = [];
	for (const chunk of chunks) {
		const newLines = splitLines(chunk);
		if (lines.length === 0) {
			lines.push(...newLines);
		} else {
			newLines[0] = lines[lines.length - 1] + newLines[0];
			lines.splice(lines.length - 1, 1, ...newLines);
		}
	}

	const ops: ValidAnnotatedEditOperation[] = [];

	for (let i = 0; i < editCnt; i++) {
		const line = lines.length;
		const column = lines[line - 1].length + 1;
		let text: string = '';
		if (Math.random() < 0.5) {
			text = '\n';
			lines.push('');
		} else {
			text = getRandomString(1, 2);
			lines[line - 1] += text;
		}

		ops.push(new ValidAnnotatedEditOperation(null, new Range(line, column, line, column), text, false, false, false));
	}

	return ops;
}

export function generateRandomReplaces(chunks: string[], editCnt: number, searchStringLen: number, replaceStringLen: number): ValidAnnotatedEditOperation[] {
	const lines: string[] = [];
	for (const chunk of chunks) {
		const newLines = splitLines(chunk);
		if (lines.length === 0) {
			lines.push(...newLines);
		} else {
			newLines[0] = lines[lines.length - 1] + newLines[0];
			lines.splice(lines.length - 1, 1, ...newLines);
		}
	}

	const ops: ValidAnnotatedEditOperation[] = [];
	const chunkSize = Math.max(1, Math.floor(lines.length / editCnt));
	const chunkCnt = Math.floor(lines.length / chunkSize);
	const replaceString = getRandomString(replaceStringLen, replaceStringLen);

	let previousChunksLength = 0;
	for (let i = 0; i < chunkCnt; i++) {
		const startLine = previousChunksLength + 1;
		const endLine = previousChunksLength + chunkSize;
		const line = getRandomInt(startLine, endLine);
		const maxColumn = lines[line - 1].length + 1;
		const startColumn = getRandomInt(1, maxColumn);
		const endColumn = Math.min(maxColumn, startColumn + searchStringLen);

		ops.push(new ValidAnnotatedEditOperation(null, new Range(line, startColumn, line, endColumn), replaceString, false, false, false));
		previousChunksLength = endLine;
	}

	return ops;
}

export function generateRandomChunkWithLF(minLength: number, maxLength: number): string {
	const length = getRandomInt(minLength, maxLength);
	let r = '';
	for (let i = 0; i < length; i++) {
		const randomI = getRandomInt(0, CharCode.z - CharCode.a + 1);
		if (randomI === 0 && Math.random() < 0.3) {
			r += '\n';
		} else {
			r += String.fromCharCode(randomI + CharCode.a - 1);
		}
	}
	return r;
}
