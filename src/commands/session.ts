import process from "node:process";
import Table from "cli-table3";
import { define } from "gunshi";
import pc from "picocolors";
import {
	calculateTotals,
	createTotalsObject,
	createTotalsObjectWithCurrency,
	getTotalTokens,
	convertCostToCurrency,
} from "../calculate-cost.ts";
import { type LoadOptions, loadSessionData } from "../data-loader.ts";
import { detectMismatches, printMismatchReport } from "../debug.ts";
import { log, logger } from "../logger.ts";
import { sharedCommandConfig } from "../shared-args.ts";
import { formatCurrency, formatNumber } from "../utils.ts";
import { CurrencyService } from "../currency.js";
import type { Currency } from "../types.js";

export const sessionCommand = define({
	name: "session",
	description: "Show usage report grouped by conversation session",
	...sharedCommandConfig,
	async run(ctx) {
		if (ctx.values.json) {
			logger.level = 0;
		}

		const options: LoadOptions = {
			since: ctx.values.since,
			until: ctx.values.until,
			claudePath: ctx.values.path,
			mode: ctx.values.mode,
		};
		const sessionData = await loadSessionData(options);

		if (sessionData.length === 0) {
			if (ctx.values.json) {
				log(JSON.stringify([]));
			} else {
				logger.warn("No Claude usage data found.");
			}
			process.exit(0);
		}

		// Calculate totals
		const totals = calculateTotals(sessionData);

		// Show debug information if requested
		if (ctx.values.debug && !ctx.values.json) {
			const mismatchStats = await detectMismatches(ctx.values.path);
			printMismatchReport(mismatchStats, ctx.values.debugSamples);
		}

		if (ctx.values.json) {
			// Output JSON format
			const sessionsWithCurrency = await Promise.all(
				sessionData.map(async (data) => ({
					projectPath: data.projectPath,
					sessionId: data.sessionId,
					inputTokens: data.inputTokens,
					outputTokens: data.outputTokens,
					cacheCreationTokens: data.cacheCreationTokens,
					cacheReadTokens: data.cacheReadTokens,
					totalTokens: getTotalTokens(data),
					totalCost: await convertCostToCurrency(data.totalCost, ctx.values.currency),
					currency: ctx.values.currency,
					lastActivity: data.lastActivity,
				})),
			);
			const totalsWithCurrency = await createTotalsObjectWithCurrency(totals, ctx.values.currency);
			const jsonOutput = {
				sessions: sessionsWithCurrency,
				totals: totalsWithCurrency,
			};
			log(JSON.stringify(jsonOutput, null, 2));
		} else {
			// Print header
			logger.box("Claude Code Token Usage Report - By Session");

			// Create table
			const currencyLabel = ctx.values.currency === "USD" ? "Cost (USD)" : `Cost (${ctx.values.currency})`;
			const table = new Table({
				head: [
					"Project",
					"Session",
					"Input",
					"Output",
					"Cache Create",
					"Cache Read",
					"Total Tokens",
					currencyLabel,
					"Last Activity",
				],
				style: {
					head: ["cyan"],
				},
				colAligns: [
					"left",
					"left",
					"right",
					"right",
					"right",
					"right",
					"right",
					"right",
					"left",
				],
			});

			let maxProjectLength = 0;
			let maxSessionLength = 0;
			for (const data of sessionData) {
				const projectDisplay =
					data.projectPath.length > 20
						? `...${data.projectPath.slice(-17)}`
						: data.projectPath;
				const sessionDisplay = data.sessionId.split("-").slice(-2).join("-"); // Display last two parts of session ID

				maxProjectLength = Math.max(maxProjectLength, projectDisplay.length);
				maxSessionLength = Math.max(maxSessionLength, sessionDisplay.length);

				const convertedCost = await convertCostToCurrency(data.totalCost, ctx.values.currency);
				table.push([
					projectDisplay,
					sessionDisplay,
					formatNumber(data.inputTokens),
					formatNumber(data.outputTokens),
					formatNumber(data.cacheCreationTokens),
					formatNumber(data.cacheReadTokens),
					formatNumber(getTotalTokens(data)),
					CurrencyService.formatAmount(convertedCost, ctx.values.currency),
					data.lastActivity,
				]);
			}

			// Add separator
			table.push([
				"─".repeat(maxProjectLength), // For Project
				"─".repeat(maxSessionLength), // For Session
				"─".repeat(12), // For Input Tokens
				"─".repeat(12), // For Output Tokens
				"─".repeat(12), // For Cache Create
				"─".repeat(12), // For Cache Read
				"─".repeat(12), // For Total Tokens
				"─".repeat(10), // For Cost
				"─".repeat(12), // For Last Activity
			]);

			// Add totals
			const convertedTotalCost = await convertCostToCurrency(totals.totalCost, ctx.values.currency);
			table.push([
				pc.yellow("Total"),
				"", // Empty for Session column in totals
				pc.yellow(formatNumber(totals.inputTokens)),
				pc.yellow(formatNumber(totals.outputTokens)),
				pc.yellow(formatNumber(totals.cacheCreationTokens)),
				pc.yellow(formatNumber(totals.cacheReadTokens)),
				pc.yellow(formatNumber(getTotalTokens(totals))),
				pc.yellow(CurrencyService.formatAmount(convertedTotalCost, ctx.values.currency)),
				"",
			]);

			log(table.toString());
		}
	},
});
