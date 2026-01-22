import type { Component, SettingItem, SettingsListTheme } from "@mariozechner/pi-tui";
import {
	Input,
	fuzzyFilter,
	getEditorKeybindings,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";

export interface SettingsListOptions {
	enableSearch?: boolean;
}

export type { SettingItem, SettingsListTheme };

export class SettingsList implements Component {
	private items: SettingItem[];
	private filteredItems: SettingItem[];
	private theme: SettingsListTheme;
	private selectedIndex = 0;
	private maxVisible: number;
	private onChange: (id: string, newValue: string) => void;
	private onCancel: () => void;
	private searchInput?: Input;
	private searchEnabled: boolean;
	private submenuComponent: Component | null = null;
	private submenuItemIndex: number | null = null;

	constructor(
		items: SettingItem[],
		maxVisible: number,
		theme: SettingsListTheme,
		onChange: (id: string, newValue: string) => void,
		onCancel: () => void,
		options: SettingsListOptions = {},
	) {
		this.items = items;
		this.filteredItems = items;
		this.maxVisible = maxVisible;
		this.theme = theme;
		this.onChange = onChange;
		this.onCancel = onCancel;
		this.searchEnabled = options.enableSearch ?? false;

		if (this.searchEnabled) {
			this.searchInput = new Input();
		}
	}

	/** Update an item's currentValue */
	updateValue(id: string, newValue: string): void {
		const item = this.items.find((i) => i.id === id);
		if (item) {
			item.currentValue = newValue;
		}
	}

	invalidate(): void {
		this.submenuComponent?.invalidate?.();
	}

	render(width: number): string[] {
		// If submenu is active, render it instead
		if (this.submenuComponent) {
			return this.submenuComponent.render(width);
		}
		return this.renderMainList(width);
	}

	private renderMainList(width: number): string[] {
		const lines: string[] = [];
		if (this.searchEnabled && this.searchInput) {
			lines.push(...this.searchInput.render(width));
			lines.push("");
		}

		if (this.items.length === 0) {
			lines.push(this.theme.hint("  No settings available"));
			if (this.searchEnabled) {
				this.addHintLine(lines);
			}
			return lines;
		}

		const displayItems = this.searchEnabled ? this.filteredItems : this.items;
		if (displayItems.length === 0) {
			lines.push(this.theme.hint("  No matching settings"));
			this.addHintLine(lines);
			return lines;
		}

		// Calculate visible range with scrolling
		const startIndex = Math.max(
			0,
			Math.min(
				this.selectedIndex - Math.floor(this.maxVisible / 2),
				displayItems.length - this.maxVisible,
			),
		);
		const endIndex = Math.min(startIndex + this.maxVisible, displayItems.length);

		// Calculate max label width for alignment
		const maxLabelWidth = Math.min(30, Math.max(...this.items.map((item) => visibleWidth(item.label))));

		// Render visible items
		for (let i = startIndex; i < endIndex; i++) {
			const item = displayItems[i];
			if (!item) continue;
			const isSelected = i === this.selectedIndex;
			const prefix = isSelected ? this.theme.cursor : "  ";
			const prefixWidth = visibleWidth(prefix);

			// Pad label to align values
			const labelPadded = item.label + " ".repeat(Math.max(0, maxLabelWidth - visibleWidth(item.label)));
			const labelText = this.theme.label(labelPadded, isSelected);

			// Calculate space for value
			const separator = "  ";
			const usedWidth = prefixWidth + maxLabelWidth + visibleWidth(separator);
			const valueMaxWidth = Math.max(0, width - usedWidth - 2);
			const valueText = this.theme.value(truncateToWidth(item.currentValue, valueMaxWidth, ""), isSelected);
			const line = prefix + labelText + separator + valueText;
			lines.push(truncateToWidth(line, width, ""));
		}

		// Add scroll indicator if needed
		if (startIndex > 0 || endIndex < displayItems.length) {
			const scrollText = `  (${this.selectedIndex + 1}/${displayItems.length})`;
			lines.push(this.theme.hint(truncateToWidth(scrollText, width - 2, "")));
		}

		// Add description for selected item
		const selectedItem = displayItems[this.selectedIndex];
		if (selectedItem?.description) {
			lines.push("");
			const wrapWidth = Math.max(1, width - 4);
			const wrappedDesc = wrapTextWithAnsi(selectedItem.description, wrapWidth);
			for (const line of wrappedDesc) {
				const prefixed = `  ${line}`;
				lines.push(this.theme.description(truncateToWidth(prefixed, width, "")));
			}
		}

		// Add options for selected item
		if (selectedItem?.values && selectedItem.values.length > 0) {
			if (!selectedItem.description) {
				lines.push("");
			}
			const separator = this.theme.description(" • ");
			const options = selectedItem.values
				.map((value) => this.theme.value(value, value === selectedItem.currentValue))
				.join(separator);
			const optionsLine = `${this.theme.description("Options: ")}${options}`;
			const wrapWidth = Math.max(1, width - 4);
			const wrappedOptions = wrapTextWithAnsi(optionsLine, wrapWidth);
			for (const line of wrappedOptions) {
				const prefixed = `  ${line}`;
				lines.push(truncateToWidth(prefixed, width, ""));
			}
		}

		// Add hint
		this.addHintLine(lines);
		return lines;
	}

	handleInput(data: string): void {
		// If submenu is active, delegate all input to it
		// The submenu's onCancel (triggered by escape) will call done() which closes it
		if (this.submenuComponent) {
			this.submenuComponent.handleInput?.(data);
			return;
		}

		const kb = getEditorKeybindings();
		const displayItems = this.searchEnabled ? this.filteredItems : this.items;

		if (kb.matches(data, "selectUp")) {
			if (displayItems.length === 0) return;
			this.selectedIndex = this.selectedIndex === 0 ? displayItems.length - 1 : this.selectedIndex - 1;
		} else if (kb.matches(data, "selectDown")) {
			if (displayItems.length === 0) return;
			this.selectedIndex = this.selectedIndex === displayItems.length - 1 ? 0 : this.selectedIndex + 1;
		} else if (kb.matches(data, "cursorLeft")) {
			this.stepValue(-1);
		} else if (kb.matches(data, "cursorRight")) {
			this.stepValue(1);
		} else if (kb.matches(data, "selectConfirm") || data === " ") {
			this.activateItem();
		} else if (kb.matches(data, "selectCancel")) {
			this.onCancel();
		} else if (this.searchEnabled && this.searchInput) {
			const sanitized = data.replace(/ /g, "");
			if (!sanitized) {
				return;
			}
			this.searchInput.handleInput(sanitized);
			this.applyFilter(this.searchInput.getValue());
		}
	}

	private stepValue(direction: -1 | 1): void {
		const displayItems = this.searchEnabled ? this.filteredItems : this.items;
		const item = displayItems[this.selectedIndex];
		if (!item || !item.values || item.values.length === 0) return;
		const values = item.values;
		let currentIndex = values.indexOf(item.currentValue);
		if (currentIndex === -1) {
			currentIndex = direction > 0 ? 0 : values.length - 1;
		}
		const nextIndex = (currentIndex + direction + values.length) % values.length;
		const newValue = values[nextIndex];
		item.currentValue = newValue;
		this.onChange(item.id, newValue);
	}

	private activateItem(): void {
		const item = this.searchEnabled ? this.filteredItems[this.selectedIndex] : this.items[this.selectedIndex];
		if (!item) return;

		if (item.submenu) {
			// Open submenu, passing current value so it can pre-select correctly
			this.submenuItemIndex = this.selectedIndex;
			this.submenuComponent = item.submenu(item.currentValue, (selectedValue) => {
				if (selectedValue !== undefined) {
					item.currentValue = selectedValue;
					this.onChange(item.id, selectedValue);
				}
				this.closeSubmenu();
			});
		} else if (item.values && item.values.length > 0) {
			// Cycle through values
			const currentIndex = item.values.indexOf(item.currentValue);
			const nextIndex = (currentIndex + 1) % item.values.length;
			const newValue = item.values[nextIndex];
			item.currentValue = newValue;
			this.onChange(item.id, newValue);
		}
	}

	private closeSubmenu(): void {
		this.submenuComponent = null;
		// Restore selection to the item that opened the submenu
		if (this.submenuItemIndex !== null) {
			this.selectedIndex = this.submenuItemIndex;
			this.submenuItemIndex = null;
		}
	}

	private applyFilter(query: string): void {
		this.filteredItems = fuzzyFilter(this.items, query, (item) => item.label);
		this.selectedIndex = 0;
	}

	private addHintLine(lines: string[]): void {
		lines.push("");
		lines.push(
			this.theme.hint(
				this.searchEnabled
					? "  Type to search · Enter/Space or ←/→ to change · Esc to cancel"
					: "  Enter/Space or ←/→ to change · Esc to cancel",
			),
		);
	}
}
