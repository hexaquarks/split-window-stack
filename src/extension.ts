import * as vscode from 'vscode';

class NavigationStack {
    private _positions: vscode.Position[] = [];
    private _currentIndex: number = -1;

    public push(position: vscode.Position) {
        // Overwrite any forward history when a new position is added
		// in the history chain.
        this._positions = this._positions.slice(0, this._currentIndex + 1);_currentIndex

        this._positions.push(position);
        ++this._currentIndex;
    }

    public goBack(): vscode.Position | undefined {
        console.log("going back");
        console.log(`curr idx: ${this._currentIndex} out of ${this._positions.length}`);_currentIndex
        if (this.currentIndex > 0) {
            --this.currentIndex;
            return this._positions[this.currentIndex];
        }
        return undefined;
    }

    public goForward(): vscode.Position | undefined {
        console.log("going forward");
        console.log(`curr idx: ${this._currentIndex} out of ${this._positions.length}`);_currentIndex
        if (this._currentIndex < this._positions.length - 1) {
            ++this._currentIndex;
            return this._positions[this._currentIndex];_currentIndex
        }
        return undefined;
    }

    public get currentPosition(): vscode.Position | undefined {
        return this._positions[this._currentIndex];_currentIndex
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log("activating");
    // Map to store navigation stacks per TextEditor instance
    const navigationStacks = new Map<vscode.TextEditor, NavigationStack>();

    // Useful flag to prevent reentrance.
    let isNavigating = false;

    // Determines if a cursor movement is significant enough to record.
    const isSignificantMovement = (oldPos: vscode.Position, newPos: vscode.Position): boolean => {
        // Consider movement significant if it jumps more than 5 lines.
        const lineThreshold = 5;
        const columnThreshold = 10;

        const lineDifference = Math.abs(newPos.line - oldPos.line);
        const columnDifference = Math.abs(newPos.character - oldPos.character);

        return lineDifference >= lineThreshold || columnDifference >= columnThreshold;
    }

    // Reveals a position in the editor by setting the cursor and scrolling to it.
    const revealPosition = (editor: vscode.TextEditor, position: vscode.Position) => {
        // revealRange triggers an event, introducing reentrance issues.
        isNavigating = true;

        // We capture the selection and the range at the given position then reveal it.
        const newSelection = new vscode.Selection(position, position);
        const newRange = new vscode.Range(position, position);

        editor.selection = newSelection;
        editor.revealRange(newRange, vscode.TextEditorRevealType.InCenter);
    }

    // Keep track of the last known positions per editor
    const lastPositions = new Map<vscode.TextEditor, vscode.Position>();

    // So far let us track just the selection difference. Other listeners will have to be 
    // implemented in the future.
    //
    // Listen to cursor movements and record significant changes
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (isNavigating) {
			isNavigating = false;
            return;
        }

        const editor = event.textEditor;
        const newPosition = event.selections[0].active;

        let stack = navigationStacks.get(editor) || new NavigationStack();

        const lastPosition = lastPositions.get(editor); // I think !lastPosition <=> isNewEditorSelected
        const isNewEditorSelected = !navigationStacks.has(editor);

        if (isNewEditorSelected || !lastPosition || isSignificantMovement(lastPosition, newPosition)) {
            stack.push(newPosition);
        }

        navigationStacks.set(editor, stack);
        lastPositions.set(editor, newPosition);

    });

    // Register the new goBack command
    const goBackCommand = vscode.commands.registerCommand('splitwindowstack.goBack', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const stack = navigationStacks.get(editor);
            if (stack) {
                const position = stack.goBack();
                if (position) {
                    revealPosition(editor, position);
                } else {
                    vscode.window.showInformationMessage('No further back navigation history for this editor.');
                }
            }
        }
    });

    // Register the goForward command
    const goForwardCommand = vscode.commands.registerCommand('splitwindowstack.goForward', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const stack = navigationStacks.get(editor);
            if (stack) {
                const position = stack.goForward();
                if (position) {
                    revealPosition(editor, position);
                } else {
                    vscode.window.showInformationMessage('No further forward navigation history for this editor.');
                }
            }
        }
    });

    context.subscriptions.push(goBackCommand, goForwardCommand);
}

export function deactivate() { }
