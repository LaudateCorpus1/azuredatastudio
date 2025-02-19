/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI, Utils } from 'vscode-uri';
import { LsConfiguration } from '../config';

export function looksLikeMarkdownPath(config: LsConfiguration, resolvedHrefPath: URI) {
	return config.markdownFileExtensions.includes(Utils.extname(URI.from(resolvedHrefPath)).toLowerCase().replace('.', ''));
}

export function isMarkdownFile(document: TextDocument) {
	return document.languageId === 'markdown';
}
