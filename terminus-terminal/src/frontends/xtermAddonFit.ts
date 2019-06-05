/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from 'xterm';

interface ITerminalDimensions {
  /**
   * The number of rows in the terminal.
   */
  rows: number;

  /**
   * The number of columns in the terminal.
   */
  cols: number;
}

export class FitAddon implements ITerminalAddon {
  private _terminal: Terminal | undefined;

  constructor() {}

  public activate(terminal: Terminal): void {
    this._terminal = terminal;
  }

  public dispose(): void {}

  public fit(): void {
    const dims = this.proposeDimensions();
    if (!dims || !this._terminal) {
      return;
    }

    // TODO: Remove reliance on private API
    const core = (<any>this._terminal)._core;

    // Force a full render
    if (this._terminal.rows !== dims.rows || this._terminal.cols !== dims.cols) {
      core._renderCoordinator.clear();
      this._terminal.resize(dims.cols, dims.rows);
    }
  }

  public proposeDimensions(): ITerminalDimensions | undefined {
    if (!this._terminal) {
      return undefined;
    }

    if (!this._terminal.element.parentElement) {
      return undefined;
    }

    // TODO: Remove reliance on private API
    const core = (<any>this._terminal)._core;

    const parentElementStyle = window.getComputedStyle(this._terminal.element.parentElement);
    const parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'));
    const parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width')));
    const elementStyle = window.getComputedStyle(this._terminal.element);
    const elementPadding = {
      top: parseInt(elementStyle.getPropertyValue('padding-top')),
      bottom: parseInt(elementStyle.getPropertyValue('padding-bottom')),
      right: parseInt(elementStyle.getPropertyValue('padding-right')),
      left: parseInt(elementStyle.getPropertyValue('padding-left'))
    };
    const elementPaddingVer = elementPadding.top + elementPadding.bottom;
    const elementPaddingHor = elementPadding.right + elementPadding.left;
    const availableHeight = parentElementHeight - elementPaddingVer;
    const availableWidth = parentElementWidth - elementPaddingHor - core.viewport.scrollBarWidth;
    const geometry = {
      cols: Math.floor(availableWidth / core._renderCoordinator.dimensions.actualCellWidth),
      rows: Math.floor(availableHeight / core._renderCoordinator.dimensions.actualCellHeight)
    };
    return geometry;
  }
}
