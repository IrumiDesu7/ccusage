import process from "node:process";
import { cli } from "gunshi";
import { description, name, version } from "../../package.json";
import { dailyCommand } from "./daily.ts";
import { mcpCommand } from "./mcp.ts";
import { sessionCommand } from "./session.ts";

// Create subcommands map
const subCommands = new Map();
subCommands.set("daily", dailyCommand);
subCommands.set("session", sessionCommand);
subCommands.set("mcp", mcpCommand);

const mainCommand = dailyCommand;

await cli(process.argv.slice(2), mainCommand, {
	name,
	version,
	description,
	subCommands,
	renderHeader: null,
});
