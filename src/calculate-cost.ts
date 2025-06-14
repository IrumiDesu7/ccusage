import type { DailyUsage, SessionUsage } from "./data-loader";
import type { TokenData, TokenTotals, Currency } from "./types";
import { currencyService } from "./currency.js";

export function calculateTotals(
	data: Array<DailyUsage | SessionUsage>,
): TokenTotals {
	return data.reduce(
		(acc, item) => ({
			inputTokens: acc.inputTokens + item.inputTokens,
			outputTokens: acc.outputTokens + item.outputTokens,
			cacheCreationTokens: acc.cacheCreationTokens + item.cacheCreationTokens,
			cacheReadTokens: acc.cacheReadTokens + item.cacheReadTokens,
			totalCost: acc.totalCost + item.totalCost,
		}),
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
			totalCost: 0,
		},
	);
}

export function getTotalTokens(tokens: TokenData): number {
	return (
		tokens.inputTokens +
		tokens.outputTokens +
		tokens.cacheCreationTokens +
		tokens.cacheReadTokens
	);
}

export function createTotalsObject(totals: TokenTotals) {
	return {
		inputTokens: totals.inputTokens,
		outputTokens: totals.outputTokens,
		cacheCreationTokens: totals.cacheCreationTokens,
		cacheReadTokens: totals.cacheReadTokens,
		totalTokens: getTotalTokens(totals),
		totalCost: totals.totalCost,
	};
}

export async function convertCostToCurrency(
	usdCost: number,
	targetCurrency: Currency,
): Promise<number> {
	return await currencyService.convertFromUSD(usdCost, targetCurrency);
}

export async function createTotalsObjectWithCurrency(
	totals: TokenTotals,
	currency: Currency,
) {
	const convertedCost = await convertCostToCurrency(totals.totalCost, currency);
	
	return {
		inputTokens: totals.inputTokens,
		outputTokens: totals.outputTokens,
		cacheCreationTokens: totals.cacheCreationTokens,
		cacheReadTokens: totals.cacheReadTokens,
		totalTokens: getTotalTokens(totals),
		totalCost: convertedCost,
		currency,
	};
}
