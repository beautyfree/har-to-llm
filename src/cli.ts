#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { HARFile } from './types';
import { HARConverter } from './converter';
import { Formatters } from './formatters';

const program = new Command();

program
  .name('har-to-llm')
  .description('Convert HAR files to LLM-friendly format')
  .version('1.0.0')
  .argument('<file>', 'HAR file to convert')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-f, --format <format>', 'Output format: markdown, json, text, curl, conversation, structured', 'markdown')
  .option('-m, --methods <methods>', 'Filter by HTTP methods (comma-separated)')
  .option('-s, --status <codes>', 'Filter by status codes (comma-separated)')
  .option('-d, --domains <domains>', 'Filter by domains (comma-separated)')
  .option('-e, --exclude-domains <domains>', 'Exclude domains (comma-separated)')
  .option('--min-duration <ms>', 'Minimum request duration in ms')
  .option('--max-duration <ms>', 'Maximum request duration in ms')
  .option('--no-deduplicate', 'Do not remove duplicate requests (default: deduplicate)')
  .option('--summary', 'Show summary only')
  .option('--verbose', 'Verbose output')
  .action(async (file: string, options: any) => {
    try {
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`Error: File '${file}' not found`));
        process.exit(1);
      }

      // Read and parse HAR file
      if (options.verbose) {
        console.log(chalk.blue(`Reading HAR file: ${file}`));
      }

      const harContent = fs.readFileSync(file, 'utf8');
      const harData: HARFile = JSON.parse(harContent);

      if (options.verbose) {
        console.log(chalk.blue(`Found ${harData.log.entries.length} entries`));
      }

      // Apply filters
      let filteredEntries = harData.log.entries;

      if (options.methods) {
        const methods = options.methods.split(',').map((m: string) => m.trim().toUpperCase());
        filteredEntries = HARConverter.filterEntries(filteredEntries, { methods });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries with methods: ${methods.join(', ')}`));
        }
      }

      if (options.status) {
        const statusCodes = options.status.split(',').map((s: string) => parseInt(s.trim()));
        filteredEntries = HARConverter.filterEntries(filteredEntries, { statusCodes });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries with status codes: ${statusCodes.join(', ')}`));
        }
      }

      if (options.domains) {
        const domains = options.domains.split(',').map((d: string) => d.trim());
        filteredEntries = HARConverter.filterEntries(filteredEntries, { domains });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries with domains: ${domains.join(', ')}`));
        }
      }

      if (options.excludeDomains) {
        const excludeDomains = options.excludeDomains.split(',').map((d: string) => d.trim());
        filteredEntries = HARConverter.filterEntries(filteredEntries, { excludeDomains });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries excluding domains: ${excludeDomains.join(', ')}`));
        }
      }

      if (options.minDuration) {
        const minDuration = parseInt(options.minDuration);
        filteredEntries = HARConverter.filterEntries(filteredEntries, { minDuration });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries with min duration: ${minDuration}ms`));
        }
      }

      if (options.maxDuration) {
        const maxDuration = parseInt(options.maxDuration);
        filteredEntries = HARConverter.filterEntries(filteredEntries, { maxDuration });
        if (options.verbose) {
          console.log(chalk.blue(`Filtered to ${filteredEntries.length} entries with max duration: ${maxDuration}ms`));
        }
      }

      // Apply deduplication (default: true, unless --no-deduplicate is specified)
      const shouldDeduplicate = options.deduplicate !== false;
      if (shouldDeduplicate) {
        const originalCount = filteredEntries.length;
        filteredEntries = HARConverter.filterEntries(filteredEntries, { deduplicate: true });
        if (options.verbose) {
          const removedCount = originalCount - filteredEntries.length;
          if (removedCount > 0) {
            console.log(chalk.blue(`Removed ${removedCount} duplicate requests (${filteredEntries.length} unique requests remaining)`));
          } else {
            console.log(chalk.blue('No duplicate requests found'));
          }
        }
      } else if (options.verbose) {
        console.log(chalk.blue('Deduplication disabled'));
      }

      if (filteredEntries.length === 0) {
        console.log(chalk.yellow('No entries match the specified filters'));
        process.exit(0);
      }

      // Generate output
      let output: string;

      if (options.summary) {
        const summary = HARConverter.generateSummary(filteredEntries);
        output = JSON.stringify(summary, null, 2);
      } else {
        const conversations = filteredEntries.map(entry => HARConverter.convertEntry(entry));

        switch (options.format.toLowerCase()) {
          case 'markdown':
            output = Formatters.toMarkdown(conversations);
            break;
          case 'json':
            output = Formatters.toJSON(conversations);
            break;
          case 'text':
            output = Formatters.toTextSummary(conversations);
            break;
          case 'curl':
            output = Formatters.toCurlCommands(conversations);
            break;
          case 'conversation':
            output = Formatters.toConversationLog(conversations);
            break;
          case 'structured':
            output = Formatters.toStructuredData(filteredEntries);
            break;
          default:
            console.error(chalk.red(`Unknown format: ${options.format}`));
            console.log(chalk.blue('Available formats: markdown, json, text, curl, conversation, structured'));
            process.exit(1);
        }
      }

      // Write output
      if (options.output) {
        fs.writeFileSync(options.output, output);
        if (options.verbose) {
          console.log(chalk.green(`Output written to: ${options.output}`));
        }
      } else {
        console.log(output);
      }

      if (options.verbose) {
        console.log(chalk.green(`Successfully processed ${filteredEntries.length} entries`));
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
