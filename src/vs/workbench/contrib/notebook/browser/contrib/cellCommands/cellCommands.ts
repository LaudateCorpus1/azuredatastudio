/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod } from 'vs/base/common/keyCodes';
import { Mimes } from 'vs/base/common/mime';
import { IBulkEditService, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { localize } from 'vs/nls';
import { MenuId, registerAction2 } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { InputFocusedContext, InputFocusedContextKey } from 'vs/platform/contextkey/common/contextkeys';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { ResourceNotebookCellEdit } from 'vs/workbench/contrib/bulkEdit/browser/bulkCellEdits';
import { changeCellToKind, computeCellLinesContents, copyCellRange, joinCellsWithSurrounds, moveCellRange } from 'vs/workbench/contrib/notebook/browser/controller/cellOperations';
import { cellExecutionArgs, CellOverflowToolbarGroups, CellToolbarOrder, CELL_TITLE_CELL_GROUP_ID, INotebookCellActionContext, INotebookCellToolbarActionContext, INotebookCommandContext, NotebookCellAction, NotebookMultiCellAction, parseMultiCellExecutionArgs } from 'vs/workbench/contrib/notebook/browser/controller/coreActions';
import { CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID, EXPAND_CELL_OUTPUT_COMMAND_ID, ICellViewModel, INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workbench/contrib/notebook/common/notebookContextKeys';
import * as icons from 'vs/workbench/contrib/notebook/browser/notebookIcons';
import { CellEditType, CellKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';

//#region Move/Copy cells
const MOVE_CELL_UP_COMMAND_ID = 'notebook.cell.moveUp';
const MOVE_CELL_DOWN_COMMAND_ID = 'notebook.cell.moveDown';
const COPY_CELL_UP_COMMAND_ID = 'notebook.cell.copyUp';
const COPY_CELL_DOWN_COMMAND_ID = 'notebook.cell.copyDown';

registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: MOVE_CELL_UP_COMMAND_ID,
				title: {
					value: localize('notebookActions.moveCellUp', "Move Cell Up"),
					original: 'Move Cell Up'
				},
				icon: icons.moveUpIcon,
				keybinding: {
					primary: KeyMod.Alt | KeyCode.UpArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeybindingWeight.WorkbenchContrib
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
					group: CellOverflowToolbarGroups.Edit,
					order: 13
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		return moveCellRange(context, 'up');
	}
});

registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: MOVE_CELL_DOWN_COMMAND_ID,
				title: {
					value: localize('notebookActions.moveCellDown', "Move Cell Down"),
					original: 'Move Cell Down'
				},
				icon: icons.moveDownIcon,
				keybinding: {
					primary: KeyMod.Alt | KeyCode.DownArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeybindingWeight.WorkbenchContrib
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
					group: CellOverflowToolbarGroups.Edit,
					order: 14
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		return moveCellRange(context, 'down');
	}
});

registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: COPY_CELL_UP_COMMAND_ID,
				title: {
					value: localize('notebookActions.copyCellUp', "Copy Cell Up"),
					original: 'Copy Cell Up'
				},
				keybinding: {
					primary: KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeybindingWeight.WorkbenchContrib
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		return copyCellRange(context, 'up');
	}
});

registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: COPY_CELL_DOWN_COMMAND_ID,
				title: {
					value: localize('notebookActions.copyCellDown', "Copy Cell Down"),
					original: 'Copy Cell Down'
				},
				keybinding: {
					primary: KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
					weight: KeybindingWeight.WorkbenchContrib
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
					group: CellOverflowToolbarGroups.Edit,
					order: 12
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		return copyCellRange(context, 'down');
	}
});


//#endregion

//#region Join/Split

const SPLIT_CELL_COMMAND_ID = 'notebook.cell.split';
const JOIN_CELL_ABOVE_COMMAND_ID = 'notebook.cell.joinAbove';
const JOIN_CELL_BELOW_COMMAND_ID = 'notebook.cell.joinBelow';


registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: SPLIT_CELL_COMMAND_ID,
				title: {
					value: localize('notebookActions.splitCell', "Split Cell"),
					original: 'Split Cell'
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.and(
						NOTEBOOK_EDITOR_EDITABLE,
						NOTEBOOK_CELL_EDITABLE,
						NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated()
					),
					order: CellToolbarOrder.SplitCell,
					group: CELL_TITLE_CELL_GROUP_ID
				},
				icon: icons.splitCellIcon,
				keybinding: {
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
					primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Backslash),
					weight: KeybindingWeight.WorkbenchContrib
				},
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		if (context.notebookEditor.isReadOnly) {
			return;
		}

		const bulkEditService = accessor.get(IBulkEditService);
		const cell = context.cell;
		const index = context.notebookEditor.getCellIndex(cell);
		const splitPoints = cell.focusMode === CellFocusMode.Container ? [{ lineNumber: 1, column: 1 }] : cell.getSelectionsStartPosition();
		if (splitPoints && splitPoints.length > 0) {
			await cell.resolveTextModel();

			if (!cell.hasModel()) {
				return;
			}

			const newLinesContents = computeCellLinesContents(cell, splitPoints);
			if (newLinesContents) {
				const language = cell.language;
				const kind = cell.cellKind;
				const mime = cell.mime;

				const textModel = await cell.resolveTextModel();
				await bulkEditService.apply(
					[
						new ResourceTextEdit(cell.uri, { range: textModel.getFullModelRange(), text: newLinesContents[0] }),
						new ResourceNotebookCellEdit(context.notebookEditor.textModel.uri,
							{
								editType: CellEditType.Replace,
								index: index + 1,
								count: 0,
								cells: newLinesContents.slice(1).map(line => ({
									cellKind: kind,
									language,
									mime,
									source: line,
									outputs: [],
									metadata: {}
								}))
							}
						)
					],
					{ quotableLabel: 'Split Notebook Cell' }
				);
			}
		}
	}
});


registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: JOIN_CELL_ABOVE_COMMAND_ID,
				title: {
					value: localize('notebookActions.joinCellAbove', "Join With Previous Cell"),
					original: 'Join With Previous Cell'
				},
				keybinding: {
					when: NOTEBOOK_EDITOR_FOCUSED,
					primary: KeyMod.WinCtrl | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyJ,
					weight: KeybindingWeight.WorkbenchContrib
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
					group: CellOverflowToolbarGroups.Edit,
					order: 10
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		const bulkEditService = accessor.get(IBulkEditService);
		return joinCellsWithSurrounds(bulkEditService, context, 'above');
	}
});

registerAction2(class extends NotebookCellAction {
	constructor() {
		super(
			{
				id: JOIN_CELL_BELOW_COMMAND_ID,
				title: {
					value: localize('notebookActions.joinCellBelow', "Join With Next Cell"),
					original: 'Join With Next Cell'
				},
				keybinding: {
					when: NOTEBOOK_EDITOR_FOCUSED,
					primary: KeyMod.WinCtrl | KeyMod.Alt | KeyCode.KeyJ,
					weight: KeybindingWeight.WorkbenchContrib
				},
				menu: {
					id: MenuId.NotebookCellTitle,
					when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
					group: CellOverflowToolbarGroups.Edit,
					order: 11
				}
			});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCellActionContext) {
		const bulkEditService = accessor.get(IBulkEditService);
		return joinCellsWithSurrounds(bulkEditService, context, 'below');
	}
});

//#endregion

//#region Change Cell Type

const CHANGE_CELL_TO_CODE_COMMAND_ID = 'notebook.cell.changeToCode';
const CHANGE_CELL_TO_MARKDOWN_COMMAND_ID = 'notebook.cell.changeToMarkdown';

registerAction2(class ChangeCellToCodeAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: CHANGE_CELL_TO_CODE_COMMAND_ID,
			title: {
				value: localize('notebookActions.changeCellToCode', "Change Cell to Code"),
				original: 'Change Cell to Code'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyCode.KeyY,
				weight: KeybindingWeight.WorkbenchContrib
			},
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
			menu: {
				id: MenuId.NotebookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
				group: CellOverflowToolbarGroups.Edit,
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		await changeCellToKind(CellKind.Code, context);
	}
});

registerAction2(class ChangeCellToMarkdownAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: CHANGE_CELL_TO_MARKDOWN_COMMAND_ID,
			title: {
				value: localize('notebookActions.changeCellToMarkdown', "Change Cell to Markdown"),
				original: 'Change Cell to Markdown'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
				primary: KeyCode.KeyM,
				weight: KeybindingWeight.WorkbenchContrib
			},
			precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
			menu: {
				id: MenuId.NotebookCellTitle,
				when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
				group: CellOverflowToolbarGroups.Edit,
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		await changeCellToKind(CellKind.Markup, context, 'markdown', Mimes.markdown);
	}
});

//#endregion

//#region Collapse Cell

const COLLAPSE_CELL_INPUT_COMMAND_ID = 'notebook.cell.collapseCellInput';
const COLLAPSE_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.collapseCellOutput';
const COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellInputs';
const EXPAND_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.expandAllCellInputs';
const COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellOutputs';
const EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.expandAllCellOutputs';
const TOGGLE_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.toggleOutputs';

registerAction2(class CollapseCellInputAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: COLLAPSE_CELL_INPUT_COMMAND_ID,
			title: {
				value: localize('notebookActions.collapseCellInput', "Collapse Cell Input"),
				original: 'Collapse Cell Input'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated()),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyMod.CtrlCmd | KeyCode.KeyC),
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	override parseArgs(accessor: ServicesAccessor, ...args: any[]): INotebookCommandContext | undefined {
		return parseMultiCellExecutionArgs(accessor, ...args);
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		if (context.ui) {
			context.cell.isInputCollapsed = true;
		} else {
			context.selectedCells.forEach(cell => cell.isInputCollapsed = true);
		}
	}
});

registerAction2(class ExpandCellInputAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: EXPAND_CELL_INPUT_COMMAND_ID,
			title: {
				value: localize('notebookActions.expandCellInput', "Expand Cell Input"),
				original: 'Expand Cell Input'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyMod.CtrlCmd | KeyCode.KeyC),
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	override parseArgs(accessor: ServicesAccessor, ...args: any[]): INotebookCommandContext | undefined {
		return parseMultiCellExecutionArgs(accessor, ...args);
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		if (context.ui) {
			context.cell.isInputCollapsed = false;
		} else {
			context.selectedCells.forEach(cell => cell.isInputCollapsed = false);
		}
	}
});

registerAction2(class CollapseCellOutputAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: COLLAPSE_CELL_OUTPUT_COMMAND_ID,
			title: {
				value: localize('notebookActions.collapseCellOutput', "Collapse Cell Output"),
				original: 'Collapse Cell Output'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyT),
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		if (context.ui) {
			context.cell.isOutputCollapsed = true;
		} else {
			context.selectedCells.forEach(cell => cell.isOutputCollapsed = true);
		}
	}
});

registerAction2(class ExpandCellOuputAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: EXPAND_CELL_OUTPUT_COMMAND_ID,
			title: {
				value: localize('notebookActions.expandCellOutput', "Expand Cell Output"),
				original: 'Expand Cell Output'
			},
			keybinding: {
				when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED),
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyT),
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		if (context.ui) {
			context.cell.isOutputCollapsed = false;
		} else {
			context.selectedCells.forEach(cell => cell.isOutputCollapsed = false);
		}
	}
});

registerAction2(class extends NotebookMultiCellAction {
	constructor() {
		super({
			id: TOGGLE_CELL_OUTPUTS_COMMAND_ID,
			precondition: NOTEBOOK_CELL_LIST_FOCUSED,
			title: {
				value: localize('notebookActions.toggleOutputs', "Toggle Outputs"),
				original: 'Toggle Outputs'
			},
			description: {
				description: localize('notebookActions.toggleOutputs', "Toggle Outputs"),
				args: cellExecutionArgs
			}
		});
	}

	override parseArgs(accessor: ServicesAccessor, ...args: any[]): INotebookCommandContext | undefined {
		return parseMultiCellExecutionArgs(accessor, ...args);
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		let cells: readonly ICellViewModel[] = [];
		if (context.ui) {
			cells = [context.cell];
		} else if (context.selectedCells) {
			cells = context.selectedCells;
		}

		for (const cell of cells) {
			cell.isOutputCollapsed = !cell.isOutputCollapsed;
		}
	}
});

registerAction2(class CollapseAllCellInputsAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID,
			title: {
				value: localize('notebookActions.collapseAllCellInput', "Collapse All Cell Inputs"),
				original: 'Collapse All Cell Inputs'
			},
			f1: true,
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		forEachCell(context.notebookEditor, cell => cell.isInputCollapsed = true);
	}
});

registerAction2(class ExpandAllCellInputsAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: EXPAND_ALL_CELL_INPUTS_COMMAND_ID,
			title: {
				value: localize('notebookActions.expandAllCellInput', "Expand All Cell Inputs"),
				original: 'Expand All Cell Inputs'
			},
			f1: true
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		forEachCell(context.notebookEditor, cell => cell.isInputCollapsed = false);
	}
});

registerAction2(class CollapseAllCellOutputsAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID,
			title: {
				value: localize('notebookActions.collapseAllCellOutput', "Collapse All Cell Outputs"),
				original: 'Collapse All Cell Outputs'
			},
			f1: true,
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		forEachCell(context.notebookEditor, cell => cell.isOutputCollapsed = true);
	}
});

registerAction2(class ExpandAllCellOutputsAction extends NotebookMultiCellAction {
	constructor() {
		super({
			id: EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID,
			title: {
				value: localize('notebookActions.expandAllCellOutput', "Expand All Cell Outputs"),
				original: 'Expand All Cell Outputs'
			},
			f1: true
		});
	}

	async runWithContext(accessor: ServicesAccessor, context: INotebookCommandContext | INotebookCellToolbarActionContext): Promise<void> {
		forEachCell(context.notebookEditor, cell => cell.isOutputCollapsed = false);
	}
});

//#endregion

function forEachCell(editor: INotebookEditor, callback: (cell: ICellViewModel, index: number) => void) {
	for (let i = 0; i < editor.getLength(); i++) {
		const cell = editor.cellAt(i);
		callback(cell!, i);
	}
}
