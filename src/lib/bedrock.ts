import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Thin Bedrock wrapper. Defaults to an Anthropic Claude model on Bedrock via the
 * Messages API shape. Swap BEDROCK_MODEL_ID in env to change models.
 * All AI features (dispatch copilot, predictive maintenance, assistant) call
 * invokeJson so the rest of the app receives plain typed objects.
 */
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-3-5-sonnet-20241022-v2:0";

type InvokeOptions = {
  system?: string;
  maxTokens?: number;
  temperature?: number;
};

export async function invokeText(
  prompt: string,
  opts: InvokeOptions = {},
): Promise<string> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.2,
    system: opts.system,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const res = await client.send(command);
  const decoded = JSON.parse(new TextDecoder().decode(res.body));
  const text: string = decoded?.content?.[0]?.text ?? "";
  return text;
}

/**
 * Invoke and parse a JSON object. The prompt MUST instruct the model to return
 * only JSON. Strips accidental code fences before parsing.
 */
export async function invokeJson<T>(
  prompt: string,
  opts: InvokeOptions = {},
): Promise<T> {
  const raw = await invokeText(prompt, {
    ...opts,
    system:
      (opts.system ? opts.system + "\n" : "") +
      "Respond with a single valid JSON object only. No prose, no markdown fences.",
  });
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean) as T;
}
