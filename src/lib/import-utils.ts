
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Expense, Category, PaymentMethod, Currency, Income, IncomeSource } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';
import { BASE_CURRENCY_ID } from './currency-utils';
import { addCategoryDoc } from './services/category-service'; // For creating categories

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
    const dateString = value.toString().replace(/\./g, '-'); // Handle YYYY.MM.DD
    date = parseISO(dateString); // Handles YYYY-MM-DD and other ISO formats
    if (!isValid(date)) { // Fallback for other common formats like MM/DD/YYYY
      date = new Date(dateString); 
    }
    if (!isValid(date)) { // Final fallback if previous parsing failed
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


export async function processImportedExpenses(
  userId: string, // Added userId for category creation
  rawData: any[][],
  userCategories: Category[], 
  userCurrencies: Currency[],  
  userPaymentMethods: PaymentMethod[] 
): Promise<{ newExpenses: Omit<Expense, "id">[]; errors: string[]; infoMessages: string[]; skippedRows: number; createdCategoryCount: number }> {
  const newExpenses: Omit<Expense, "id">[] = [];
  const errors: string[] = [];
  const infoMessages: string[] = [];
  let skippedRows = 0;
  let createdCategoryCount = 0; 

  let currentAppCategories = [...userCategories]; // Mutable copy for this import session

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

  for (const row of dataRows) { // Changed to for...of for async/await inside loop
    const rowIndex = dataRows.indexOf(row) + 2;

    const dateValue = row[colMap['date']];
    let amountValue = row[colMap['amount']];
     if (typeof amountValue === 'string') {
        amountValue = amountValue.replace(/,/g, ''); 
    }

    const csvSubCategoryNameInput = row[colMap['category']];
    let csvMainCategoryNameInput = colMap['categorygroup'] !== undefined ? row[colMap['categorygroup']] : "";

    const currencyCodeValue = colMap['currency'] !== undefined ? normalizeString(row[colMap['currency']]) : undefined;
    const paymentMethodNameValue = colMap['account'] !== undefined ? normalizeString(row[colMap['account']]) : undefined;
    const noteValue = colMap['note'] !== undefined ? row[colMap['note']]?.toString().trim() : "";

    const isSubscriptionValue = colMap['issubscription'] !== undefined ? row[colMap['issubscription']] : undefined;
    const nextDueDateValue = colMap['nextduedate'] !== undefined ? row[colMap['nextduedate']] : undefined;

    if (!dateValue || !amountValue || !csvSubCategoryNameInput) {
      infoMessages.push(`Row ${rowIndex}: Missing required data (Date, Amount, or Category column). Row skipped.`);
      skippedRows++;
      continue;
    }

    const date = parseImportedDate(dateValue);
    const amount = Math.abs(parseFloat(amountValue?.toString() || "0"));


    if (!date) {
      infoMessages.push(`Row ${rowIndex}: Invalid date format for '${dateValue}'. Row skipped.`);
      skippedRows++;
      continue;
    }
    if (isNaN(amount) || amount < 0) { 
       infoMessages.push(`Row ${rowIndex}: Invalid amount '${amountValue}'. Must be a non-negative number. Row skipped.`);
       skippedRows++;
       continue;
    }

    let targetCategoryId: string | undefined = undefined;
    const csvSubCategoryName = titleCase(csvSubCategoryNameInput.toString());
    let csvMainCategoryName = titleCase(csvMainCategoryNameInput.toString());

    if (normalizeString(csvMainCategoryName) === "car") {
        infoMessages.push(`Row ${rowIndex}: Mapping 'Category group: Car' to 'Transport'.`);
        csvMainCategoryName = "Transport";
    }

    if (csvMainCategoryName) {
        let mainCategory = currentAppCategories.find(c => normalizeString(c.name) === normalizeString(csvMainCategoryName) && !c.parentId);
        if (!mainCategory) {
            infoMessages.push(`Row ${rowIndex}: Main category '${csvMainCategoryName}' not found. Creating it.`);
            try {
                mainCategory = await addCategoryDoc(userId, { name: csvMainCategoryName });
                currentAppCategories.push(mainCategory);
                createdCategoryCount++;
            } catch (e: any) {
                errors.push(`Row ${rowIndex}: Failed to create main category '${csvMainCategoryName}': ${e.message}. Row skipped.`);
                skippedRows++;
                continue;
            }
        }

        let subCategory = currentAppCategories.find(c => normalizeString(c.name) === normalizeString(csvSubCategoryName) && c.parentId === mainCategory.id);
        if (!subCategory) {
             infoMessages.push(`Row ${rowIndex}: Sub-category '${csvSubCategoryName}' under '${mainCategory.name}' not found. Creating it.`);
             try {
                subCategory = await addCategoryDoc(userId, { name: csvSubCategoryName, parentId: mainCategory.id });
                currentAppCategories.push(subCategory);
                createdCategoryCount++;
             } catch (e: any) {
                errors.push(`Row ${rowIndex}: Failed to create sub-category '${csvSubCategoryName}': ${e.message}. Row skipped.`);
                skippedRows++;
                continue;
            }
        }
        targetCategoryId = subCategory.id;

    } else if (csvSubCategoryName) { 
        let mainCategory = currentAppCategories.find(c => normalizeString(c.name) === normalizeString(csvSubCategoryName) && !c.parentId);
        if (!mainCategory) {
            infoMessages.push(`Row ${rowIndex}: Main category '${csvSubCategoryName}' (from 'Category' column) not found. Creating it.`);
            try {
                mainCategory = await addCategoryDoc(userId, { name: csvSubCategoryName });
                currentAppCategories.push(mainCategory);
                createdCategoryCount++;
            } catch (e: any) {
                errors.push(`Row ${rowIndex}: Failed to create main category '${csvSubCategoryName}': ${e.message}. Row skipped.`);
                skippedRows++;
                continue;
            }
        }
        targetCategoryId = mainCategory.id;
    }


    if (!targetCategoryId) {
        infoMessages.push(`Row ${rowIndex}: Could not determine a valid category for '${csvMainCategoryName || csvSubCategoryName}'. Row skipped.`);
        skippedRows++;
        continue;
    }

    let currencyIdToUse = BASE_CURRENCY_ID;
    if (currencyCodeValue && normalizeString(currencyCodeValue) !== "") {
        const currency = userCurrencies.find(c => normalizeString(c.code) === currencyCodeValue);
        if (!currency) {
          infoMessages.push(`Row ${rowIndex}: Currency code '${currencyCodeValue}' not found. Defaulting to base currency. Please add this currency in settings if needed.`);
        } else {
          currencyIdToUse = currency.id;
        }
    }

    let paymentMethodId: string | undefined = undefined;
    if (paymentMethodNameValue && normalizeString(paymentMethodNameValue) !== "") {
      const paymentMethod = userPaymentMethods.find(pm => normalizeString(pm.name) === paymentMethodNameValue);
      if (!paymentMethod) {
        infoMessages.push(`Row ${rowIndex}: Payment method '${paymentMethodNameValue}' (from 'Account') not found. It will be left blank. Please add it first if needed.`);
      } else {
        paymentMethodId = paymentMethod.id;
      }
    }

    let descriptionForExpense = noteValue;
    if (!descriptionForExpense) {
        const foundCategory = currentAppCategories.find(c => c.id === targetCategoryId);
        descriptionForExpense = foundCategory ? foundCategory.name : "Imported Expense";
    }


    const isSubscription = parseBoolean(isSubscriptionValue);
    let nextDueDate: Date | undefined = undefined;
    if (isSubscription) {
        nextDueDate = parseImportedDate(nextDueDateValue);
        if (!nextDueDate && (isSubscriptionValue !== undefined && isSubscriptionValue !== "")) { 
            infoMessages.push(`Row ${rowIndex}: 'Next Due Date' is missing or invalid for subscription marked as true. Subscription flag ignored for this row.`);
        }
    }

    newExpenses.push({
      date,
      description: descriptionForExpense,
      amount,
      categoryId: targetCategoryId,
      currencyId: currencyIdToUse,
      paymentMethodId,
      isSubscription: isSubscription && !!nextDueDate,
      nextDueDate: isSubscription && nextDueDate ? nextDueDate : undefined,
    });
  }

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
  // userId: string, // Potentially needed if income sources can be created
  rawData: any[][],
  userIncomeSources: IncomeSource[], 
  userCurrencies: Currency[]     
): { newIncomes: Omit<Income, "id">[]; errors: string[]; infoMessages: string[]; skippedRows: number } {
  const newIncomes: Omit<Income, "id">[] = [];
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
      infoMessages.push(`Row ${rowIndex}: Missing required data for income (Date, Description, Amount, or IncomeSourceName). Row skipped.`);
      skippedRows++;
      return;
    }

    const date = parseImportedDate(dateValue);
    let amount = parseFloat(amountValue?.toString().replace(/,/g, "") || "0"); // Remove commas from amount
    if (typeof amountValue === 'string' && amountValue.includes('(') && amountValue.includes(')')) { // Handle (1,234.56) for negative
      amount = -parseFloat(amountValue.replace(/[(),]/g, ''));
    }


    if (!date) {
      infoMessages.push(`Row ${rowIndex}: Invalid date format for income '${dateValue}'. Row skipped.`);
      skippedRows++;
      return;
    }
    if (isNaN(amount) || amount <= 0) { // Income should generally be positive
      infoMessages.push(`Row ${rowIndex}: Invalid amount for income '${amountValue}'. Must be a positive number. Row skipped.`);
      skippedRows++;
      return;
    }

    const incomeSource = userIncomeSources.find(s => normalizeString(s.name) === incomeSourceNameValue);
    if (!incomeSource) {
      infoMessages.push(`Row ${rowIndex}: Income source '${row[colMap['incomesourcename']]}' not found. Row Skipped. Please add it first or ensure the name matches exactly.`);
      skippedRows++;
      return;
    }

    let currencyIdToUse = BASE_CURRENCY_ID;
    if (currencyCodeValue && normalizeString(currencyCodeValue) !== "") {
        const currency = userCurrencies.find(c => normalizeString(c.code) === currencyCodeValue);
        if (!currency) {
          infoMessages.push(`Row ${rowIndex}: Currency code '${currencyCodeValue}' for income not found. Defaulting to base currency.`);
        } else {
          currencyIdToUse = currency.id;
        }
    }


    newIncomes.push({
      date,
      description: descriptionValue.toString(),
      amount,
      incomeSourceId: incomeSource.id,
      currencyId: currencyIdToUse,
    });
  });

  return { newIncomes, errors, infoMessages, skippedRows };
}
