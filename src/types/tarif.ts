export type SkemaTarif = "per_soal" | "per_paket";

export interface ItemTarifSetting {
  skema: SkemaTarif;
  nominal: number;
  catatan?: string;
}

export interface TarifSettings {
  pembuatan: ItemTarifSetting;
  validasi: ItemTarifSetting;
  updatedAt?: string;
  updatedBy?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export const SETTINGS_KEY_TARIF = "tarif_honorarium_settings";

export const DEFAULT_TARIF_SETTINGS: TarifSettings = {
  pembuatan: {
    skema: "per_soal",
    nominal: 50000,
    catatan: "Tarif standar penulisan butir soal baru",
  },
  validasi: {
    skema: "per_soal",
    nominal: 25000,
    catatan: "Tarif standar telaah & validasi butir soal",
  },
};
