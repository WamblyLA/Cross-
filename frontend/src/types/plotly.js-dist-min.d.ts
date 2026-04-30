declare module "plotly.js-dist-min" {
  type PlotlyFigureData = ReadonlyArray<Record<string, unknown>>;
  type PlotlyFigureLayout = Record<string, unknown>;
  type PlotlyFigureConfig = Record<string, unknown>;
  type PlotlyFigureFrames = ReadonlyArray<Record<string, unknown>>;

  type PlotlyModule = {
    react: (
      element: HTMLElement,
      data: PlotlyFigureData,
      layout?: PlotlyFigureLayout,
      config?: PlotlyFigureConfig,
    ) => Promise<unknown>;
    addFrames: (element: HTMLElement, frames: PlotlyFigureFrames) => Promise<unknown>;
    purge: (element: HTMLElement) => void;
    Plots: {
      resize: (element: HTMLElement) => Promise<unknown>;
    };
  };

  const Plotly: PlotlyModule;
  export default Plotly;
}
