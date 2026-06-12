import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

type ExcalidrawCanvasProps = {
  onReady: (api: ExcalidrawImperativeAPI) => void;
  onSceneChange: () => void;
};

export function ExcalidrawCanvas({ onReady, onSceneChange }: ExcalidrawCanvasProps) {
  return (
    <Excalidraw
      excalidrawAPI={onReady}
      onChange={onSceneChange}
      viewModeEnabled
      zenModeEnabled
      gridModeEnabled={false}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: false,
          clearCanvas: false,
          export: false,
          loadScene: false,
          saveAsImage: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
        tools: {
          image: false,
        },
      }}
      initialData={{
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 1,
        },
      }}
    />
  );
}
