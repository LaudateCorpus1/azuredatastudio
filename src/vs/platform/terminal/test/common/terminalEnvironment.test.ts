/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual } from 'assert';
import { collapseTildePath } from 'vs/platform/terminal/common/terminalEnvironment';

suite('terminalEnvironment', () => {
	suite('collapseTildePath', () => {
		test('should return empty string for a falsy path', () => {
			strictEqual(collapseTildePath('', '/foo', '/'), '');
			strictEqual(collapseTildePath(undefined, '/foo', '/'), '');
		});
		test('should return path for a falsy user home', () => {
			strictEqual(collapseTildePath('/foo', '', '/'), '/foo');
			strictEqual(collapseTildePath('/foo', undefined, '/'), '/foo');
		});
		test('should not collapse when user home isn\'t present', () => {
			strictEqual(collapseTildePath('/foo', '/bar', '/'), '/foo');
			strictEqual(collapseTildePath('C:\\foo', 'C:\\bar', '\\'), 'C:\\foo');
		});
		test('should collapse with Windows separators', () => {
			strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
			strictEqual(collapseTildePath('C:\\foo\\bar', 'C:\\foo\\', '\\'), '~\\bar');
			strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo\\', '\\'), '~\\bar\\baz');
			strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'C:\\foo', '\\'), '~\\bar\\baz');
		});
		test('should collapse mixed case with Windows separators', () => {
			strictEqual(collapseTildePath('c:\\foo\\bar', 'C:\\foo', '\\'), '~\\bar');
			strictEqual(collapseTildePath('C:\\foo\\bar\\baz', 'c:\\foo', '\\'), '~\\bar\\baz');
		});
		test('should collapse with Posix separators', () => {
			strictEqual(collapseTildePath('/foo/bar', '/foo', '/'), '~/bar');
			strictEqual(collapseTildePath('/foo/bar', '/foo/', '/'), '~/bar');
			strictEqual(collapseTildePath('/foo/bar/baz', '/foo', '/'), '~/bar/baz');
			strictEqual(collapseTildePath('/foo/bar/baz', '/foo/', '/'), '~/bar/baz');
		});
	});
});
