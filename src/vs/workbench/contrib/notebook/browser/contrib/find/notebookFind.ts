/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/notebookFind';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { Schemas } from 'vs/base/common/network';
import { isEqual } from 'vs/base/common/resources';
import { URI } from 'vs/base/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ITextModel } from 'vs/editor/common/model';
import { FindStartFocusAction, getSelectionSearchString, IFindStartOptions, StartFindAction, StartFindReplaceAction } from 'vs/editor/contrib/find/browser/findController';
import { localize } from 'vs/nls';
import { Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { NotebookFindWidget } from 'vs/workbench/contrib/notebook/browser/contrib/find/notebookFindWidget';
import { getNotebookEditorFromEditorPane } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { registerNotebookContribution } from 'vs/workbench/contrib/notebook/browser/notebookEditorExtensions';
import { CellUri } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workbench/contrib/notebook/common/notebookContextKeys';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

registerNotebookContribution(NotebookFindWidget.id, NotebookFindWidget);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'notebook.hideFind',
			title: { value: localize('notebookActions.hideFind', "Hide Find in Notebook"), original: 'Hide Find in Notebook' },
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED),
				primary: KeyCode.Escape,
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);

		if (!editor) {
			return;
		}

		const controller = editor.getContribution<NotebookFindWidget>(NotebookFindWidget.id);
		controller.hide();
		editor.focus();
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'notebook.find',
			title: { value: localize('notebookActions.findInNotebook', "Find in Notebook"), original: 'Find in Notebook' },
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, EditorContextKeys.focus.toNegated()),
				primary: KeyCode.KeyF | KeyMod.CtrlCmd,
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const editorService = accessor.get(IEditorService);
		const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);

		if (!editor) {
			return;
		}

		const controller = editor.getContribution<NotebookFindWidget>(NotebookFindWidget.id);
		controller.show();
	}
});

function notebookContainsTextModel(uri: URI, textModel: ITextModel) {
	if (textModel.uri.scheme === Schemas.vscodeNotebookCell) {
		const cellUri = CellUri.parse(textModel.uri);
		if (cellUri && isEqual(cellUri.notebook, uri)) {
			return true;
		}
	}

	return false;
}

function getSearchString(editor: ICodeEditor, opts: IFindStartOptions) {
	// Get the search string result, following the same logic in _start function in 'vs/editor/contrib/find/browser/findController'
	let searchString = '';
	if (opts.seedSearchStringFromSelection === 'single') {
		const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection, opts.seedSearchStringFromNonEmptySelection);
		if (selectionSearchString) {
			searchString = selectionSearchString;
		}
	} else if (opts.seedSearchStringFromSelection === 'multiple' && !opts.updateSearchScope) {
		const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection);
		if (selectionSearchString) {
			searchString = selectionSearchString;
		}
	}
	return searchString;
}


StartFindAction.addImplementation(100, (accessor: ServicesAccessor, codeEditor: ICodeEditor, args: any) => {
	const editorService = accessor.get(IEditorService);
	const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);

	if (!editor) {
		return false;
	}

	if (!editor.hasEditorFocus() && !editor.hasWebviewFocus()) {
		const codeEditorService = accessor.get(ICodeEditorService);
		// check if the active pane contains the active text editor
		const textEditor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
		if (editor.hasModel() && textEditor && textEditor.hasModel() && notebookContainsTextModel(editor.textModel.uri, textEditor.getModel())) {
			// the active text editor is in notebook editor
		} else {
			return false;
		}
	}

	const controller = editor.getContribution<NotebookFindWidget>(NotebookFindWidget.id);

	const searchString = getSearchString(codeEditor, {
		forceRevealReplace: false,
		seedSearchStringFromSelection: codeEditor.getOption(EditorOption.find).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
		seedSearchStringFromNonEmptySelection: codeEditor.getOption(EditorOption.find).seedSearchStringFromSelection === 'selection',
		seedSearchStringFromGlobalClipboard: codeEditor.getOption(EditorOption.find).globalFindClipboard,
		shouldFocus: FindStartFocusAction.FocusFindInput,
		shouldAnimate: true,
		updateSearchScope: false,
		loop: codeEditor.getOption(EditorOption.find).loop
	});

	controller.show(searchString);
	return true;
});

StartFindReplaceAction.addImplementation(100, (accessor: ServicesAccessor, codeEditor: ICodeEditor, args: any) => {
	const editorService = accessor.get(IEditorService);
	const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);

	if (!editor) {
		return false;
	}

	const controller = editor.getContribution<NotebookFindWidget>(NotebookFindWidget.id);

	const searchString = getSearchString(codeEditor, {
		forceRevealReplace: false,
		seedSearchStringFromSelection: codeEditor.getOption(EditorOption.find).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
		seedSearchStringFromNonEmptySelection: codeEditor.getOption(EditorOption.find).seedSearchStringFromSelection === 'selection',
		seedSearchStringFromGlobalClipboard: codeEditor.getOption(EditorOption.find).globalFindClipboard,
		shouldFocus: FindStartFocusAction.FocusFindInput,
		shouldAnimate: true,
		updateSearchScope: false,
		loop: codeEditor.getOption(EditorOption.find).loop
	});

	if (controller) {
		controller.replace(searchString);
		return true;
	}

	return false;
});

