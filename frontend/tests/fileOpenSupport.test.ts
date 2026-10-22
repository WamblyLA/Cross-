import { describe, expect, it } from "bun:test";
import {
  isEditorOpenSupported,
  isRealtimeSupportedCloudFileName,
} from "../src/features/files/fileOpenSupport";

describe("file support policy", () => {
  it("keeps text and extensionless files editable and realtime-capable", () => {
    for (const fileName of ["main.ts", "Dockerfile"]) {
      expect(isEditorOpenSupported(fileName)).toBe(true);
      expect(isRealtimeSupportedCloudFileName(fileName)).toBe(true);
    }
  });

  it("rejects binary files for both editor and realtime", () => {
    for (const fileName of ["photo.PNG", "archive.zip"]) {
      expect(isEditorOpenSupported(fileName)).toBe(false);
      expect(isRealtimeSupportedCloudFileName(fileName)).toBe(false);
    }
  });

  it("allows notebooks in the notebook editor but not in text realtime", () => {
    expect(isEditorOpenSupported("analysis.ipynb")).toBe(true);
    expect(isRealtimeSupportedCloudFileName("analysis.ipynb")).toBe(false);
  });
});
