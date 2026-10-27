export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface ThermalPrinterSettings {
  autoPrintOnConfirmation: boolean;
  paperWidth: "80mm" | "58mm";
  triggerOn: "confirmation" | "incoming" | "both";
  chimeOnPrint: boolean;
  includeChefNotes: boolean;
  autoCloseAfterPrint: boolean;
}

export const DEFAULT_THERMAL_SETTINGS: ThermalPrinterSettings = {
  autoPrintOnConfirmation: true,
  paperWidth: "80mm",
  triggerOn: "both",
  chimeOnPrint: true,
  includeChefNotes: true,
  autoCloseAfterPrint: false,
};

export interface PaymentSettings {
  paystackEnabled: boolean;
  bankTransferEnabled: boolean;
  frontDeskEnabled: boolean;
  bankDetails: BankDetails;
  noticeMessage: string;
  thermalPrinter?: ThermalPrinterSettings;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  paystackEnabled: true,
  bankTransferEnabled: true,
  frontDeskEnabled: true,
  bankDetails: {
    bankName: "Zenith Bank",
    accountName: "Banky Hotel & Suites Ltd",
    accountNumber: "1018273645",
    instructions: "Please include your reservation reference in the transfer narration and show proof of payment at check-in.",
  },
  noticeMessage: "Online Paystack payment is currently offline. Direct Bank Transfer and Front-Desk settlements are active.",
  thermalPrinter: DEFAULT_THERMAL_SETTINGS,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};
