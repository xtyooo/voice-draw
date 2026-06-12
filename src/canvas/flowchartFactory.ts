import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { CreateFlowchartCommand, FlowEdge, FlowNode } from "../command/types";

export async function flowchartToSkeletons(command: CreateFlowchartCommand): Promise<ExcalidrawElementSkeleton[]> {
  const mermaid = command.mermaid ?? buildMermaid(command.nodes ?? [], command.edges ?? []);
  if (!mermaid.trim()) {
    throw new Error("流程图命令缺少 Mermaid 或节点数据");
  }
  const result = await parseMermaidToExcalidraw(mermaid, {
    flowchart: { curve: "linear" },
    themeVariables: { fontSize: "24px" },
    maxTextSize: 4000,
  });
  return result.elements;
}

export function buildMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines = ["flowchart TD"];
  for (const node of nodes) {
    const safeText = escapeMermaidText(node.text);
    if (node.type === "condition") {
      lines.push(`${node.id}{${safeText}}`);
    } else {
      lines.push(`${node.id}[${safeText}]`);
    }
  }
  for (const edge of edges) {
    const label = edge.label ? ` -- ${escapeMermaidText(edge.label)} --> ` : " --> ";
    lines.push(`${edge.from}${label}${edge.to}`);
  }
  return lines.join("\n");
}

function escapeMermaidText(text: string): string {
  return text.replace(/[[\]{}]/g, "");
}
