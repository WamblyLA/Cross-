export type TopBarMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => unknown | Promise<unknown>;
};

export type TopBarMenuSection = {
  id: string;
  title?: string;
  items: TopBarMenuItem[];
};

export type TopBarMenuConfig = {
  id: string;
  label: string;
  sections: TopBarMenuSection[];
};

export type OverflowSubmenuState = {
  menuId: string;
  anchorRect: DOMRect;
};
