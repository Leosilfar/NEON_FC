export type SettingsTab = "pieces" | "field" | "teams" | "appearance";

export interface AttrSliderProps {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}

export interface NeonToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export interface NeonBarProps {
  label: string;
  value: number;
  color: string;
}

export interface ColorPickerProps {
  value: string;
  onChange: (c: string) => void;
  label?: string;
}
