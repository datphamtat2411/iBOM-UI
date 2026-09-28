export interface IbomSelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export type IbomComboboxOption<T> = IbomSelectOption<T>;

export interface IbomMenuItem<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  selected?: boolean;
}

export type IbomOptionFilter<T> = (option: IbomComboboxOption<T>, searchText: string) => boolean;
