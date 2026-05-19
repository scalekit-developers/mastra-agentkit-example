/**
 * Mastra agent with Scalekit AgentKit tools.
 *
 * Discovers Gmail tools from Scalekit, wraps them as Mastra tools,
 * and runs a Gmail assistant agent.
 *
 * Run: pnpm start
 */
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { openai } from '@ai-sdk/openai';
import { ScalekitClient } from '@scalekit-sdk/node';
import { z } from 'zod';
import 'dotenv/config';

// --- Configuration -----------------------------------------------------------

const IDENTIFIER = process.env.USER_IDENTIFIER || 'user_123';
const CONNECTION = process.env.CONNECTION_NAME || 'gmail';

// --- Initialize Scalekit -----------------------------------------------------

// Never hard-code credentials — they would be exposed in source control.
// Pull them from environment variables at runtime.
const scalekit = new ScalekitClient(
  process.env.SCALEKIT_ENV_URL!,
  process.env.SCALEKIT_CLIENT_ID!,
  process.env.SCALEKIT_CLIENT_SECRET!,
);

// --- Step 1: Ensure the user has a connected account -------------------------

const { connectedAccount } = await scalekit.actions.getOrCreateConnectedAccount({
  connectionName: CONNECTION,
  identifier: IDENTIFIER,
});

if (connectedAccount?.status?.toString() !== '1') {
  // Status 1 = ACTIVE in the protobuf enum
  const { link } = await scalekit.actions.getAuthorizationLink({
    connectionName: CONNECTION,
    identifier: IDENTIFIER,
  });
  console.log(`\n[${CONNECTION}] Authorization required.`);
  console.log(`Open this link:\n\n  ${link}\n`);
  console.log('Press Enter once you have completed the OAuth flow...');
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

console.log(`Connected account for ${IDENTIFIER} is active.`);

// --- Step 2: Discover tools from Scalekit ------------------------------------

const toolsResponse = await scalekit.tools.listTools({
  filter: { connector: CONNECTION, identifier: IDENTIFIER },
  pageSize: 50,
});

const scalekitTools = toolsResponse.tools;
console.log(`Discovered ${scalekitTools.length} tools: ${scalekitTools.map((t) => (t.definition as any)?.name).join(', ')}`);

// --- Step 3: Convert Scalekit tools to Mastra tools --------------------------

const mastraTools: Record<string, ReturnType<typeof createTool>> = {};

for (const tool of scalekitTools) {
  const def = tool.definition as Record<string, any> | undefined;
  if (!def?.name) continue;

  const toolName: string = def.name;
  const description: string = def.description || toolName;

  // Use a permissive Zod schema — Scalekit validates inputs server-side.
  // For stricter client-side validation, convert def.input_schema to Zod.
  const inputSchema = z.object({}).passthrough();

  mastraTools[toolName] = createTool({
    id: toolName,
    description,
    inputSchema,
    execute: async ({ context }) => {
      const result = await scalekit.tools.executeTool({
        toolName,
        identifier: IDENTIFIER,
        params: context as Record<string, unknown>,
      });
      return result;
    },
  });
}

console.log(`Created ${Object.keys(mastraTools).length} Mastra tools.`);

// --- Step 4: Build the agent -------------------------------------------------

const agent = new Agent({
  name: 'gmail-assistant',
  instructions: `You are a helpful Gmail assistant. You can read, search, and manage emails for the user. Use the available tools to fulfill requests. Always confirm what you did after completing an action.`,
  model: openai('gpt-4o'),
  tools: mastraTools,
});

// --- Step 5: Run the agent ---------------------------------------------------

const prompt = process.argv[2] || 'Fetch my last 5 unread emails and summarize them.';
console.log(`\nPrompt: ${prompt}\n`);

const result = await agent.generate(prompt);
console.log(result.text);
