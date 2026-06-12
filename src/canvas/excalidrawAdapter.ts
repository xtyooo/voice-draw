import {
  convertToExcalidrawElements,
  exportToBlob,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { DrawCommand, ShapeRef, TargetRef } from "../command/types";
import { getColorInfo } from "../utils/colorMap";
import type { VoiceShape } from "../utils/shapeMap";
import { createArrowSkeleton, createShapeSkeleton } from "./elementFactory";
import { flowchartToSkeletons } from "./flowchartFactory";
import type { SceneMemory } from "../memory/sceneMemory";
import { createShapeRef } from "../memory/sceneMemory";

type AdapterResult = {
  feedback: string;
  changed: boolean;
};

type Snapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export class ExcalidrawAdapter {
  private api: ExcalidrawImperativeAPI;
  private memory: SceneMemory;
  private history: Snapshot[] = [];
  private future: Snapshot[] = [];

  constructor(api: ExcalidrawImperativeAPI, memory: SceneMemory) {
    this.api = api;
    this.memory = memory;
  }

  async execute(command: DrawCommand): Promise<AdapterResult> {
    if (command.intent === "undo") {
      return this.undo();
    }
    if (command.intent === "redo") {
      return this.redo();
    }
    if (command.intent === "clear_canvas") {
      this.capture();
      this.api.updateScene({ elements: [], appState: { selectedElementIds: {} } });
      this.memory.clear();
      this.toast("画布已清空");
      return { feedback: "画布已清空", changed: true };
    }
    if (command.intent === "export_image") {
      await this.exportPng();
      return { feedback: "已导出 PNG 图片", changed: false };
    }

    this.capture();

    if (command.intent === "create_shape") {
      const skeleton = createShapeSkeleton(command, this.canvasSize());
      const [element] = convertToExcalidrawElements([skeleton], { regenerateIds: true });
      const color = command.style?.color;
      const next = [
        ...this.elements(),
        withVoiceData(element, {
          voiceShape: command.shape,
          voiceColor: color,
          voiceText: command.text,
        }),
      ];
      this.api.updateScene({ elements: next, appState: { selectedElementIds: { [element.id]: true } } });
      this.memory.trackCreated(
        createShapeRef({
          id: element.id,
          shape: command.shape,
          text: command.text,
          color,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        }),
      );
      this.toast("已添加图形");
      return { feedback: "已添加图形", changed: true };
    }

    if (command.intent === "select_shape") {
      const target = this.resolveOne(command.target);
      this.api.updateScene({ appState: { selectedElementIds: { [target.id]: true } } });
      this.memory.select(target.id);
      this.toast("已选中对象");
      return { feedback: "已选中对象", changed: false };
    }

    if (command.intent === "update_shape") {
      const target = this.resolveOne(command.target);
      const next = this.elements().map((element) => {
        if (element.id !== target.id) return element;
        const scale = command.changes.scale ?? 1;
        const colorInfo = command.changes.color ? getColorInfo(command.changes.color) : undefined;
        return withVoiceData(
          {
            ...element,
            width: Math.max(20, element.width * scale),
            height: Math.max(20, element.height * scale),
            backgroundColor: command.changes.backgroundColor ?? colorInfo?.backgroundColor ?? element.backgroundColor,
            strokeColor: command.changes.strokeColor ?? colorInfo?.strokeColor ?? element.strokeColor,
            text: command.changes.text ?? ("text" in element ? element.text : undefined),
          } as ExcalidrawElement,
          {
            voiceColor: command.changes.color ?? target.color,
            voiceShape: target.shape,
            voiceText: command.changes.text ?? target.text,
          },
        );
      });
      this.api.updateScene({ elements: next, appState: { selectedElementIds: { [target.id]: true } } });
      this.memory.syncFromElements(next);
      this.memory.select(target.id);
      this.toast("已更新对象");
      return { feedback: "已更新对象", changed: true };
    }

    if (command.intent === "move_shape") {
      const target = this.resolveOne(command.target);
      const next = this.elements().map((element) => {
        if (element.id !== target.id) return element;
        const distance = command.distance ?? 100;
        const absolute = command.position ? this.positionFor(command.position, element.width, element.height) : undefined;
        return {
          ...element,
          x: absolute?.x ?? element.x + (command.direction === "right" ? distance : command.direction === "left" ? -distance : 0),
          y: absolute?.y ?? element.y + (command.direction === "down" ? distance : command.direction === "up" ? -distance : 0),
        } as ExcalidrawElement;
      });
      this.api.updateScene({ elements: next, appState: { selectedElementIds: { [target.id]: true } } });
      this.memory.syncFromElements(next);
      this.memory.select(target.id);
      this.toast("已移动对象");
      return { feedback: "已移动对象", changed: true };
    }

    if (command.intent === "delete_shape") {
      const target = this.resolveOne(command.target);
      const next = this.elements().filter((element) => element.id !== target.id);
      this.api.updateScene({ elements: next, appState: { selectedElementIds: {} } });
      this.memory.markDeleted([target.id]);
      this.toast("已删除对象");
      return { feedback: "已删除对象", changed: true };
    }

    if (command.intent === "connect") {
      const from = this.resolveOne(command.from);
      const to = this.resolveOne(command.to);
      const [element] = convertToExcalidrawElements([createArrowSkeleton(from, to, command.label)], { regenerateIds: true });
      const next = [
        ...this.elements(),
        withVoiceData(element, {
          voiceShape: "arrow",
          voiceText: command.label,
        }),
      ];
      this.api.updateScene({ elements: next, appState: { selectedElementIds: { [element.id]: true } } });
      this.memory.trackCreated(
        createShapeRef({
          id: element.id,
          shape: "arrow",
          text: command.label,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        }),
      );
      this.toast("已添加箭头");
      return { feedback: "已添加箭头", changed: true };
    }

    if (command.intent === "create_flowchart") {
      const skeletons = await flowchartToSkeletons(command);
      const offset = this.nextFlowOffset();
      const elements = convertToExcalidrawElements(skeletons, { regenerateIds: true }).map((element) =>
        withVoiceData(
          {
            ...element,
            x: element.x + offset.x,
            y: element.y + offset.y,
          },
          {
            voiceShape: mapExcalidrawType(element.type),
            voiceText: "text" in element ? element.text : undefined,
          },
        ),
      );
      const next = [...this.elements(), ...elements];
      this.api.updateScene({ elements: next });
      this.memory.syncFromElements(next);
      this.toast("已生成流程图");
      return { feedback: "已生成流程图", changed: true };
    }

    return { feedback: "命令尚未支持", changed: false };
  }

  syncMemory() {
    this.memory.syncFromElements(this.elements());
  }

  private capture() {
    this.history.push({
      elements: this.elements(),
      appState: this.api.getAppState(),
      files: this.api.getFiles(),
    });
    if (this.history.length > 30) {
      this.history.shift();
    }
    this.future = [];
  }

  private undo(): AdapterResult {
    const previous = this.history.pop();
    if (!previous) {
      return { feedback: "没有可撤销的操作", changed: false };
    }
    this.future.push({ elements: this.elements(), appState: this.api.getAppState(), files: this.api.getFiles() });
    this.api.updateScene({ elements: previous.elements, appState: previous.appState });
    this.memory.syncFromElements(previous.elements);
    this.toast("已撤销上一步");
    return { feedback: "已撤销上一步", changed: true };
  }

  private redo(): AdapterResult {
    const next = this.future.pop();
    if (!next) {
      return { feedback: "没有可重做的操作", changed: false };
    }
    this.history.push({ elements: this.elements(), appState: this.api.getAppState(), files: this.api.getFiles() });
    this.api.updateScene({ elements: next.elements, appState: next.appState });
    this.memory.syncFromElements(next.elements);
    this.toast("已重做");
    return { feedback: "已重做", changed: true };
  }

  private async exportPng() {
    const blob = await exportToBlob({
      elements: this.elements(),
      appState: {
        ...this.api.getAppState(),
        exportBackground: true,
        viewBackgroundColor: "#ffffff",
      },
      files: this.api.getFiles(),
      mimeType: "image/png",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `voicedraw-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast("PNG 已开始下载");
  }

  private elements(): readonly ExcalidrawElement[] {
    return this.api.getSceneElements() as readonly ExcalidrawElement[];
  }

  private resolveOne(target: TargetRef): ShapeRef {
    const result = this.memory.resolve(target);
    if (result.kind === "found") {
      return result.ref;
    }
    throw new Error(result.kind === "missing" ? result.reason : "目标仍存在歧义");
  }

  private canvasSize() {
    const state = this.api.getAppState();
    return {
      width: Math.max(900, state.width || 1200),
      height: Math.max(600, state.height || 800),
    };
  }

  private positionFor(position: "center" | "left" | "right" | "top" | "bottom", width: number, height: number) {
    const canvas = this.canvasSize();
    const margin = 140;
    if (position === "left") return { x: margin, y: canvas.height / 2 - height / 2 };
    if (position === "right") return { x: canvas.width - width - margin, y: canvas.height / 2 - height / 2 };
    if (position === "top") return { x: canvas.width / 2 - width / 2, y: margin };
    if (position === "bottom") return { x: canvas.width / 2 - width / 2, y: canvas.height - height - margin };
    return { x: canvas.width / 2 - width / 2, y: canvas.height / 2 - height / 2 };
  }

  private nextFlowOffset() {
    const count = this.elements().length;
    return {
      x: 80 + (count % 3) * 40,
      y: 80 + (count % 2) * 40,
    };
  }

  private toast(message: string) {
    this.api.setToast({ message, duration: 2200 });
  }
}

function withVoiceData<T extends ExcalidrawElement>(
  element: T,
  customData: {
    voiceShape?: VoiceShape;
    voiceColor?: string;
    voiceText?: string;
  },
): T {
  return {
    ...element,
    customData: {
      ...(element.customData ?? {}),
      ...customData,
      voiceDraw: true,
    },
  };
}

function mapExcalidrawType(type: string): VoiceShape | undefined {
  if (type === "rectangle") return "rectangle";
  if (type === "ellipse") return "ellipse";
  if (type === "diamond") return "diamond";
  if (type === "arrow") return "arrow";
  if (type === "text") return "text";
  return undefined;
}
