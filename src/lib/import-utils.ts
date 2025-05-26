
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Expense, Category, PaymentMethod, Currency, Income, IncomeSource } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';
import { BASE_CURRENCY_ID } from './currency-utils';
import { initialCategoriesData } from './mock-data'; // Import for direct modification

// --- Generic File Parsers ---

export async function parseCSV(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as any[][]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export async function parseExcel(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", rawNumbers: false }) as any[][];
        resolve(jsonData);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

// --- Helper Functions ---

function normalizeString(str: string | undefined | null): string {
  return (str || '').toString().trim().toLowerCase();
}

function titleCase(str: string): string {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


function parseImportedDate(value: any): Date | undefined {
  if (!value) return undefined;
  let date: Date;
  if (value instanceof Date && isValid(value)) {
    date = value;
  } else {
    const dateString = value.toString().replace(/\./g, '-');
    date = parseISO(dateString);
    if (!isValid(date)) {
      date = new Date(dateString);
    }
    if (!isValid(date)) {
        date = new Date(value.toString());
    }
  }
  return isValid(date) ? date : undefined;
}

function parseBoolean(value: any): boolean | undefined {
    const strValue = normalizeString(value?.toString());
    if (strValue === 'true' || strValue === 'yes' || strValue === '1') return true;
    if (strValue === 'false' || strValue === 'no' || strValue === '0') return false;
    return undefined;
}


// --- Expense Processing ---

const EXPENSE_EXPECTED_HEADERS_FROM_USER_CSV = [
    "date", "amount", "currency", "account", "category", "categorygroup", "note",
    "issubscription", "nextduedate"
];

function getExpenseColumnIndexMap(headers: string[]): Record<string, number> {
    const lowerHeaders = headers.map(h => normalizeString(h));
    const map: Record<string, number> = {};
    EXPENSE_EXPECTED_HEADERS_FROM_USER_CSV.forEach(expectedHeader => {
        const normalizedExpectedHeader = normalizeString(expectedHeader);
        const index = lowerHeaders.indexOf(normalizedExpectedHeader);
        if (index !== -1) {
            map[normalizedExpectedHeader] = index;
        }
    });
    return map;
}


export function processImportedExpenses(
  rawData: any[][],
  existingCategories: Category[], // This is initialCategoriesData, passed for modification
  currencies: Currency[],
  paymentMethods: PaymentMethod[]
): { newExpenses: Expense[]; errors: string[]; infoMessages: string[]; skippedRows: number, createdCategoryCount: number } {
  const newExpenses: Expense[] = [];
  const errors: string[] = [];
  const infoMessages: string[] = [];
  let skippedRows = 0;
  let createdCategoryCount = 0;

  if (rawData.length === 0) {
    errors.push("Imported file is empty.");
    return { newExpenses, errors, infoMessages, skippedRows, createdCategoryCount };
  }

  const headerRow = rawData[0].map(h => normalizeString(h?.toString() || ""));
  const dataRows = rawData.slice(1);

  const colMap = getExpenseColumnIndexMap(headerRow);

  const essentialHeadersInUserCsv = ["date", "amount", "category"];
  const missingHeaders = essentialHeadersInUserCsv.filter(eh => colMap[normalizeString(eh)] === undefined);

  if (missingHeaders.length > 0) {
      errors.push(`Missing essential columns in the imported file: ${missingHeaders.join(", ")}. Please ensure your file has at least: Date, Amount, Category.`);
      return { newExpenses, errors, infoMessages, skippedRows, createdCategoryCount };
  }

  dataRows.forEach((row, index) => {
    const rowIndex = index + 2;

    const dateValue = row[colMap['date']];
    let amountValue = row[colMap['amount']];
     if (typeof amountValue === 'string') {
        amountValue = amountValue.replace(/,/g, ''); // Remove commas for thousands separator
    }

    const csvSubCategoryNameInput = row[colMap['category']];
    let csvMainCategoryNameInput = colMap['categorygroup'] !== undefined ? row[colMap['categorygroup']] : "";

    const currencyCodeValue = colMap['currency'] !== undefined ? normalizeString(row[colMap['currency']]) : undefined;
    const paymentMethodNameValue = colMap['account'] !== undefined ? normalizeString(row[colMap['account']]) : undefined;
    const noteValue = colMap['note'] !== undefined ? row[colMap['note']]?.toString().trim() : "";

    const isSubscriptionValue = colMap['issubscription'] !== undefined ? row[colMap['issubscription']] : undefined;
    const nextDueDateValue = colMap['nextduedate'] !== undefined ? row[colMap['nextduedate']] : undefined;

    if (!dateValue || !amountValue || !csvSubCategoryNameInput) {
      errors.push(`Row ${rowIndex}: Missing required data (Date, Amount, or Category column).`);
      skippedRows++;
      return;
    }

    const date = parseImportedDate(dateValue);
    const amount = Math.abs(parseFloat(amountValue?.toString() || "0"));


    if (!date) {
      errors.push(`Row ${rowIndex}: Invalid date format for '${dateValue}'.`);
      skippedRows++;
      return;
    }
    if (isNaN(amount) || amount < 0) {
       errors.push(`Row ${rowIndex}: Invalid amount '${amountValue}'. Must be a non-negative number.`);
       skippedRows++;
       return;
    }

    let targetCategoryId: string | undefined = undefined;
    const csvSubCategoryName = titleCase(csvSubCategoryNameInput.toString());
    let csvMainCategoryName = titleCase(csvMainCategoryNameInput.toString());

    if (normalizeString(csvMainCategoryName) === "car") {
        infoMessages.push(`Row ${rowIndex}: Mapping 'Category group: Car' to 'Transport'.`);
        csvMainCategoryName = "Transport";
    }

    let finalCategoryNameForDescription = csvSubCategoryName;

    if (csvMainCategoryName) {
        let mainCategory = initialCategoriesData.find(c => normalizeString(c.name) === normalizeString(csvMainCategoryName) && !c.parentId);
        if (!mainCategory) {
            const newMainCategoryId = `cat-imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            mainCategory = { id: newMainCategoryId, name: csvMainCategoryName };
            initialCategoriesData.push(mainCategory);
            createdCategoryCount++;
            infoMessages.push(`Row ${rowIndex}: Created new main category '${csvMainCategoryName}'.`);
        }

        let subCategory = initialCategoriesData.find(c => normalizeString(c.name) === normalizeString(csvSubCategoryName) && c.parentId === mainCategory!.id);
        if (!subCategory) {
            const newSubCategoryId = `cat-imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            subCategory = { id: newSubCategoryId, name: csvSubCategoryName, parentId: mainCategory!.id };
            initialCategoriesData.push(subCategory);
            createdCategoryCount++;
            infoMessages.push(`Row ${rowIndex}: Created new sub-category '${csvSubCategoryName}' under '${mainCategory!.name}'.`);
        }
        targetCategoryId = subCategory.id;
        finalCategoryNameForDescription = subCategory.name;

    } else if (csvSubCategoryName) {
        let mainCategory = initialCategoriesData.find(c => normalizeString(c.name) === normalizeString(csvSubCategoryName) && !c.parentId);
        if (!mainCategory) {
            const newMainCategoryId = `cat-imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            mainCategory = { id: newMainCategoryId, name: csvSubCategoryName };
            initialCategoriesData.push(mainCategory);
            createdCategoryCount++;
            infoMessages.push(`Row ${rowIndex}: Created new main category '${csvSubCategoryName}' from 'Category' column.`);
        }
        targetCategoryId = mainCategory.id;
        finalCategoryNameForDescription = mainCategory.name;
    }


    if (!targetCategoryId) {
        errors.push(`Row ${rowIndex}: Could not determine or create a valid category for '${csvMainCategoryName || csvSubCategoryName}'.`);
        skippedRows++;
        return;
    }

    let currencyIdToUse = BASE_CURRENCY_ID;
    if (currencyCodeValue && normalizeString(currencyCodeValue) !== "") {
        const currency = currencies.find(c => normalizeString(c.code) === currencyCodeValue);
        if (!currency) {
          infoMessages.push(`Row ${rowIndex}: Currency code '${currencyCodeValue}' not found. Defaulting to base currency. Please add this currency in settings if needed.`);
        } else {
          currencyIdToUse = currency.id;
        }
    }

    let paymentMethodId: string | undefined = undefined;
    if (paymentMethodNameValue && normalizeString(paymentMethodNameValue) !== "") {
      const paymentMethod = paymentMethods.find(pm => normalizeString(pm.name) === paymentMethodNameValue);
      if (!paymentMethod) {
        infoMessages.push(`Row ${rowIndex}: Payment method '${paymentMethodNameValue}' (from 'Account') not found. It will be left blank.`);
      } else {
        paymentMethodId = paymentMethod.id;
      }
    }

    let descriptionForExpense = noteValue;
    if (!descriptionForExpense) {
        descriptionForExpense = finalCategoryNameForDescription;
    }

    const isSubscription = parseBoolean(isSubscriptionValue);
    let nextDueDate: Date | undefined = undefined;
    if (isSubscription) {
        nextDueDate = parseImportedDate(nextDueDateValue);
        if (!nextDueDate && isSubscriptionValue) {
            errors.push(`Row ${rowIndex}: 'Next Due Date' is missing or invalid for subscription. Subscription flag ignored.`);
        }
    }

    newExpenses.push({
      id: `imported-exp-${Date.now()}-${index}`,
      date,
      description: descriptionForExpense,
      amount,
      categoryId: targetCategoryId,
      currencyId: currencyIdToUse,
      paymentMethodId,
      isSubscription: isSubscription && !!nextDueDate,
      nextDueDate: isSubscription && nextDueDate ? nextDueDate : undefined,
    });
  });

  return { newExpenses, errors, infoMessages, skippedRows, createdCategoryCount };
}


// --- Income Processing ---

const INCOME_EXPECTED_HEADERS = [
    "date", "description", "amount", "incomesourcename", "currencycode"
];

function getIncomeColumnIndexMap(headers: string[]): Record<string, number> {
    const lowerHeaders = headers.map(h => normalizeString(h));
    const map: Record<string, number> = {};
    INCOME_EXPECTED_HEADERS.forEach(expectedHeader => {
        const index = lowerHeaders.indexOf(normalizeString(expectedHeader));
        if (index !== -1) {
            map[expectedHeader] = index;
        }
    });
    return map;
}

export function processImportedIncomes(
  rawData: any[][],
  incomeSources: IncomeSource[],
  currencies: Currency[]
): { newIncomes: Income[]; errors: string[]; infoMessages: string[]; skippedRows: number } {
  const newIncomes: Income[] = [];
  const errors: string[] = [];
  const infoMessages: string[] = [];
  let skippedRows = 0;

  if (rawData.length === 0) {
    errors.push("Imported file is empty.");
    return { newIncomes, errors, infoMessages, skippedRows };
  }

  const headerRow = rawData[0].map(h => normalizeString(h?.toString() || ""));
  const dataRows = rawData.slice(1);

  const colMap = getIncomeColumnIndexMap(headerRow);

  const essentialHeaders = ["date", "description", "amount", "incomesourcename"];
  const missingHeaders = essentialHeaders.filter(eh => colMap[normalizeString(eh)] === undefined);


  if (missingHeaders.length > 0) {
      errors.push(`Missing essential columns for income import: ${missingHeaders.join(", ")}. Expected: Date, Description, Amount, IncomeSourceName, and optionally CurrencyCode.`);
      return { newIncomes, errors, infoMessages, skippedRows };
  }


  dataRows.forEach((row, index) => {
    const rowIndex = index + 2;

    const dateValue = row[colMap['date']];
    const descriptionValue = row[colMap['description']];
    const amountValue = row[colMap['amount']];
    const incomeSourceNameValue = normalizeString(row[colMap['incomesourcename']]);
    const currencyCodeValue = colMap['currencycode'] !== undefined ? normalizeString(row[colMap['currencycode']]) : undefined;


    if (!dateValue || !descriptionValue || !amountValue || !incomeSourceNameValue) {
      errors.push(`Row ${rowIndex}: Missing required data for income (Date, Description, Amount, or IncomeSourceName).`);
      skippedRows++;
      return;
    }

    const date = parseImportedDate(dateValue);
    const amount = parseFloat(amountValue?.toString().replace(/[^0-9.-]+/g, "") || "0");

    if (!date) {
      errors.push(`Row ${rowIndex}: Invalid date format for income '${dateValue}'.`);
      skippedRows++;
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowIndex}: Invalid amount for income '${amountValue}'. Must be a positive number.`);
      skippedRows++;
      return;
    }

    const incomeSource = incomeSources.find(s => normalizeString(s.name) === incomeSourceNameValue);
    if (!incomeSource) {
      errors.push(`Row ${rowIndex}: Income source '${incomeSourceNameValue}' not found. Please add it first or ensure the name matches exactly.`);
      skippedRows++;
      return;
    }

    let currencyIdToUse = BASE_CURRENCY_ID;
    if (currencyCodeValue && normalizeString(currencyCodeValue) !== "") {
        const currency = currencies.find(c => normalizeString(c.code) === currencyCodeValue);
        if (!currency) {
          infoMessages.push(`Row ${rowIndex}: Currency code '${currencyCodeValue}' for income not found. Defaulting to base currency.`);
        } else {
          currencyIdToUse = currency.id;
        }
    }


    newIncomes.push({
      id: `imported-inc-${Date.now()}-${index}`,
      date,
      description: descriptionValue.toString(),
      amount,
      incomeSourceId: incomeSource.id,
      currencyId: currencyIdToUse,
    });
  });

  return { newIncomes, errors, infoMessages, skippedRows };
}
